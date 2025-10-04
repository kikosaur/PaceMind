"""
Train Random Forest model for motivation prediction
"""
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.preprocessing import LabelEncoder
import joblib
import json
from datetime import datetime, timedelta
import random

def generate_synthetic_data(n_samples=1000):
    """Generate synthetic training data for motivation prediction"""
    
    np.random.seed(42)
    random.seed(42)
    
    data = []
    
    for i in range(n_samples):
        # Generate walking data
        steps = np.random.randint(1000, 15000)
        duration = np.random.randint(15, 120)  # 15-120 minutes
        distance = steps * 0.0008 + np.random.normal(0, 0.1)  # Rough conversion with noise
        distance = max(0.1, distance)  # Ensure positive
        calories = distance * 60 + np.random.normal(0, 10)  # Rough estimation
        pace = steps / duration if duration > 0 else 0
        
        # Generate context data
        time_of_day = np.random.choice(['morning', 'afternoon', 'evening'])
        weekly_progress = np.random.uniform(5, 50)  # km per week
        monthly_progress = weekly_progress * 4 + np.random.normal(0, 5)
        
        # Generate journal data with some correlation to walking performance
        base_energy = 3 + (steps - 5000) / 5000  # Higher steps -> higher energy
        base_energy = max(1, min(5, base_energy + np.random.normal(0, 0.5)))
        
        energy_level = int(round(base_energy))
        
        # Mood correlates with energy and time of day
        mood_prob = {'happy': 0.4, 'neutral': 0.4, 'sad': 0.2}
        if energy_level >= 4:
            mood_prob = {'happy': 0.6, 'neutral': 0.3, 'sad': 0.1}
        elif energy_level <= 2:
            mood_prob = {'happy': 0.2, 'neutral': 0.3, 'sad': 0.5}
            
        if time_of_day == 'morning':
            mood_prob['happy'] += 0.1
            mood_prob['sad'] -= 0.1
            
        mood = np.random.choice(list(mood_prob.keys()), p=list(mood_prob.values()))
        
        # Motivation correlates with energy, mood, and walking performance
        base_motivation = 50
        if mood == 'happy':
            base_motivation += 20
        elif mood == 'sad':
            base_motivation -= 20
            
        base_motivation += (energy_level - 3) * 10
        base_motivation += (steps - 7500) / 150  # Steps influence
        
        motivation = int(max(0, min(100, base_motivation + np.random.normal(0, 10))))
        
        # Determine motivation state (target variable)
        if motivation >= 70:
            motivation_state = 2  # high
        elif motivation >= 40:
            motivation_state = 1  # medium
        else:
            motivation_state = 0  # low
            
        data.append({
            'steps': steps,
            'distance': distance,
            'duration': duration,
            'calories': calories,
            'pace': pace,
            'timeOfDay': time_of_day,
            'weeklyProgress': weekly_progress,
            'monthlyProgress': monthly_progress,
            'mood': mood,
            'energyLevel': energy_level,
            'motivation': motivation,
            'motivation_state': motivation_state
        })
    
    return pd.DataFrame(data)

def preprocess_features(df):
    """Preprocess features for model training"""
    
    # Create a copy to avoid modifying original
    df_processed = df.copy()
    
    # One-hot encode categorical variables
    time_dummies = pd.get_dummies(df_processed['timeOfDay'], prefix='timeOfDay')
    mood_dummies = pd.get_dummies(df_processed['mood'], prefix='mood')
    
    # Combine all features
    features = pd.concat([
        df_processed[['steps', 'distance', 'duration', 'calories', 'pace', 
                     'weeklyProgress', 'monthlyProgress', 'energyLevel', 'motivation']],
        time_dummies,
        mood_dummies
    ], axis=1)
    
    return features

def train_model():
    """Train the Random Forest model"""
    
    print("Generating synthetic training data...")
    df = generate_synthetic_data(2000)
    
    print(f"Generated {len(df)} samples")
    print(f"Motivation state distribution:")
    print(df['motivation_state'].value_counts())
    
    # Prepare features and target
    X = preprocess_features(df)
    y = df['motivation_state']
    
    print(f"Feature columns: {list(X.columns)}")
    
    # Split the data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"Training set size: {len(X_train)}")
    print(f"Test set size: {len(X_test)}")
    
    # Train Random Forest model
    print("Training Random Forest model...")
    rf_model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        class_weight='balanced'
    )
    
    rf_model.fit(X_train, y_train)
    
    # Evaluate model
    print("Evaluating model...")
    train_score = rf_model.score(X_train, y_train)
    test_score = rf_model.score(X_test, y_test)
    
    print(f"Training accuracy: {train_score:.3f}")
    print(f"Test accuracy: {test_score:.3f}")
    
    # Cross-validation
    cv_scores = cross_val_score(rf_model, X_train, y_train, cv=5)
    print(f"Cross-validation scores: {cv_scores}")
    print(f"Mean CV score: {cv_scores.mean():.3f} (+/- {cv_scores.std() * 2:.3f})")
    
    # Predictions and detailed evaluation
    y_pred = rf_model.predict(X_test)
    
    print("\nClassification Report:")
    target_names = ['Low', 'Medium', 'High']
    print(classification_report(y_test, y_pred, target_names=target_names))
    
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': X.columns,
        'importance': rf_model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\nTop 10 Feature Importances:")
    print(feature_importance.head(10))
    
    # Save the model
    model_path = 'motivation_model.joblib'
    joblib.dump(rf_model, model_path)
    print(f"\nModel saved to {model_path}")
    
    # Save feature columns for consistency
    feature_info = {
        'feature_columns': list(X.columns),
        'model_type': 'RandomForestClassifier',
        'training_date': datetime.now().isoformat(),
        'training_samples': len(df),
        'test_accuracy': float(test_score),
        'cv_mean_score': float(cv_scores.mean())
    }
    
    with open('model_info.json', 'w') as f:
        json.dump(feature_info, f, indent=2)
    
    print("Model info saved to model_info.json")
    
    return rf_model, X.columns

if __name__ == "__main__":
    model, feature_columns = train_model()
    print("\nModel training completed successfully!")
    print(f"Feature columns: {list(feature_columns)}")