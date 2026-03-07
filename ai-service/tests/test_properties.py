"""Property-based tests for AI scam detection."""
import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from fastapi.testclient import TestClient
from app.main import app
from app.ml_model import ml_model


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
