"""Property-based tests for AI scam detection."""
import pytest
import io
from hypothesis import given, strategies as st, settings, HealthCheck
from fastapi.testclient import TestClient
from PIL import Image
from app.main import app
from app.ml_model import ml_model
from app.config import settings as app_settings


@pytest.fixture(scope="module", autouse=True)
def setup_model():
    """Ensure model is loaded before running tests."""
    if not ml_model.is_loaded:
        try:
            ml_model.load()
        except Exception as e:
            pytest.skip(f"Model not available: {str(e)}")


@pytest.fixture(scope="module")
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


# Feature: ai-backend-integration, Property 1: Risk score bounds
@given(text=st.text(min_size=1, max_size=1000))
@settings(
    max_examples=100,
    suppress_health_check=[HealthCheck.function_scoped_fixture]
)
def test_risk_score_bounds(client, text):
    """
    For any text input submitted for analysis, the returned risk score 
    must be between 0 and 100 inclusive, and the confidence level must 
    be between 0 and 100 inclusive.
    
    Validates: Requirements 1.2
    """
    # Skip empty or whitespace-only strings as they're invalid input
    if not text.strip():
        return
    
    # Make prediction request
    response = client.post("/predict", json={"text": text})
    
    # If model is not loaded, skip
    if response.status_code == 503:
        pytest.skip("Model not loaded")
    
    # Request should succeed
    assert response.status_code == 200, f"Request failed with status {response.status_code}"
    
    data = response.json()
    
    # Verify risk_score is within bounds [0, 100]
    assert "risk_score" in data, "Response missing risk_score field"
    assert isinstance(data["risk_score"], int), "risk_score must be an integer"
    assert 0 <= data["risk_score"] <= 100, \
        f"risk_score {data['risk_score']} is out of bounds [0, 100]"
    
    # Verify confidence is within bounds [0, 100]
    assert "confidence" in data, "Response missing confidence field"
    assert isinstance(data["confidence"], (int, float)), "confidence must be numeric"
    assert 0 <= data["confidence"] <= 100, \
        f"confidence {data['confidence']} is out of bounds [0, 100]"



# Feature: ai-backend-integration, Property 2: Scam pattern detection
@given(
    scam_keyword=st.sampled_from([
        "urgent", "immediately", "verify account", "lottery winner",
        "congratulations", "click here", "suspended account", "act now",
        "wire transfer", "claim your prize", "limited time", "confirm identity"
    ])
)
@settings(
    max_examples=100,
    suppress_health_check=[HealthCheck.function_scoped_fixture]
)
def test_scam_pattern_detection(client, scam_keyword):
    """
    For any text containing known scam keywords, the AI Detection Engine 
    must identify and return at least one linguistic cue in the response.
    
    Validates: Requirements 1.3
    """
    # Create text with the scam keyword
    text = f"Hello, this is a message about {scam_keyword}. Please respond."
    
    # Make prediction request
    response = client.post("/predict", json={"text": text})
    
    # If model is not loaded, skip
    if response.status_code == 503:
        pytest.skip("Model not loaded")
    
    # Request should succeed
    assert response.status_code == 200, f"Request failed with status {response.status_code}"
    
    data = response.json()
    
    # Verify linguistic_cues field exists
    assert "linguistic_cues" in data, "Response missing linguistic_cues field"
    
    linguistic_cues = data["linguistic_cues"]
    
    # At least one linguistic cue should be non-zero
    # (urgency, financial_pressure, or emotional_manipulation)
    assert "urgency" in linguistic_cues, "Missing urgency cue"
    assert "financial_pressure" in linguistic_cues, "Missing financial_pressure cue"
    assert "emotional_manipulation" in linguistic_cues, "Missing emotional_manipulation cue"
    
    # At least one cue should be greater than 0
    has_cue = (
        linguistic_cues["urgency"] > 0 or
        linguistic_cues["financial_pressure"] > 0 or
        linguistic_cues["emotional_manipulation"] > 0
    )
    
    assert has_cue, \
        f"No linguistic cues detected for scam keyword '{scam_keyword}'. " \
        f"Cues: {linguistic_cues}"



