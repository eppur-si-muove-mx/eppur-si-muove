#!/bin/bash
# Standalone script to run FastAPI server

set -e

API_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$API_DIR"

echo "🚀 Starting Exoplanet Classification API..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "📥 Installing dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

# Check if model exists
MODEL_PATH="./models/exoplanets_lgbm_pipeline.joblib"
if [ ! -f "$MODEL_PATH" ]; then
    echo "⚠️  Warning: Model file not found at $MODEL_PATH"
    echo "The API will start but predictions will fail."
    echo "Please ensure the model is copied from migrate/models/"
fi

# Start server
echo "✅ Starting FastAPI server on http://localhost:8000"
echo "📚 API Documentation: http://localhost:8000/api/docs"
echo ""

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
