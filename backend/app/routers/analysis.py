from fastapi import APIRouter, Depends

from app.core.security import verify_supabase_token
from app.db.supabase import get_service_client
from app.schemas.analysis import AnalysisResponse, HotCityItem
from app.services import hot_cities, metrics

router = APIRouter()


@router.get('/analysis', response_model=AnalysisResponse)
def get_analysis(
    state: str = '',
    city: str = '',
    pincode: str = '',
    platform: str = '',
    flavour: str = '',
    _user: dict = Depends(verify_supabase_token),
):
    """
    Returns unified analytics for the given filter scope.
    Aggregates pods_sales, sku_sales, sales_spends, and survey_responses.
    """
    db = get_service_client()
    return metrics.aggregate_analysis(
        db, state=state, city=city, pincode=pincode, platform=platform, flavour=flavour
    )


@router.get('/hot-cities', response_model=list[HotCityItem])
def get_hot_cities(_user: dict = Depends(verify_supabase_token)):
    """
    Returns the top cities ranked by urgency (skip rate + sales decline).
    Used on the Dashboard home page hot-cities strip.
    """
    db = get_service_client()
    return hot_cities.compute_hot_cities(db)
