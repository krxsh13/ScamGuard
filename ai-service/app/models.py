"""Data models for API requests and responses."""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, List
from datetime import datetime


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str
    service: str
    version: str
    model_version: str
    model_loaded: bool
    ocr_available: bool


class ServiceInfo(BaseModel):
    """Service information response model."""
    service: str
    version: str
    model_version: str
    description: str
    endpoints: list[str]


class PredictRequest(BaseModel):
    """Request model for scam prediction."""
    text: str = Field(..., min_length=1, max_length=10000, description="Text content to analyze for scam indicators")
    
    @field_validator('text')
    @classmethod
    def text_not_empty(cls, v: str) -> str:
        """Validate that text is not empty or only whitespace."""
        if not v or not v.strip():
            raise ValueError("Text cannot be empty or only whitespace")
        return v


class LinguisticCues(BaseModel):
    """Linguistic cues detected in the text."""
    urgency: float = Field(..., ge=0.0, le=1.0, description="Urgency score (0-1)")
    financial_pressure: float = Field(..., ge=0.0, le=1.0, description="Financial pressure score (0-1)")
    emotional_manipulation: float = Field(..., ge=0.0, le=1.0, description="Emotional manipulation score (0-1)")


class PredictResponse(BaseModel):
    """Response model for scam prediction."""
    risk_score: int = Field(..., ge=0, le=100, description="Risk score from 0 to 100")
    risk_level: str = Field(..., description="Risk level: low, medium, or high")
    confidence: float = Field(..., ge=0.0, le=100.0, description="Confidence level as percentage (0-100)")
    is_scam: bool = Field(..., description="Whether the text is classified as a scam")
    detected_patterns: list[str] = Field(default_factory=list, description="List of detected scam patterns")
    linguistic_cues: LinguisticCues = Field(..., description="Linguistic cues detected in the text")
    low_confidence_warning: Optional[str] = Field(None, description="Warning message if confidence is low")
    processing_time_ms: float = Field(..., description="Processing time in milliseconds")
    model_version: str = Field(..., description="Version of the model that produced this prediction")



class ExtractTextResponse(BaseModel):
    """Response model for OCR text extraction."""
    extracted_text: str = Field(..., description="Text extracted from the image")
    character_count: int = Field(..., description="Number of characters extracted")
    processing_time_ms: float = Field(..., description="Processing time in milliseconds")
    preprocessing_applied: bool = Field(..., description="Whether image preprocessing was applied")
    ocr_available: bool = Field(..., description="Whether OCR engine was available")


class ThreatIntelResult(BaseModel):
    """Response model for threat intelligence check result."""
    is_malicious: bool = Field(..., description="Whether the URL was detected as malicious")
    threat_types: list[str] = Field(default_factory=list, description="Types of threats detected")
    source: str = Field(..., description="Source of the threat intelligence check")
    checked_at: datetime = Field(..., description="Timestamp when the check was performed")


class URLHeuristics(BaseModel):
    """URL heuristics analysis results."""
    suspicious_tld: bool = Field(..., description="Whether URL has a suspicious TLD")
    ip_host: bool = Field(..., description="Whether URL uses IP address as hostname")
    encoded_chars: bool = Field(..., description="Whether URL contains encoded characters")
    homoglyphs_detected: bool = Field(..., description="Whether homoglyph characters detected")
    subdomain_depth: int = Field(..., ge=0, description="Depth of subdomains (nesting level)")
    url_length_suspicious: bool = Field(..., description="Whether URL length is suspicious (>100)")


class AnalyzeURLResponse(BaseModel):
    """Response model for URL analysis."""
    url: str = Field(..., description="The URL that was analyzed")
    risk_score: int = Field(..., ge=0, le=100, description="Risk score from 0 to 100")
    risk_level: str = Field(..., description="Risk level: low, medium, or high")
    confidence: float = Field(..., ge=0.0, le=100.0, description="Confidence level as percentage (0-100)")
    is_scam: bool = Field(..., description="Whether the URL is classified as scam")
    detected_patterns: list[str] = Field(default_factory=list, description="List of detected scam patterns")
    linguistic_cues: LinguisticCues = Field(..., description="Linguistic cues detected in URL text")
    url_heuristics: URLHeuristics = Field(..., description="URL-specific heuristic analysis")
    processing_time_ms: float = Field(..., description="Processing time in milliseconds")
    model_version: str = Field(..., description="Version of the model that produced this prediction")
