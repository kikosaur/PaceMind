# PaceMind - AI-Powered Walking Companion

**Version:** 1.1.0  
**Platform:** Cross-platform mobile app (iOS, Android, Web)  
**Framework:** React Native with Expo Router  

PaceMind is an intelligent walking companion app that combines GPS tracking, AI-powered motivation prediction, and comprehensive health analytics to help users maintain an active lifestyle. The app features real-time walking metrics, mood journaling, personalized insights, and machine learning-driven recommendations.

## 🎯 Application Overview

### Core Purpose
PaceMind transforms walking into an engaging, data-driven experience by providing:
- **Real-time Activity Tracking**: GPS-based distance, pace, and route monitoring
- **AI Motivation Prediction**: Machine learning models that predict and enhance user motivation
- **Comprehensive Analytics**: Detailed performance metrics and progress tracking
- **Mood & Energy Journaling**: Emotional state tracking with correlation analysis
- **Personalized Insights**: Data-driven recommendations for improved walking habits

### Key Features
- 🚶‍♂️ **Advanced Walking Tracking** with GPS accuracy optimization
- 🧠 **AI-Powered Motivation System** using Random Forest ML models
- 📊 **Performance Analytics** with KPI monitoring and trend analysis
- 📝 **Mood Journaling** with energy level and motivation tracking
- 🎯 **Goal Setting & Progress Monitoring** with customizable targets
- 🔄 **Data Synchronization** via Supabase backend
- 📱 **Cross-Platform Support** for iOS, Android, and Web

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18.0.0 or higher ([Install with nvm](https://github.com/nvm-sh/nvm))
- **Expo CLI** (installed automatically with dependencies)
- **iOS Simulator** (macOS) or **Android Emulator** for testing

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/pacemind-app.git
   cd pacemind-app
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Configure required variables (see Configuration section)
   ```

4. **Start Development Server**
   ```bash
   # Web preview (recommended for initial testing)
   npm run web
   
   # Mobile development server
   npm run start
   
   # Platform-specific
   npm run ios     # iOS Simulator
   npm run android # Android Emulator
   ```

### Testing on Device

**Mobile Testing (Recommended)**
1. Install [Expo Go](https://expo.dev/client) on your device
2. Run `npm run start`
3. Scan the QR code with your device camera

**Web Testing**
- Access `http://localhost:8081` after running `npm run web`
- Note: Some native features may be limited in web preview

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Supabase Configuration (Required)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# ML API Configuration (Optional - fallback mode available)
EXPO_PUBLIC_ML_API_URL=https://your-ml-api.railway.app

# Development Configuration
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_DEBUG_MODE=true

# Performance Monitoring (Optional)
EXPO_PUBLIC_PERFORMANCE_MONITORING=true
EXPO_PUBLIC_ANALYTICS_ENABLED=false
```

### Supabase Setup

1. **Create Supabase Project**
   - Visit [supabase.com](https://supabase.com)
   - Create new project
   - Note your project URL and anon key

2. **Database Schema**
   ```sql
   -- Run in Supabase SQL Editor
   -- See docs/supabase-setup.md for complete schema
   
   -- Users table (extends auth.users)
   CREATE TABLE public.user_profiles (
     id UUID REFERENCES auth.users PRIMARY KEY,
     name TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   
   -- Walking sessions
   CREATE TABLE public.walking_sessions (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID REFERENCES auth.users NOT NULL,
     start_time TIMESTAMP WITH TIME ZONE NOT NULL,
     end_time TIMESTAMP WITH TIME ZONE,
     distance DECIMAL(10,3),
     steps INTEGER,
     duration INTEGER,
     calories_burned INTEGER,
     status TEXT DEFAULT 'active'
   );
   
   -- Motivation journal
   CREATE TABLE public.motivation_journal (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID REFERENCES auth.users NOT NULL,
     date DATE NOT NULL,
     mood TEXT NOT NULL,
     energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
     motivation INTEGER CHECK (motivation >= 0 AND motivation <= 100),
     notes TEXT
   );
   ```

3. **Row Level Security (RLS)**
   ```sql
   -- Enable RLS on all tables
   ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.walking_sessions ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.motivation_journal ENABLE ROW LEVEL SECURITY;
   
   -- Create policies (users can only access their own data)
   CREATE POLICY "Users can view own profile" ON public.user_profiles
     FOR SELECT USING (auth.uid() = id);
   
   CREATE POLICY "Users can view own sessions" ON public.walking_sessions
     FOR ALL USING (auth.uid() = user_id);
   
   CREATE POLICY "Users can view own journal" ON public.motivation_journal
     FOR ALL USING (auth.uid() = user_id);
   ```

### ML API Setup (Optional)

The app includes a FastAPI-based ML service for advanced motivation prediction:

1. **Deploy ML API**
   ```bash
   cd ml-api
   
   # Railway deployment (recommended)
   railway login
   railway init
   railway up
   
   # Or Docker deployment
   docker build -t pacemind-ml-api .
   docker run -p 8000:8000 pacemind-ml-api
   ```

2. **Update Environment**
   ```env
   EXPO_PUBLIC_ML_API_URL=https://your-ml-api.railway.app
   ```

## 📱 Usage Guidelines

### Basic Workflow

1. **User Registration/Login**
   - Create account or sign in via Supabase Auth
   - Complete profile setup with walking preferences

2. **Start Walking Session**
   - Navigate to Walk tab
   - Tap "Start Walking" to begin GPS tracking
   - Monitor real-time metrics (distance, pace, steps)

3. **Journal Entry**
   - After walking, record mood and energy levels
   - Add optional notes about the session
   - Receive AI-powered motivation insights

4. **Progress Monitoring**
   - View daily, weekly, and monthly statistics
   - Track goal achievement and trends
   - Analyze performance metrics and KPIs

### Advanced Features

**Performance Analytics**
```typescript
// Access performance data programmatically
import { PerformanceMonitor } from '@/utils/performance';

const monitor = PerformanceMonitor.getInstance();
const metrics = await monitor.getPerformanceMetrics();
const alerts = await monitor.getActiveAlerts();
```

**Custom Goal Setting**
- Daily step targets (default: 10,000 steps)
- Weekly distance goals (default: 25km)
- Calorie burn objectives
- Pace improvement targets

**Data Export**
```typescript
// Export walking data
import { useWalking } from '@/contexts/WalkingContext';

const { exportWalkingData } = useWalking();
const csvData = await exportWalkingData('csv', dateRange);
```

## 🏗️ Technical Specifications

### System Requirements

**Mobile Development**
- **iOS**: iOS 13.0+ (iPhone 6s and newer)
- **Android**: Android 7.0+ (API level 24)
- **RAM**: Minimum 2GB, Recommended 4GB+
- **Storage**: 100MB app size, 500MB for data

**Development Environment**
- **Node.js**: 18.0.0+
- **Bun**: Latest stable version
- **Expo SDK**: 53.0.23
- **React Native**: 0.79.5
- **TypeScript**: 5.8.3

### Dependencies

**Core Framework**
```json
{
  "expo": "~53.0.23",
  "react": "19.0.0",
  "react-native": "0.79.5",
  "expo-router": "~5.1.7"
}
```

**Key Libraries**
```json
{
  "@supabase/supabase-js": "^2.58.0",
  "@tanstack/react-query": "^5.83.0",
  "@react-native-async-storage/async-storage": "2.1.2",
  "expo-location": "~18.1.6",
  "expo-sensors": "~14.1.4",
  "lucide-react-native": "^0.544.0",
  "zustand": "^5.0.2"
}
```

**Development Tools**
```json
{
  "typescript": "~5.8.3",
  "jest": "^30.2.0",
  "@testing-library/react-native": "^13.3.3",
  "eslint": "^9.31.0"
}
```

### Architecture Overview

```
PaceMind App Architecture
├── Frontend (React Native + Expo)
│   ├── App Screens (/app)
│   │   ├── Authentication (login, signup)
│   │   ├── Main Tabs (home, walk, journal, progress, settings)
│   │   └── Modals & Navigation
│   ├── Components (/components)
│   │   ├── Activity Metrics & Charts
│   │   ├── Motivation Insights
│   │   └── UI Components
│   ├── Contexts (/contexts)
│   │   ├── AuthContext (Supabase Auth)
│   │   ├── WalkingContext (Activity State)
│   │   └── SettingsContext (User Preferences)
│   ├── Utils (/utils)
│   │   ├── Performance Monitoring
│   │   ├── Data Transformation
│   │   └── Cache Management
│   └── Tests (/__tests__)
├── Backend Services
│   ├── Supabase (Database + Auth)
│   └── ML API (FastAPI + scikit-learn)
└── Infrastructure
    ├── Expo Application Services (EAS)
    ├── Railway (ML API Hosting)
    └── Supabase Cloud
```

### Performance Optimizations

**GPS Accuracy Enhancement**
- Kalman filtering for location smoothing
- Dynamic accuracy thresholds based on conditions
- Fallback to step-based distance calculation

**Memory Management**
- Automatic data cleanup for old sessions
- Efficient state management with Zustand
- Image optimization and lazy loading

**Network Optimization**
- Request batching and caching
- Offline-first data synchronization
- Compression for API communications

## 🔌 API Reference

### Walking Context API

```typescript
interface WalkingContextType {
  // State
  isWalking: boolean;
  currentWalk: WalkingSession | null;
  todayStats: DailyStats;
  
  // Actions
  startWalk(): Promise<void>;
  pauseWalk(): void;
  resumeWalk(): void;
  stopWalk(): Promise<void>;
  
  // Data
  addJournalEntry(entry: JournalEntry): Promise<void>;
  predictMotivation(force?: boolean): Promise<void>;
  exportWalkingData(format: 'csv' | 'json'): Promise<string>;
}
```

### Performance Monitor API

```typescript
interface PerformanceMonitor {
  // Metrics
  recordAPICall(endpoint: string, duration: number, success: boolean): void;
  getPerformanceMetrics(): Promise<PerformanceMetrics>;
  
  // Alerts
  getActiveAlerts(): Promise<PerformanceAlert[]>;
  subscribeToAlerts(callback: (alert: PerformanceAlert) => void): void;
  
  // Optimization
  getOptimizationRecommendations(): Promise<OptimizationRecommendation[]>;
  exportMetrics(format: 'csv' | 'json'): Promise<string>;
}
```

### ML API Endpoints

**Health Check**
```http
GET /health
Response: {
  "status": "healthy",
  "model_status": "loaded",
  "timestamp": "2024-01-20T10:30:00"
}
```

**Motivation Prediction**
```http
POST /predict
Content-Type: application/json

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
    "motivation": 75
  }
}

Response: {
  "motivation_state": "high",
  "confidence": 0.85,
  "suggestion": "Great energy! Consider extending your walk.",
  "recommendations": ["Try morning walks for better motivation"]
}
```

## 🧪 Testing

### Test Suite Overview

```bash
# Run all tests
bun run test

# Run with coverage
bun run test:coverage

# Run specific test suites
bun run test:motivation
bun run test -- --testPathPattern=performance

# Watch mode for development
bun run test:watch
```

### Test Categories

**Unit Tests**
- Context providers and hooks
- Utility functions and data transformations
- Component rendering and interactions

**Integration Tests**
- API communication and error handling
- Database operations and synchronization
- ML model integration and fallback modes

**Performance Tests**
- Memory usage and cleanup
- GPS accuracy and battery optimization
- Network request efficiency

### Coverage Requirements

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70
  }
}
```

## 🚀 Deployment

### Mobile App Deployment

**Prerequisites**
```bash
# Install EAS CLI
bun install -g @expo/eas-cli

# Login to Expo account
eas login
```

**iOS App Store**
```bash
# Configure build
eas build:configure

# Create production build
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

**Google Play Store**
```bash
# Create Android build
eas build --platform android --profile production

# Submit to Google Play
eas submit --platform android
```

**Web Deployment**
```bash
# Build for web
eas build --platform web

# Deploy with EAS Hosting
eas hosting:configure
eas hosting:deploy

# Alternative: Deploy to Vercel/Netlify
npx expo export:web
```

### ML API Deployment

**Railway (Recommended)**
```bash
cd ml-api
railway login
railway init
railway up
```

**Docker Deployment**
```bash
# Build image
docker build -t pacemind-ml-api ./ml-api

# Run container
docker run -p 8000:8000 \
  -e MODEL_PATH=/app/models/motivation_model.joblib \
  pacemind-ml-api
```

**Environment Variables for Production**
```env
# ML API
MODEL_PATH=/app/models/motivation_model.joblib
PORT=8000
CORS_ORIGINS=https://your-app-domain.com

# App
EXPO_PUBLIC_ML_API_URL=https://your-ml-api.railway.app
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-production-key
```

## 🔧 Troubleshooting

### Common Issues

**App Won't Start**
```bash
# Clear cache and reinstall
rm -rf node_modules
bun install
bunx expo start --clear
```

**GPS Tracking Issues**
- Ensure location permissions are granted
- Test in outdoor environment with clear sky view
- Check device location services are enabled
- Verify app has background location permission (iOS/Android)

**Database Connection Errors**
```typescript
// Check Supabase configuration
import { supabase } from '@/lib/supabase';

const testConnection = async () => {
  const { data, error } = await supabase.auth.getSession();
  console.log('Supabase connection:', { data, error });
};
```

**ML API Integration Issues**
```bash
# Test ML API connectivity
curl -X GET https://your-ml-api.railway.app/health

# Check prediction endpoint
curl -X POST https://your-ml-api.railway.app/predict \
  -H "Content-Type: application/json" \
  -d '{"walking":{"steps":5000},"context":{},"journal":{}}'
```

**Build Failures**
```bash
# Clear Expo cache
bunx expo start --clear

# Reset Metro bundler
bunx expo start --reset-cache

# Check for TypeScript errors
bunx tsc --noEmit
```

### Performance Issues

**Memory Leaks**
- Monitor component unmounting and cleanup
- Check for unsubscribed event listeners
- Verify AsyncStorage cleanup in DataCleanupManager

**Battery Optimization**
- Adjust GPS update frequency in production
- Implement intelligent background processing
- Use device motion sensors as GPS fallback

**Network Optimization**
- Enable request batching in PerformanceOptimizer
- Implement proper caching strategies
- Use compression for large data transfers

### Debug Mode

Enable comprehensive debugging:
```env
EXPO_PUBLIC_DEBUG_MODE=true
EXPO_PUBLIC_PERFORMANCE_MONITORING=true
```

Access debug information:
```typescript
import { PerformanceMonitor } from '@/utils/performance';

// View performance metrics
const metrics = await PerformanceMonitor.getInstance().getPerformanceMetrics();
console.log('Performance Debug:', metrics);
```

## 🤝 Contributing

### Development Workflow

1. **Fork & Clone**
   ```bash
   git clone https://github.com/your-username/pacemind-app.git
   cd pacemind-app
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Development Setup**
   ```bash
   bun install
   cp .env.example .env
   # Configure environment variables
   ```

4. **Code Standards**
   ```bash
   # Lint code
   bun run lint
   bun run lint:fix
   
   # Run tests
   bun run test
   bun run test:coverage
   ```

5. **Commit & Push**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   git push origin feature/your-feature-name
   ```

### Code Style Guidelines

**TypeScript Standards**
- Use strict type checking
- Prefer interfaces over types for object shapes
- Implement proper error handling with try/catch
- Use async/await over Promise chains

**React Native Best Practices**
- Implement proper component lifecycle management
- Use React hooks appropriately
- Optimize re-renders with useMemo/useCallback
- Follow accessibility guidelines

**Testing Requirements**
- Write unit tests for all utility functions
- Include integration tests for API interactions
- Maintain minimum 70% code coverage
- Test error scenarios and edge cases

### Pull Request Process

1. **Pre-submission Checklist**
   - [ ] All tests pass (`bun run test`)
   - [ ] Code coverage meets requirements
   - [ ] Linting passes (`bun run lint`)
   - [ ] TypeScript compilation succeeds
   - [ ] Manual testing completed

2. **PR Description Template**
   ```markdown
   ## Description
   Brief description of changes
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update
   
   ## Testing
   - [ ] Unit tests added/updated
   - [ ] Integration tests pass
   - [ ] Manual testing completed
   
   ## Screenshots (if applicable)
   ```

3. **Review Process**
   - Code review by maintainers
   - Automated testing via CI/CD
   - Manual testing on multiple devices
   - Documentation updates if needed

### Issue Reporting

**Bug Reports**
```markdown
## Bug Description
Clear description of the issue

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Device: iPhone 14 Pro / Pixel 7
- OS Version: iOS 17.0 / Android 13
- App Version: 1.1.0
```

**Feature Requests**
```markdown
## Feature Description
Clear description of the proposed feature

## Use Case
Why is this feature needed?

## Proposed Solution
How should this feature work?

## Alternatives Considered
Other approaches considered
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Expo Team** for the excellent React Native framework
- **Supabase** for backend-as-a-service platform
- **scikit-learn** for machine learning capabilities
- **React Native Community** for comprehensive ecosystem

## 📞 Support

- **Documentation**: [GitHub Wiki](https://github.com/your-username/pacemind-app/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-username/pacemind-app/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/pacemind-app/discussions)
- **Email**: support@pacemind.app

---

**PaceMind v1.1.0** - Transforming walking into an intelligent, data-driven wellness journey.
