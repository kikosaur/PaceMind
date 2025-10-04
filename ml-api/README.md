# PaceMind ML API

FastAPI-based machine learning service for motivation prediction in the PaceMind walking app.

## Features

- **Motivation Prediction**: Predicts user motivation state (high/medium/low) based on walking patterns and journal entries
- **Fallback Mode**: Works without a trained model using rule-based predictions
- **RESTful API**: Simple HTTP endpoints for integration
- **Health Monitoring**: Built-in health checks and monitoring
- **Cloud Ready**: Configured for Railway, Render, and Docker deployment

## Quick Start

### Local Development

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Train Model (Optional)**
   ```bash
   python train_model.py
   ```

3. **Run API**
   ```bash
   uvicorn app:app --reload --port 8000
   ```

4. **Test API**
   ```bash
   curl http://localhost:8000/health
   ```

### Docker Deployment

```bash
# Build image
docker build -t pacemind-ml-api .

# Run container
docker run -p 8000:8000 pacemind-ml-api
```

## Cloud Deployment Options

### 🚂 Railway (Recommended)

1. **Connect Repository**
   - Go to [Railway](https://railway.app)
   - Connect your GitHub repository
   - Select the `ml-api` folder as root

2. **Deploy**
   - Railway will automatically detect the `railway.json` config
   - Deployment URL will be provided

3. **Update Environment**
   ```bash
   # Update your .env file
   EXPO_PUBLIC_ML_API_URL=https://your-app.railway.app
   ```

### 🎨 Render

1. **Create Web Service**
   - Go to [Render](https://render.com)
   - Connect repository and select `ml-api` folder
   - Use the `render.yaml` configuration

2. **Deploy**
   - Render will build and deploy automatically
   - Free tier available

### ☁️ Other Platforms

- **Heroku**: Use `Dockerfile` for deployment
- **AWS Lambda**: Use AWS SAM or Serverless framework
- **Google Cloud Run**: Deploy using Docker container
- **Azure Container Instances**: Deploy Docker image

## API Endpoints

### Health Check
```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "model_status": "loaded",
  "timestamp": "2024-01-20T10:30:00",
  "version": "1.0.0"
}
```

### Motivation Prediction
```http
POST /predict
```

Request Body:
```json
{
  "walking": {
    "steps": 8500,
    "distance": 6.8,
    "duration": 45,
    "calories": 320,
    "pace": 188.9
  },
  "context": {
    "timeOfDay": "morning",
    "weeklyProgress": 25.4,
    "monthlyProgress": 98.2
  },
  "journal": {
    "mood": "happy",
    "energyLevel": 4,
    "motivation": 75,
    "notes": "Felt great today!"
  }
}
```

Response:
```json
{
  "motivation_state": "high",
  "confidence": 0.85,
  "suggestion": "Great energy! Consider extending your walk or exploring a new route.",
  "insights": {
    "primaryFactors": ["walking_consistency", "energy_level", "time_of_day"],
    "recommendations": ["Try morning walks for better motivation"],
    "trendAnalysis": "Current motivation trend: high"
  },
  "recommendations": ["Try morning walks for better motivation"],
  "timestamp": 1705741800
}
```

### Model Information
```http
GET /model/info
```

## Integration with PaceMind App

1. **Update Environment Variable**
   ```env
   EXPO_PUBLIC_ML_API_URL=https://your-deployed-api.com
   ```

2. **Test Integration**
   ```bash
   npm test -- --testNamePattern="motivation-service"
   ```

3. **Deploy App**
   ```bash
   npx eas build --platform all
   ```

## Model Training

The API includes a synthetic data generator and Random Forest trainer:

```bash
# Generate training data and train model
python train_model.py
```

This creates:
- `motivation_model.joblib`: Trained Random Forest model
- `model_info.json`: Model metadata and performance metrics

## Performance

- **Response Time**: < 100ms for predictions
- **Accuracy**: ~85% on synthetic test data
- **Fallback Mode**: Always available when model fails
- **Caching**: Client-side caching reduces API calls

## Security

- **CORS**: Configured for cross-origin requests
- **Input Validation**: Pydantic models validate all inputs
- **Error Handling**: Graceful fallbacks for all error cases
- **Health Checks**: Built-in monitoring endpoints

## Monitoring

- **Health Endpoint**: `/health` for uptime monitoring
- **Logging**: Structured logging for debugging
- **Metrics**: Model performance and API usage tracking

## Troubleshooting

### Common Issues

1. **Model Not Loading**
   - Check `MODEL_PATH` environment variable
   - Ensure `motivation_model.joblib` exists
   - API will use fallback predictions

2. **CORS Errors**
   - Update CORS origins in `app.py`
   - Configure for your domain in production

3. **Deployment Failures**
   - Check platform-specific logs
   - Verify requirements.txt dependencies
   - Ensure port configuration matches platform

### Support

- Check API logs for detailed error messages
- Test endpoints individually using curl or Postman
- Verify environment variables are set correctly

## Development

### Adding Features

1. **New Endpoints**: Add to `app.py`
2. **Model Updates**: Retrain using `train_model.py`
3. **Testing**: Add tests for new functionality

### Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new features
4. Submit pull request

## License

MIT License - see LICENSE file for details.