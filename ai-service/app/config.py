"""Configuration management for the AI service."""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    python_env: str = "development"
    port: int = 8000
    model_path: str = "distilbert-base-uncased"
    ocr_language: str = "eng"
    max_image_size_mb: int = 5
    cache_predictions: bool = False
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    @property
    def max_image_size_bytes(self) -> int:
        """Convert max image size from MB to bytes."""
        return self.max_image_size_mb * 1024 * 1024
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()
