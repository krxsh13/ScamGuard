"""Main FastAPI application for ScamGuard AI Service."""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.models import HealthResponse, ServiceInfo, PredictRequest, PredictResponse
from app.ml_model import ml_model
from app.ocr import ocr_engine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    Loads the ML model on startup.
    """
    logger.info("Starting AI Service...")
    
    # Load ML model on startup
    try:
        ml_model.load()
        logger.info("ML model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load ML model: {str(e)}")
        # Continue anyway - health check will show model not loaded
    
    yield
    
    # Cleanup on shutdown
    logger.info("Shutting down AI Service...")


# Create FastAPI app
app = FastAPI(
    title="ScamGuard AI Service",
    description="AI-powered scam detection using DistilBERT and OCR",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_model=ServiceInfo)
async def root():
    """Root endpoint with service information."""
    return ServiceInfo(
        service="ScamGuard AI Service",
        version="1.0.0",
        description="AI-powered scam detection using DistilBERT and OCR",
        endpoints=[
            "/health",
            "/predict",
            "/extract-text",
            "/docs"
        ]
    )


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.
    Returns service status and availability of ML model and OCR.
    """
    return HealthResponse(
        status="healthy",
        service="ScamGuard AI Service",
        version="1.0.0",
        model_loaded=ml_model.is_loaded,
        ocr_available=ocr_engine.is_available
    )


@app.post("/predict", response_model=PredictResponse)
async def predict_scam(request: PredictRequest):
    """
    Analyze text content for scam indicators.
    
    Args:
        request: PredictRequest containing text to analyze
        
    Returns:
        PredictResponse with risk score, confidence, and detected patterns
        
    Raises:
        HTTPException: If model is not loaded or prediction fails
    """
    # Check if model is loaded
    if not ml_model.is_loaded:
        logger.error("Prediction requested but model is not loaded")
        raise HTTPException(
            status_code=503,
            detail="AI model is not available. Please try again later."
        )
    
    try:
        # Get prediction from model
        result = ml_model.predict(request.text)
        
        # Return response
        return PredictResponse(**result)
        
    except Exception as e:
        logger.error(f"Prediction failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.python_env == "development"
    )
