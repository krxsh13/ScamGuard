# ScamGuard AI Service

Python FastAPI service for AI-powered scam detection using DistilBERT and OCR capabilities.

## Features

- Text-based scam detection using DistilBERT
- OCR text extraction from images using Tesseract
- Health check endpoint
- CORS support for backend communication

## Setup

### Prerequisites

- Python 3.10+
- Tesseract OCR installed on your system

#### Installing Tesseract

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr
```

**macOS:**
```bash
brew install tesseract
```

**Windows:**
Download and install from: https://github.com/UB-Mannheim/tesseract/wiki

### Installation

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Run the service:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /` - Root endpoint with service info

## Development

The service will automatically download the DistilBERT model on first run.

## Testing

Run tests with pytest:
```bash
pytest
```
