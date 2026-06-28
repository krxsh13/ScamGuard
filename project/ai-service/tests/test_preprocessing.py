"""Unit tests for text preprocessing functionality."""
import pytest
from app.ml_model import ml_model


class TestTextPreprocessing:
    """Tests for text preprocessing pipeline."""
    
    @pytest.fixture(scope="class", autouse=True)
    def setup_model(self):
        """Ensure model is loaded before running tests."""
        if not ml_model.is_loaded:
            try:
                ml_model.load()
            except Exception as e:
                pytest.skip(f"Model not available: {str(e)}")
    
    def test_preprocess_removes_excessive_whitespace(self):
        """Test that preprocessing removes excessive whitespace."""
        text = "This  has   multiple    spaces"
        result = ml_model.preprocess_text(text)
        assert "  " not in result, "Multiple spaces should be reduced to single space"
        assert result == "This has multiple spaces"
    
    def test_preprocess_strips_leading_trailing_whitespace(self):
        """Test that preprocessing strips leading and trailing whitespace."""
        text = "  \n\t  Hello world  \n\t  "
        result = ml_model.preprocess_text(text)
        assert result == "Hello world"
        assert not result.startswith(" ")
        assert not result.endswith(" ")
    
    def test_preprocess_handles_newlines_and_tabs(self):
        """Test that preprocessing handles newlines and tabs."""
        text = "Line1\nLine2\tTabbed"
        result = ml_model.preprocess_text(text)
        # Newlines and tabs should be converted to single spaces
        assert "\n" not in result
        assert "\t" not in result
        assert result == "Line1 Line2 Tabbed"
    
    def test_preprocess_handles_empty_string(self):
        """Test that preprocessing handles empty strings."""
        text = ""
        result = ml_model.preprocess_text(text)
        assert result == ""
    
    def test_preprocess_handles_whitespace_only(self):
        """Test that preprocessing handles whitespace-only strings."""
        text = "   \n\t   "
        result = ml_model.preprocess_text(text)
        assert result == ""
    
    def test_preprocess_truncates_long_text(self):
        """Test that preprocessing truncates very long text."""
        # Create text longer than 5000 characters
        text = "a" * 6000
        result = ml_model.preprocess_text(text)
        assert len(result) == 5000, "Text should be truncated to 5000 characters"
    
    def test_preprocess_preserves_normal_text(self):
        """Test that preprocessing preserves normal text."""
        text = "This is a normal sentence with proper spacing."
        result = ml_model.preprocess_text(text)
        assert result == text
    
    def test_preprocess_handles_special_characters(self):
        """Test that preprocessing handles special characters."""
        text = "Hello! How are you? I'm fine. #test @user"
        result = ml_model.preprocess_text(text)
        # Special characters should be preserved
        assert "!" in result
        assert "?" in result
        assert "#" in result
        assert "@" in result
    
    def test_preprocess_handles_unicode(self):
        """Test that preprocessing handles unicode characters."""
        text = "Hello 世界 🌍 café"
        result = ml_model.preprocess_text(text)
        # Unicode should be preserved
        assert "世界" in result
        assert "🌍" in result
        assert "café" in result
    
    def test_preprocess_handles_mixed_whitespace(self):
        """Test that preprocessing handles mixed whitespace types."""
        text = "Word1\n\nWord2\t\tWord3   Word4"
        result = ml_model.preprocess_text(text)
        # All whitespace should be normalized to single spaces
        assert result == "Word1 Word2 Word3 Word4"


class TestTokenization:
    """Tests for tokenization behavior."""
    
    @pytest.fixture(scope="class", autouse=True)
    def setup_model(self):
        """Ensure model is loaded before running tests."""
        if not ml_model.is_loaded:
            try:
                ml_model.load()
            except Exception as e:
                pytest.skip(f"Model not available: {str(e)}")
    
    def test_tokenizer_handles_normal_text(self):
        """Test that tokenizer handles normal text."""
        text = "This is a test message"
        inputs = ml_model.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=512,
            padding=True
        )
        assert "input_ids" in inputs
        assert "attention_mask" in inputs
        assert inputs["input_ids"].shape[1] <= 512
    
    def test_tokenizer_truncates_long_text(self):
        """Test that tokenizer truncates text longer than max_length."""
        # Create very long text
        text = " ".join(["word"] * 1000)
        inputs = ml_model.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=512,
            padding=True
        )
        # Should be truncated to max_length
        assert inputs["input_ids"].shape[1] == 512
    
    def test_tokenizer_handles_empty_string(self):
        """Test that tokenizer handles empty strings."""
        text = ""
        inputs = ml_model.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=512,
            padding=True
        )
        assert "input_ids" in inputs
        assert "attention_mask" in inputs
    
    def test_tokenizer_handles_special_characters(self):
        """Test that tokenizer handles special characters."""
        text = "Hello! @user #hashtag $100 50%"
        inputs = ml_model.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=512,
            padding=True
        )
        assert "input_ids" in inputs
        assert inputs["input_ids"].shape[1] > 0
