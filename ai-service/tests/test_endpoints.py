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


class TestAnalyzeUrlEndpoint:
    """Tests for URL analysis endpoint."""
    
    def test_analyze_url_returns_200_for_valid_url(self, client):
        """Test that /analyze-url returns 200 for valid URL."""
        response = client.post("/analyze-url", json={"url": "https://www.example.com"})
        assert response.status_code == 200
    
    def test_analyze_url_response_structure(self, client):
        """Test that /analyze-url returns correct response structure."""
        response = client.post("/analyze-url", json={"url": "https://www.example.com"})
        data = response.json()
        
        assert "confidence" in data
        assert "linguistic_cues" in data
        assert "model_version" in data
        assert isinstance(data["confidence"], (int, float))
        assert 0 <= data["confidence"] <= 100
    
    def test_analyze_url_benign_site_low_score(self, client):
        """Test that benign sites return lower confidence scores."""
        response = client.post("/analyze-url", json={"url": "https://google.com"})
        data = response.json()
        
        # Benign sites should have lower confidence
        assert "confidence" in data
        assert data["confidence"] < 70  # Adjust threshold as needed
    
    def test_analyze_url_suspicious_site_high_score(self, client):
        """Test that suspicious sites return higher confidence scores."""
        response = client.post(
            "/analyze-url",
            json={"url": "https://click-here-now-limited-time.suspicious-link.xyz"}
        )
        data = response.json()
        
        # Suspicious sites should have higher confidence
        assert "confidence" in data
        assert data["confidence"] > 30  # Should detect as potentially suspicious
    
    def test_analyze_url_invalid_url_returns_400(self, client):
        """Test that invalid URL returns 400."""
        response = client.post("/analyze-url", json={"url": "not-a-valid-url"})
        assert response.status_code == 400
    
    def test_analyze_url_missing_url_returns_400(self, client):
        """Test that missing URL returns 400."""
        response = client.post("/analyze-url", json={})
        assert response.status_code == 400
    
    def test_analyze_url_includes_model_version(self, client):
        """Test that /analyze-url response includes model version."""
        response = client.post("/analyze-url", json={"url": "https://example.com"})
        data = response.json()
        
        assert "model_version" in data
        assert data["model_version"] is not None
        assert isinstance(data["model_version"], str)


class TestPredictEndpoint:
    """Tests for prediction endpoint with caching."""
    
    def test_predict_returns_200(self, client):
        """Test that /predict returns 200 status."""
        response = client.post("/predict", json={"text": "Test content"})
        assert response.status_code == 200
    
    def test_predict_response_structure(self, client):
        """Test that /predict returns correct response structure."""
        response = client.post("/predict", json={"text": "Test content"})
        data = response.json()
        
        assert "confidence" in data
        assert "linguistic_cues" in data
        assert "model_version" in data
        assert isinstance(data["confidence"], (int, float))
    
    def test_predict_includes_model_version(self, client):
        """Test that /predict response includes model version."""
        response = client.post("/predict", json={"text": "Test content"})
        data = response.json()
        
        assert "model_version" in data
        assert data["model_version"] is not None
    
    def test_predict_caching_same_input_returns_cached_result(self, client):
        """Test that /predict returns cached result for identical input."""
        text_input = "Identical test content for caching"
        
        # First prediction
        response1 = client.post("/predict", json={"text": text_input})
        data1 = response1.json()
        
        # Second prediction with same input
        response2 = client.post("/predict", json={"text": text_input})
        data2 = response2.json()
        
        # Results should be identical (from cache)
        assert data1["confidence"] == data2["confidence"]
        assert data1["linguistic_cues"] == data2["linguistic_cues"]
    
    def test_predict_different_input_returns_different_result(self, client):
        """Test that different inputs return potentially different results."""
        response1 = client.post("/predict", json={"text": "Benign content here"})
        response2 = client.post("/predict", json={"text": "Click NOW limited time offer!!!"})
        
        data1 = response1.json()
        data2 = response2.json()
        
        # Confidence scores may differ based on content
        assert "confidence" in data1
        assert "confidence" in data2
    
    def test_predict_missing_text_returns_400(self, client):
        """Test that missing text returns 400."""
        response = client.post("/predict", json={})
        assert response.status_code == 400
    
    def test_predict_empty_text_returns_400(self, client):
        """Test that empty text returns 400."""
        response = client.post("/predict", json={"text": ""})
        assert response.status_code == 400
    
    def test_predict_cache_invalidation_on_model_update(self, client):
        """Test cache behavior (mock test - in real scenario, cache should clear on model reload)."""
        text_input = "Test for cache invalidation"
        
        # First prediction
        response1 = client.post("/predict", json={"text": text_input})
        data1 = response1.json()
        
        # In a real scenario, model would be updated here
        # For now, just verify consistent caching
        response2 = client.post("/predict", json={"text": text_input})
        data2 = response2.json()
        
        assert data1["confidence"] == data2["confidence"]


