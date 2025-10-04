"""
PaceMind ML API - FastAPI service for motivation prediction
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="PaceMind ML API",
    description="Machine Learning API for motivation prediction based on walking patterns and journal entries",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data models
class WalkingData(BaseModel):
    steps: int
    distance: float  # km
    duration: int    # minutes
    calories: int
    pace: float      # steps/duration

class ContextData(BaseModel):
    timeOfDay: str   # 'morning', 'afternoon', 'evening'
    weeklyProgress: float   # km
    monthlyProgress: float  # km

class JournalData(BaseModel):
    mood: str        # 'happy', 'neutral', 'sad'
    energyLevel: int # 1-5
    motivation: int  # 0-100
    notes: Optional[str] = None

class PredictionRequest(BaseModel):
    walking: WalkingData
    context: ContextData
    journal: JournalData

class PredictionResponse(BaseModel):
    motivation_state: str  # 'high', 'medium', 'low'
    confidence: float      # 0-1
    suggestion: str
    insights: dict
    recommendations: List[str]
    timestamp: int

# Global model variable
model = None
feature_columns = [
    'steps', 'distance', 'duration', 'calories', 'pace',
    'weeklyProgress', 'monthlyProgress', 'energyLevel', 'motivation',
    'timeOfDay_afternoon', 'timeOfDay_evening', 'timeOfDay_morning',
    'mood_happy', 'mood_neutral', 'mood_sad'
]

def load_model():
    """Load the trained Random Forest model"""
    global model
    try:
        model_path = os.getenv('MODEL_PATH', 'motivation_model.joblib')
        if os.path.exists(model_path):
            model = joblib.load(model_path)
            logger.info(f"Model loaded successfully from {model_path}")
        else:
            logger.warning(f"Model file not found at {model_path}. Using fallback predictions.")
            model = None
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        model = None

def preprocess_data(request: PredictionRequest) -> np.ndarray:
    """Preprocess the input data for model prediction"""
    
    # Create base feature dictionary
    features = {
        'steps': request.walking.steps,
        'distance': request.walking.distance,
        'duration': request.walking.duration,
        'calories': request.walking.calories,
        'pace': request.walking.pace,
        'weeklyProgress': request.context.weeklyProgress,
        'monthlyProgress': request.context.monthlyProgress,
        'energyLevel': request.journal.energyLevel,
        'motivation': request.journal.motivation,
    }
    
    # One-hot encode time of day
    for time_period in ['morning', 'afternoon', 'evening']:
        features[f'timeOfDay_{time_period}'] = 1 if request.context.timeOfDay == time_period else 0
    
    # One-hot encode mood
    for mood_type in ['happy', 'neutral', 'sad']:
        features[f'mood_{mood_type}'] = 1 if request.journal.mood == mood_type else 0
    
    # Create feature array in the correct order
    feature_array = np.array([features[col] for col in feature_columns]).reshape(1, -1)
    
    return feature_array

def generate_fallback_prediction(request: PredictionRequest) -> PredictionResponse:
    """Generate a fallback prediction when ML model is not available"""
    
    # Simple rule-based fallback logic
    motivation_score = request.journal.motivation
    energy_level = request.journal.energyLevel
    mood = request.journal.mood
    
    # Calculate motivation state based on multiple factors
    if motivation_score >= 70 and energy_level >= 4 and mood == 'happy':
        motivation_state = 'high'
        confidence = 0.75
    elif motivation_score >= 40 and energy_level >= 3:
        motivation_state = 'medium'
        confidence = 0.65
    else:
        motivation_state = 'low'
        confidence = 0.55
    
    # Generate contextual suggestions
    suggestions = {
        'high': "Great energy! Consider extending your walk or exploring a new route.",
        'medium': "You're doing well. Try walking during your preferred time of day.",
        'low': "Take it easy today. A gentle walk can help boost your mood."
    }
    
    recommendations = []
    if request.context.timeOfDay == 'evening' and motivation_score < 50:
        recommendations.append("Consider morning walks when energy levels are typically higher")
    if energy_level < 3:
        recommendations.append("Focus on shorter, more frequent walks to build consistency")
    if mood == 'sad':
        recommendations.append("Walking in nature or with music can help improve mood")
    
    return PredictionResponse(
        motivation_state=motivation_state,
        confidence=confidence,
        suggestion=suggestions[motivation_state],
        insights={
            "primaryFactors": ["energy_level", "mood", "self_reported_motivation"],
            "recommendations": recommendations,
            "trendAnalysis": "Fallback prediction - install ML model for detailed analysis"
        },
        recommendations=recommendations,
        timestamp=int(datetime.now().timestamp())
    )

@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    load_model()

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "PaceMind ML API is running",
        "model_loaded": model is not None,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "model_status": "loaded" if model is not None else "fallback_mode",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@app.post("/predict", response_model=PredictionResponse)
async def predict_motivation(request: PredictionRequest):
    """Predict motivation state based on walking and journal data"""
    
    try:
        # If model is not loaded, use fallback prediction
        if model is None:
            logger.info("Using fallback prediction - model not available")
            return generate_fallback_prediction(request)
        
        # Preprocess the data
        features = preprocess_data(request)
        
        # Make prediction
        prediction = model.predict(features)[0]
        confidence = max(model.predict_proba(features)[0])
        
        # Map prediction to motivation state
        motivation_states = {0: 'low', 1: 'medium', 2: 'high'}
        motivation_state = motivation_states.get(prediction, 'medium')
        
        # Generate suggestions based on prediction
        suggestions = {
            'high': "Excellent motivation! Consider challenging yourself with a longer route or new walking goal.",
            'medium': "Good progress! Maintain consistency and listen to your body's needs.",
            'low': "Be gentle with yourself. Focus on small, achievable walking goals today."
        }
        
        # Generate recommendations
        recommendations = []
        if request.journal.energyLevel < 3:
            recommendations.append("Consider shorter walks when energy is low")
        if request.context.timeOfDay == 'evening' and motivation_state == 'low':
            recommendations.append("Try morning walks for better motivation")
        if request.journal.mood == 'sad':
            recommendations.append("Walking can help improve mood - start with just 10 minutes")
        
        return PredictionResponse(
            motivation_state=motivation_state,
            confidence=float(confidence),
            suggestion=suggestions[motivation_state],
            insights={
                "primaryFactors": ["walking_consistency", "energy_level", "time_of_day"],
                "recommendations": recommendations,
                "trendAnalysis": f"Current motivation trend: {motivation_state}"
            },
            recommendations=recommendations,
            timestamp=int(datetime.now().timestamp())
        )
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        # Return fallback prediction on error
        return generate_fallback_prediction(request)

@app.get("/model/info")
async def model_info():
    """Get information about the loaded model"""
    if model is None:
        return {"status": "No model loaded", "fallback_mode": True}
    
    return {
        "model_type": str(type(model).__name__),
        "feature_count": len(feature_columns),
        "features": feature_columns,
        "status": "loaded"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)