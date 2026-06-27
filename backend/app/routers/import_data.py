import re

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import verify_supabase_token
from app.db.supabase import get_service_client
from app.schemas.import_schemas import DataType, ImportRequest, ImportResponse

router = APIRouter()

TABLE_MAP: dict[str, str] = {
    'sku_sales': 'sku_sales',
    'pods_sales': 'pods_sales',
    'sales_spends': 'sales_spends',
    'survey_responses': 'survey_responses',
    'decisions': 'decisions',
}

UPSERT_CONFLICTS: dict[str, str | None] = {
    'sku_sales': None,
    'pods_sales': 'city, platform, month',
    'sales_spends': 'date, platform',
    'survey_responses': 'id',
    'decisions': 'scope_hash',
}

BATCH_SIZE = 200


def _camel_to_snake(name: str) -> str:
    """Convert camelCase key to snake_case (for frontend→DB field mapping)."""
    s1 = re.sub(r'(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', s1).lower()


def _normalize_row(row: dict) -> dict:
    """Convert a camelCase dict from the frontend to snake_case for Postgres."""
    return {_camel_to_snake(k): v for k, v in row.items()}


@router.post('/import/{data_type}', response_model=ImportResponse)
def import_data(
    data_type: DataType,
    body: ImportRequest,
    _user: dict = Depends(verify_supabase_token),
):
    """
    Upserts a batch of rows into the specified table.
    Expects camelCase keys from the frontend — converts to snake_case before insert.
    """
    if not body.data:
        return ImportResponse(type=data_type, rowsInserted=0)

    db = get_service_client()
    table = TABLE_MAP[data_type]
    conflict = UPSERT_CONFLICTS[data_type]

    snake_rows = [_normalize_row(r) for r in body.data]

    total_inserted = 0
    errors: list[str] = []

    for start in range(0, len(snake_rows), BATCH_SIZE):
        batch = snake_rows[start:start + BATCH_SIZE]
        try:
            if conflict:
                result = db.table(table).upsert(batch, on_conflict=conflict).execute()
            else:
                result = db.table(table).insert(batch).execute()
            total_inserted += len(result.data or batch)
        except Exception as exc:
            errors.append(f'Batch {start}–{start+len(batch)}: {exc}')

    return ImportResponse(type=data_type, rowsInserted=total_inserted, errors=errors)


@router.delete('/import/{data_type}')
def clear_data(
    data_type: DataType,
    _user: dict = Depends(verify_supabase_token),
):
    """
    Deletes all rows from the specified table.
    WARNING: This wipes all data — use only during dev reloads or after re-running clean_load.py.
    """
    db = get_service_client()
    table = TABLE_MAP[data_type]
    try:
        db.table(table).delete().neq('id', '').execute()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return {'cleared': data_type, 'table': table}
