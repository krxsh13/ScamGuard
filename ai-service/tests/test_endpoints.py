"""Unit tests for AI service endpoints."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.ml_model import ml_model
from app.ocr import ocr_engine


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


class TestHealthEndpoint:
    """Tests for the health check endpoint."""
    
    def test_health_check_returns_200(self, client):
        """Test that health check endpoint returns 200 status."""
        response = client.get("/health")
        assert response.status_code == 200
    
    def test_health_check_response_structure(self, client):
        """Test that health check returns correct response structure."""
        response = client.get("/health")
        data = response.json()
        
        # Verify all required fields are present
        assert "status" in data
        assert "service" in data
        assert "version" in data
        assert "model_loaded" in data
        assert "ocr_available" in data
    
    def test_health_check_status_is_healthy(self, client):
        """Test that health check status is 'healthy'."""
        response = client.get("/health")
        data = response.json()
        assert data["status"] == "healthy"
    
    def test_health_check_service_name(self, client):
        """Test that health check returns correct service name."""
        response = client.get("/health")
        data = response.json()
        assert data["service"] == "ScamGuard AI Service"
    
    def test_health_check_version(self, client):
        """Test that health check returns version."""
        response = client.get("/health")
        data = response.json()
        assert data["version"] == "1.0.0"
    
    def test_health_check_model_loaded_is_boolean(self, client):
        """Test that model_loaded is a boolean value."""
        response = client.get("/health")
        data = response.json()
        assert isinstance(data["model_loaded"], bool)
    
    def test_health_check_ocr_available_is_boolean(self, client):
        """Test that ocr_available is a boolean value."""
        response = client.get("/health")
        data = response.json()
        assert isinstance(data["ocr_available"], bool)


class TestRootEndpoint:
    """Tests for the root endpoint."""
    
    def test_root_returns_200(self, client):
        """Test that root endpoint returns 200 status."""
        response = client.get("/")
        assert response.status_code == 200
    
    def test_root_response_structure(self, client):
        """Test that root endpoint returns correct response structure."""
        response = client.get("/")
        data = response.json()
        
        assert "service" in data
        assert "version" in data
        assert "description" in data
        assert "endpoints" in data
    
    def test_root_endpoints_list(self, client):
        """Test that root endpoint returns list of available endpoints."""
        response = client.get("/")
        data = response.json()
        
        assert isinstance(data["endpoints"], list)
        assert len(data["endpoints"]) > 0
        assert "/health" in data["endpoints"]


class TestModelLoading:
    """Tests for ML model loading."""
    
    def test_model_has_is_loaded_property(self):
        """Test that ML model has is_loaded property."""
        assert hasattr(ml_model, "is_loaded")
    
    def test_model_is_loaded_returns_boolean(self):
        """Test that is_loaded returns a boolean."""
        assert isinstance(ml_model.is_loaded, bool)
    
    def test_model_has_load_method(self):
        """Test that ML model has load method."""
        assert hasattr(ml_model, "load")
        assert callable(ml_model.load)


class TestOCRInitialization:
    """Tests for OCR engine initialization."""
    
    def test_ocr_has_is_available_property(self):
        """Test that OCR engine has is_available property."""
        assert hasattr(ocr_engine, "is_available")
    
    def test_ocr_is_available_returns_boolean(self):
        """Test that is_available returns a boolean."""
        assert isinstance(ocr_engine.is_available, bool)
    
    def test_ocr_has_extract_text_method(self):
        """Test that OCR engine has extract_text method."""
        assert hasattr(ocr_engine, "extract_text")
        assert callable(ocr_engine.extract_text)
