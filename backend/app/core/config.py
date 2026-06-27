from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    # Supabase
    supabase_url: str = ''
    supabase_anon_key: str = ''
    supabase_service_role_key: str = ''

    # Anthropic
    anthropic_api_key: str = ''

    # CORS — comma-separated list of allowed origins
    allowed_origins: str = 'http://localhost:5173,http://localhost:3000'

    # Decisions engine thresholds (all tunable without code changes)
    decisions_cache_ttl_hours: int = 24
    a2s_threshold: float = 0.45          # A2S ratio above which spend leak is triggered
    a2s_consecutive_days: int = 3        # consecutive days of high A2S to trigger spend decision
    skip_rate_threshold: float = 0.30    # % of survey respondents who skipped due to unavailability
    low_sales_mrp_threshold: float = 5000.0  # monthly MRP below which a market is considered weak
    min_survey_sample: int = 5           # cities with fewer respondents get 'monitor' classification

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(',') if o.strip()]


settings = Settings()