# Feature: ai-backend-integration, Property 3: Low confidence warning
@given(text=st.text(min_size=1, max_size=1000))
@settings(
    max_examples=100,
    suppress_health_check=[HealthCheck.function_scoped_fixture]
)
def test_low_confidence_warning(client, text):
    """
    For any analysis result where the confidence level is below 70%, 
    the response must include an uncertainty indicator and a suggestion 
    for manual verification.
    
    Validates: Requirements 1.5
    """
    # Skip empty or whitespace-only strings as they're invalid input
    if not text.strip():
        return
    
    # Make prediction request
    response = client.post("/predict", json={"text": text})
    
    # If model is not loaded, skip
    if response.status_code == 503:
        pytest.skip("Model not loaded")
    
    # Request should succeed
    assert response.status_code == 200, f"Request failed with status {response.status_code}"
    
    data = response.json()
    
    # Verify confidence field exists
    assert "confidence" in data, "Response missing confidence field"
    assert "low_confidence_warning" in data, "Response missing low_confidence_warning field"
    
    confidence = data["confidence"]
    low_confidence_warning = data["low_confidence_warning"]
    
    # If confidence is below 70%, there must be a warning
    if confidence < 70:
        assert low_confidence_warning is not None, \
            f"Confidence is {confidence}% (< 70%) but no warning provided"
        assert isinstance(low_confidence_warning, str), \
            "low_confidence_warning must be a string when present"
        assert len(low_confidence_warning) > 0, \
            "low_confidence_warning must not be empty when confidence < 70%"
        # Check that the warning mentions manual verification
        assert "manual" in low_confidence_warning.lower() or "verify" in low_confidence_warning.lower(), \
            f"Warning should suggest manual verification. Got: {low_confidence_warning}"
    else:
        # If confidence is >= 70%, warning should be None or empty
        # (we allow it to be present but it's not required)
        pass



# Feature: ai-backend-integration, Property 18: File size validation
@given(
    file_size_mb=st.floats(min_value=0.001, max_value=10.0),
    mime_type=st.sampled_from([
        "image/png", "image/jpeg", "image/jpg",  # Valid types
        "text/plain", "application/pdf", "image/gif"  # Invalid types
    ]),
    width=st.integers(min_value=10, max_value=200),
    height=st.integers(min_value=10, max_value=200)
)
@settings(
    max_examples=100,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
    deadline=1000  # Increase deadline to 1 second
)
def test_file_size_validation(client, file_size_mb, mime_type, width, height):
    """
    For any image upload, files under 5MB with valid image MIME types 
    (image/png, image/jpeg, image/jpg) must be accepted, while files 
    exceeding 5MB or with invalid types must be rejected with an 
    appropriate error message.
    
    Validates: Requirements 5.1
    """
    # Create a test image
    image = Image.new('RGB', (width, height), color='white')
    
    # Determine file format based on MIME type
    if mime_type == "image/png":
        format_type = "PNG"
    elif mime_type in ["image/jpeg", "image/jpg"]:
        format_type = "JPEG"
    else:
        # For invalid MIME types, use PNG but send wrong MIME type
        format_type = "PNG"
    
    # Create image bytes with approximate target size
    img_bytes = io.BytesIO()
    image.save(img_bytes, format=format_type)
    img_bytes.seek(0)
    
    # Get actual size and adjust if needed to match target
    actual_size = len(img_bytes.getvalue())
    target_size = int(file_size_mb * 1024 * 1024)
    
    # If we need a larger file, pad it
    if actual_size < target_size:
        padding = b'\x00' * (target_size - actual_size)
        img_bytes = io.BytesIO(img_bytes.getvalue() + padding)
    
    img_bytes.seek(0)
    final_size = len(img_bytes.getvalue())
    
    # Determine if this should be accepted
    valid_mime = mime_type in ["image/png", "image/jpeg", "image/jpg"]
    under_size_limit = final_size <= app_settings.max_image_size_bytes
    should_accept = valid_mime and under_size_limit
    
    # Prepare file upload
    files = {
        "file": ("test_image.png", img_bytes, mime_type)
    }
    
    # Make request to extract-text endpoint
    response = client.post("/extract-text", files=files)
    
    if should_accept:
        # Should be accepted (200 or 503 if OCR not available)
        assert response.status_code in [200, 503], \
            f"Valid file (size={final_size/1024/1024:.2f}MB, type={mime_type}) " \
            f"should be accepted but got status {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            # Should have extracted_text field
            assert "extracted_text" in data or "text" in data, \
                "Response should contain extracted text field"
    else:
        # Should be rejected with 400 or 413
        assert response.status_code in [400, 413, 422], \
            f"Invalid file (size={final_size/1024/1024:.2f}MB, type={mime_type}) " \
            f"should be rejected but got status {response.status_code}"
        
        # Should have error message
        data = response.json()
        assert "detail" in data or "error" in data or "message" in data, \
            "Error response should contain error message"
        
        # Error message should be informative
        error_msg = str(data.get("detail", data.get("error", data.get("message", "")))).lower()
        
        # The endpoint checks MIME type first, then file size
        # So we need to check which validation failed
        if not valid_mime:
            # Should mention file type or format
            assert any(word in error_msg for word in ["type", "format", "mime", "invalid", "accepted"]), \
                f"Error message should mention invalid file type. Got: {error_msg}"
        elif not under_size_limit:
            # Only check size error if MIME type is valid
            # Should mention file size
            assert any(word in error_msg for word in ["size", "large", "exceed", "limit", "5mb", "mb"]), \
                f"Error message should mention file size limit. Got: {error_msg}"



