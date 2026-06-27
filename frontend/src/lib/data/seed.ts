// seed.ts — retained only for backwards-compat re-exports.
// All data is now loaded by backend/scripts/clean_load.py into Supabase.
// Analytics data is fetched via FastAPI endpoints, not from this file.
export {
  STATE_CITY_MAPPING,
  CITY_PINCODES,
  FLAVOUR_LINE_MAPPING,
  SKUS,
  RAW_CITY_DATA,
} from './constants';
export type { RawCityData } from './constants';
