"""Machine learning model management."""
import logging
import re
import time
import hashlib
import json
from typing import Dict, List, Tuple, Optional
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
from app.config import settings

# Try to import redis, but don't fail if not available
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

logger = logging.getLogger(__name__)


# Scam pattern keywords for linguistic cue detection
URGENCY_KEYWORDS = [
    "urgent", "immediately", "now", "hurry", "quick", "asap", "expire", "expires",
    "limited time", "act now", "don't wait", "last chance", "final notice",
    "time sensitive", "deadline", "today only", "right now", "instant"
]

FINANCIAL_KEYWORDS = [
    "money", "cash", "payment", "bank", "account", "credit card", "wire transfer",
    "paypal", "venmo", "bitcoin", "cryptocurrency", "refund", "prize", "lottery",
    "inheritance", "million", "thousand", "dollars", "pounds", "euros", "invest",
    "profit", "earn", "free money", "claim", "reward", "bonus", "tax", "irs",
    "debt", "owed", "pay now", "transfer funds", "verify account", "suspended account"
]

EMOTIONAL_KEYWORDS = [
    "congratulations", "winner", "lucky", "selected", "chosen", "exclusive",
    "special offer", "amazing", "incredible", "unbelievable", "guaranteed",
    "risk-free", "no obligation", "trust me", "believe me", "promise",
    "worried", "concerned", "problem", "issue", "suspended", "locked",
    "unauthorized", "suspicious activity", "security alert", "verify identity",
    "confirm", "validate", "loved one", "family", "emergency", "help",
    "click here", "click link", "open attachment"
]