# Feature: ai-backend-integration, Property 19: OCR extraction pipeline
@given(
    width=st.integers(min_value=50, max_value=400),
    height=st.integers(min_value=50, max_value=400),
    format_type=st.sampled_from(["PNG", "JPEG"])
)
@settings(
    max_examples=100,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
    deadline=2000  # Increase deadline to 2 seconds for OCR processing
)
def test_ocr_extraction_pipeline(client, width, height, format_type):
    """
    For any successfully uploaded image, the system must attempt OCR text 
    extraction and, if text is found, pass the extracted content to the 
    AI Detection Engine for analysis.
    
    Validates: Requirements 5.2, 5.3
    """
    # Create a test image
    image = Image.new('RGB', (width, height), color='white')
    
    # Convert to bytes
    img_bytes = io.BytesIO()
    image.save(img_bytes, format=format_type)
    img_bytes.seek(0)
    
    # Determine MIME type
    mime_type = "image/png" if format_type == "PNG" else "image/jpeg"
    
    # Prepare file upload
    files = {
        "file": (f"test_image.{format_type.lower()}", img_bytes, mime_type)
    }
    
    # Step 1: Upload image to extract-text endpoint
    response = client.post("/extract-text", files=files)
    
    # If OCR is not available, skip the test
    if response.status_code == 503:
        pytest.skip("OCR engine not available")
    
    # Request should succeed (valid image, valid MIME type, under size limit)
    assert response.status_code == 200, \
        f"Valid image upload should succeed but got status {response.status_code}"
    
    data = response.json()
    
    # Verify OCR extraction was attempted
    assert "extracted_text" in data, "Response should contain extracted_text field"
    assert "character_count" in data, "Response should contain character_count field"
    assert "ocr_available" in data, "Response should contain ocr_available field"
    
    # Verify OCR was available
    assert data["ocr_available"] is True, "OCR should be available for successful extraction"
    
    extracted_text = data["extracted_text"]
    
    # Step 2: If text was extracted, verify it can be passed to AI Detection Engine
    # Note: For blank images, extracted_text might be empty, which is valid
    # We only test the pipeline if text was actually extracted
    if extracted_text and extracted_text.strip():
        # Verify the extracted text can be analyzed by the AI Detection Engine
        predict_response = client.post("/predict", json={"text": extracted_text})
        
        # If model is not loaded, we can't complete the pipeline test
        if predict_response.status_code == 503:
            pytest.skip("AI model not loaded - cannot test full pipeline")
        
        # Prediction should succeed
        assert predict_response.status_code == 200, \
            f"AI Detection Engine should accept extracted text but got status {predict_response.status_code}"
        
        predict_data = predict_response.json()
        
        # Verify the AI Detection Engine returned valid analysis
        assert "risk_score" in predict_data, "AI analysis should include risk_score"
        assert "confidence" in predict_data, "AI analysis should include confidence"
        assert "linguistic_cues" in predict_data, "AI analysis should include linguistic_cues"
        
        # Verify risk score is within bounds (Property 1)
        assert 0 <= predict_data["risk_score"] <= 100, \
            f"Risk score should be 0-100, got {predict_data['risk_score']}"
        
        # Verify confidence is within bounds (Property 1)
        assert 0 <= predict_data["confidence"] <= 100, \
            f"Confidence should be 0-100, got {predict_data['confidence']}"
    
    # If no text was extracted (blank image), that's still a valid pipeline execution
    # The OCR was attempted, it just didn't find any text
    # This satisfies requirement 5.2 (OCR technology was used)
