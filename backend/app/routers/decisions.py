from fastapi import APIRouter, Depends, HTTPException

from app.core.security import verify_supabase_token
from app.db.supabase import get_service_client
from app.schemas.decisions import DecisionResponse
from app.services import engine

router = APIRouter()


@router.get('/decisions', response_model=list[DecisionResponse])
def get_decisions(
    city: str = '',
    state: str = '',
    platform: str = '',
    flavour: str = '',
    _user: dict = Depends(verify_supabase_token),
):
    """
    Runs the decisions engine for the given scope.
    Results are cached by scope_hash for 24 hours — cached calls return instantly.
    """
    db = get_service_client()
    return engine.generate_decisions(db, city=city, state=state, platform=platform, flavour=flavour)


@router.get('/decisions/{decision_id}', response_model=DecisionResponse)
def get_decision_by_id(
    decision_id: str,
    _user: dict = Depends(verify_supabase_token),
):
    """Returns a single decision by its ID."""
    db = get_service_client()
    result = db.table('decisions').select('*').eq('id', decision_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail=f'Decision {decision_id} not found')
    return DecisionResponse(**result.data[0])
