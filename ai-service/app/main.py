"""Main FastAPI application for ScamGuard AI Service."""
import logging
import time
import io
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from app.config import settings
from app.models import (
    HealthResponse, ServiceInfo, PredictRequest, PredictResponse,
    ExtractTextResponse
)
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


@app.post("/extract-text", response_model=ExtractTextResponse)
async def extract_text_from_image(file: UploadFile = File(...)):
    """
    Extract text from an uploaded image using OCR.
    
    Args:
        file: Uploaded image file (PNG, JPG, JPEG)
        
    Returns:
        ExtractTextResponse with extracted text and metadata
        
    Raises:
        HTTPException: If file validation fails or OCR extraction fails
    """
    start_time = time.time()
    
    # Validate file type
    valid_mime_types = ["image/png", "image/jpeg", "image/jpg"]
    if file.content_type not in valid_mime_types:
        logger.warning(f"Invalid file type: {file.content_type}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Accepted types: {', '.join(valid_mime_types)}"
        )
    
    # Read file content
    try:
        file_content = await file.read()
    except Exception as e:
        logger.error(f"Failed to read uploaded file: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail="Failed to read uploaded file"
        )
    
    # Validate file size
    file_size = len(file_content)
    if file_size > settings.max_image_size_bytes:
        size_mb = file_size / (1024 * 1024)
        logger.warning(f"File too large: {size_mb:.2f}MB (limit: {settings.max_image_size_mb}MB)")
        raise HTTPException(
            status_code=413,
            detail=f"File size exceeds limit of {settings.max_image_size_mb}MB"
        )
    
    # Check if OCR is available
    if not ocr_engine.is_available:
        logger.error("OCR extraction requested but OCR engine is not available")
        raise HTTPException(
            status_code=503,
            detail="OCR engine is not available. Please try again later."
        )
    
    # Load image
    try:
        image = Image.open(io.BytesIO(file_content))
    except Exception as e:
        logger.error(f"Failed to load image: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail="Invalid image file or corrupted data"
        )
    
    # Extract text using OCR
    try:
        extracted_text = ocr_engine.extract_text(image)
        processing_time = (time.time() - start_time) * 1000  # Convert to ms
        
        return ExtractTextResponse(
            extracted_text=extracted_text,
            character_count=len(extracted_text),
            processing_time_ms=processing_time,
            ocr_available=True
        )
        
    except Exception as e:
        logger.error(f"OCR extraction failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Text extraction failed: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.python_env == "development"
    )