class MLModel:
    """Manages the DistilBERT model for scam detection."""
    
    def __init__(self):
        self.tokenizer = None
        self.model = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self._loaded = False
        self.redis_client: Optional[redis.Redis] = None
        
        # Initialize Redis if available and enabled
        if REDIS_AVAILABLE and settings.cache_predictions:
            try:
                self.redis_client = redis.from_url(settings.redis_url)
                self.redis_client.ping()
                logger.info(f"Connected to Redis: {settings.redis_url}")
            except Exception as e:
                logger.warning(f"Failed to connect to Redis: {str(e)}")
                self.redis_client = None
    
    def load(self):
        """Load the DistilBERT model and tokenizer."""
        try:
            logger.info(f"Loading model: {settings.model_path}")
            logger.info(f"Using device: {self.device}")
            
            # Load tokenizer and model
            self.tokenizer = AutoTokenizer.from_pretrained(settings.model_path)
            self.model = AutoModelForSequenceClassification.from_pretrained(
                settings.model_path,
                num_labels=2  # Binary classification: scam or not
            )
            
            # Move model to appropriate device
            self.model.to(self.device)
            self.model.eval()  # Set to evaluation mode
            
            self._loaded = True
            logger.info("Model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
            raise
    
    @property
    def is_loaded(self) -> bool:
        """Check if model is loaded."""
        return self._loaded
    
    def _get_cache_key(self, text: str) -> str:
        """
        Generate a cache key for the given text.
        Uses SHA256 hash of first 512 characters.
        """
        truncated = text[:512]
        hash_value = hashlib.sha256(truncated.encode()).hexdigest()
        return f"pred:{hash_value}"
    
    def _get_cached_result(self, cache_key: str) -> Optional[Dict]:
        """
        Retrieve cached prediction result from Redis.
        Returns None if not found or Redis not available.
        """
        if not self.redis_client:
            return None
        
        try:
            cached = self.redis_client.get(cache_key)
            if cached:
                result = json.loads(cached)
                logger.debug(f"Cache hit for key {cache_key}")
                return result
        except Exception as e:
            logger.warning(f"Failed to get cache: {str(e)}")
        
        return None
    
    def _set_cached_result(self, cache_key: str, result: Dict, ttl_seconds: int = 86400) -> None:
        """
        Store prediction result in Redis with TTL (default 24 hours).
        """
        if not self.redis_client:
            return
        
        try:
            self.redis_client.setex(cache_key, ttl_seconds, json.dumps(result))
            logger.debug(f"Cached result for key {cache_key}")
        except Exception as e:
            logger.warning(f"Failed to cache result: {str(e)}")
    
    def preprocess_text(self, text: str) -> str:
        """
        Preprocess text for model input.
        
        Args:
            text: Raw input text
            
        Returns:
            Preprocessed text
        """
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Strip leading/trailing whitespace
        text = text.strip()
        
        # Limit length (will be truncated by tokenizer anyway)
        if len(text) > 5000:
            text = text[:5000]
        
        return text
    
    def extract_linguistic_cues(self, text: str) -> Dict[str, float]:
        """
        Extract linguistic cues from text.
        
        Args:
            text: Input text to analyze
            
        Returns:
            Dictionary with urgency, financial_pressure, and emotional_manipulation scores
        """
        text_lower = text.lower()
        
        # Count keyword matches
        urgency_count = sum(1 for keyword in URGENCY_KEYWORDS if keyword in text_lower)
        financial_count = sum(1 for keyword in FINANCIAL_KEYWORDS if keyword in text_lower)
        emotional_count = sum(1 for keyword in EMOTIONAL_KEYWORDS if keyword in text_lower)
        
        # Normalize scores (cap at 1.0)
        # More keywords = higher score, but with diminishing returns
        urgency_score = min(1.0, urgency_count * 0.2)
        financial_score = min(1.0, financial_count * 0.15)
        emotional_score = min(1.0, emotional_count * 0.15)
        
        return {
            "urgency": round(urgency_score, 2),
            "financial_pressure": round(financial_score, 2),
            "emotional_manipulation": round(emotional_score, 2)
        }
    
    def detect_patterns(self, text: str, linguistic_cues: Dict[str, float]) -> List[str]:
        """
        Detect specific scam patterns in text.
        
        Args:
            text: Input text
            linguistic_cues: Extracted linguistic cues
            
        Returns:
            List of detected pattern descriptions
        """
        patterns = []
        text_lower = text.lower()
        
        # Check for urgency patterns
        if linguistic_cues["urgency"] > 0.3:
            patterns.append("Urgency tactics detected")
        
        # Check for financial patterns
        if linguistic_cues["financial_pressure"] > 0.3:
            patterns.append("Financial pressure detected")
        
        # Check for emotional manipulation
        if linguistic_cues["emotional_manipulation"] > 0.3:
            patterns.append("Emotional manipulation detected")
        
        # Check for specific patterns
        if any(word in text_lower for word in ["verify account", "suspended account", "confirm identity"]):
            patterns.append("Account verification request")
        
        if any(word in text_lower for word in ["prize", "lottery", "winner", "congratulations"]):
            patterns.append("Prize/lottery scam indicators")
        
        if any(word in text_lower for word in ["click here", "click link", "open attachment"]):
            patterns.append("Suspicious link/attachment request")
        
        if re.search(r'\b(password|pin|ssn|social security)\b', text_lower):
            patterns.append("Sensitive information request")
        
        return patterns
    
    def calculate_risk_score(self, scam_probability: float, linguistic_cues: Dict[str, float]) -> int:
        """
        Calculate risk score from 0-100.
        
        Args:
            scam_probability: Model's scam probability (0-1)
            linguistic_cues: Extracted linguistic cues
            
        Returns:
            Risk score from 0 to 100
        """
        # Base score from model prediction (0-70 points)
        base_score = scam_probability * 70
        
        # Additional points from linguistic cues (up to 30 points)
        cue_score = (
            linguistic_cues["urgency"] * 10 +
            linguistic_cues["financial_pressure"] * 10 +
            linguistic_cues["emotional_manipulation"] * 10
        )
        
        # Combine scores
        total_score = base_score + cue_score
        
        # Ensure within bounds and return as integer
        return min(100, max(0, int(round(total_score))))
    
    def get_risk_level(self, risk_score: int) -> str:
        """
        Determine risk level from risk score.
        
        Args:
            risk_score: Risk score (0-100)
            
        Returns:
            Risk level: 'low', 'medium', or 'high'
        """
        if risk_score < 30:
            return "low"
        elif risk_score < 70:
            return "medium"
        else:
            return "high"
    
    def predict(self, text: str) -> Dict:
        """
        Predict if text is a scam with detailed analysis.
        Uses Redis caching to improve performance for duplicate predictions.
        
        Args:
            text: Input text to analyze
            
        Returns:
            Dictionary with comprehensive prediction results
        """
        if not self.is_loaded:
            raise RuntimeError("Model not loaded")
        
        start_time = time.time()
        
        # Preprocess text first for consistent cache key generation
        processed_text = self.preprocess_text(text)
        cache_key = self._get_cache_key(processed_text)
        
        # Check cache first
        cached_result = self._get_cached_result(cache_key)
        if cached_result is not None:
            # Add cache hit indicator to the result
            cached_result["cache_hit"] = True
            return cached_result
        
        # Extract linguistic cues
        linguistic_cues = self.extract_linguistic_cues(processed_text)
        
        # Tokenize input
        inputs = self.tokenizer(
            processed_text,
            return_tensors="pt",
            truncation=True,
            max_length=512,
            padding=True
        )
        
        # Move inputs to device
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        # Get prediction
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probabilities = torch.softmax(logits, dim=1)
        
        # Extract results
        scam_probability = probabilities[0][1].item()
        is_scam = scam_probability > 0.5
        
        # Calculate confidence (how sure the model is about its prediction)
        confidence = max(probabilities[0][0].item(), probabilities[0][1].item())
        confidence_percentage = confidence * 100
        
        # Calculate risk score
        risk_score = self.calculate_risk_score(scam_probability, linguistic_cues)
        
        # Get risk level
        risk_level = self.get_risk_level(risk_score)
        
        # Detect patterns
        detected_patterns = self.detect_patterns(processed_text, linguistic_cues)
        
        # Low confidence warning
        low_confidence_warning = None
        if confidence_percentage < 70:
            low_confidence_warning = (
                "The AI model has low confidence in this prediction. "
                "Please manually verify the content and consider additional factors."
            )
        
        # Calculate processing time
        processing_time_ms = (time.time() - start_time) * 1000
        
        result = {
            "risk_score": risk_score,
            "risk_level": risk_level,
            "confidence": round(confidence_percentage, 2),
            "is_scam": is_scam,
            "detected_patterns": detected_patterns,
            "linguistic_cues": linguistic_cues,
            "low_confidence_warning": low_confidence_warning,
            "processing_time_ms": round(processing_time_ms, 2),
            "cache_hit": False
        }
        
        # Cache the result for future requests
        self._set_cached_result(cache_key, result)
        
        return result


# Global model instance
ml_model = MLModel()