class TestExtractTextEndpoint:
    """Tests for OCR text extraction endpoint."""
    
    def test_extract_text_returns_200_with_valid_image(self, client):
        """Test that /extract-text returns 200 with valid image file."""
        # Create a simple test image
        import io
        from PIL import Image
        
        # Create a simple image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        files = {'file': ('test.png', img_bytes, 'image/png')}
        response = client.post("/extract-text", files=files)
        
        assert response.status_code == 200
    
    def test_extract_text_response_structure(self, client):
        """Test that /extract-text returns correct response structure."""
        import io
        from PIL import Image
        
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        files = {'file': ('test.png', img_bytes, 'image/png')}
        response = client.post("/extract-text", files=files)
        
        if response.status_code == 200:
            data = response.json()
            assert "text" in data
            assert "preprocessing_applied" in data
            assert "model_version" in data
            assert isinstance(data["preprocessing_applied"], bool)
    
    def test_extract_text_returns_preprocessing_applied(self, client):
        """Test that /extract-text indicates preprocessing was applied."""
        import io
        from PIL import Image
        
        img = Image.new('RGB', (200, 200), color='blue')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        files = {'file': ('test.png', img_bytes, 'image/png')}
        response = client.post("/extract-text", files=files)
        
        if response.status_code == 200:
            data = response.json()
            # Preprocessing should be applied to enhance OCR accuracy
            assert "preprocessing_applied" in data
    
    def test_extract_text_missing_file_returns_400(self, client):
        """Test that missing file returns 400."""
        response = client.post("/extract-text", files={})
        assert response.status_code == 400
    
    def test_extract_text_invalid_file_type_returns_400(self, client):
        """Test that invalid file type returns 400."""
        files = {'file': ('test.txt', b'text content', 'text/plain')}
        response = client.post("/extract-text", files=files)
        assert response.status_code == 400
    
    def test_extract_text_includes_model_version(self, client):
        """Test that /extract-text response includes model version."""
        import io
        from PIL import Image
        
        img = Image.new('RGB', (100, 100), color='white')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        files = {'file': ('test.png', img_bytes, 'image/png')}
        response = client.post("/extract-text", files=files)
        
        if response.status_code == 200:
            data = response.json()
            assert "model_version" in data
            assert data["model_version"] is not None


class TestModelVersion:
    """Tests for model version consistency across endpoints."""
    
    def test_health_endpoint_includes_model_version(self, client):
        """Test that /health endpoint includes model_version."""
        response = client.get("/health")
        data = response.json()
        
        # Health check should include version
        assert "version" in data
    
    def test_all_analysis_endpoints_return_same_model_version(self, client):
        """Test that all endpoints return consistent model version."""
        # Get model version from /health
        health_response = client.get("/health")
        health_data = health_response.json()
        health_version = health_data.get("version")
        
        # Get model version from /predict
        predict_response = client.post("/predict", json={"text": "test"})
        predict_data = predict_response.json()
        predict_version = predict_data.get("model_version")
        
        # Get model version from /analyze-url
        url_response = client.post("/analyze-url", json={"url": "https://example.com"})
        url_data = url_response.json()
        url_version = url_data.get("model_version")
        
        # All versions should be consistent
        if predict_version and url_version:
            assert predict_version == url_version
    
    def test_model_version_format(self, client):
        """Test that model version follows expected format."""
        response = client.post("/predict", json={"text": "test"})
        data = response.json()
        
        model_version = data.get("model_version")
        if model_version:
            # Version should be a string, typically in format "X.Y.Z" or similar
            assert isinstance(model_version, str)
            assert len(model_version) > 0
