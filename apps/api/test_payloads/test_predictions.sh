#!/bin/bash
# Script para probar predicciones con los payloads de ejemplo

API_URL="http://localhost:8000/api/v1/predict"

echo "========================================="
echo "TESTING EXOPLANET CLASSIFICATION API"
echo "========================================="
echo ""

# Función para hacer una predicción
predict() {
    local file=$1
    local sample_index=$2
    local expected=$3
    
    echo "Testing: $expected (from $file, sample $sample_index)"
    echo "-------------------------------------------"
    
    # Extraer el objeto features del JSON usando jq
    features=$(cat "$file" | jq ".samples[$sample_index].features")
    
    # Hacer la predicción
    result=$(curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "$features")
    
    # Mostrar resultado formateado
    echo "$result" | jq '.'
    echo ""
}

echo "1. Testing CONFIRMED exoplanet:"
predict "confirmed_only.json" 0 "CONFIRMED"

echo "2. Testing CANDIDATE exoplanet:"
predict "candidate_only.json" 0 "CANDIDATE"

echo "3. Testing FALSE POSITIVE:"
predict "false_positive_only.json" 0 "FALSE POSITIVE"

echo "4. Testing REFUTED:"
predict "refuted_only.json" 0 "REFUTED"

echo "========================================="
echo "TEST COMPLETED"
echo "========================================="
