"""OCR functionality using Tesseract."""
import logging
import pytesseract
from PIL import Image
from app.config import settings

logger = logging.getLogger(__name__)


class OCREngine:
    """Manages OCR text extraction from images."""
    
    def __init__(self):
        self._available = False
        self._check_availability()
    
    def _check_availability(self):
        """Check if Tesseract is available."""
        try:
            # Try to get Tesseract version
            pytesseract.get_tesseract_version()
            self._available = True
            logger.info("Tesseract OCR is available")
        except Exception as e:
            logger.warning(f"Tesseract OCR not available: {str(e)}")
            self._available = False
    
    @property
    def is_available(self) -> bool:
        """Check if OCR is available."""
        return self._available
    
    def extract_text(self, image: Image.Image) -> str:
        """
        Extract text from an image using OCR.
        
        Args:
            image: PIL Image object
            
        Returns:
            Extracted text as string
        """
        if not self.is_available:
            raise RuntimeError("OCR engine not available")
        
        try:
            # Extract text using Tesseract
            text = pytesseract.image_to_string(
                image,
                lang=settings.ocr_language
            )
            
            # Clean up the text
            text = text.strip()
            
            logger.info(f"Extracted {len(text)} characters from image")
            return text
            
        except Exception as e:
            logger.error(f"OCR extraction failed: {str(e)}")
            raise


# Global OCR engine instance
ocr_engine = OCREngine()
