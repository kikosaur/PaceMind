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
- 🔐 **Secure Authentication** with Supabase Auth and Row Level Security
- 🎨 **Modern UI/UX** with consistent design system and responsive layouts

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18.0.0 or higher ([Install with nvm](https://github.com/nvm-sh/nvm))
- **npm** package manager (comes with Node.js)
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
   npm start
   
   # Platform-specific
   npm run ios     # iOS Simulator
   npm run android # Android Emulator
   ```

### Testing on Device

**Mobile Testing (Recommended)**
1. Install [Expo Go](https://expo.dev/client) on your device
2. Run `npm start`
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
   Run the provided SQL schema in your Supabase SQL Editor:
   ```bash
   # Use the setup-database.sql file
   # Located in the project root directory
   ```

   The schema includes:
   - **profiles** table with user preferences and stats
   - **walking_sessions** table for activity tracking
   - **motivation_journal** table for mood and energy logging
   - **user_goals** table for personalized targets
   - **Row Level Security (RLS)** policies for data protection
   - Performance indexes for optimal query speed

3. **Authentication Setup**
   - Supabase Auth is pre-configured
   - Supports email/password authentication
   - Includes secure session management
   - Row Level Security ensures data privacy

## 📱 Usage Guidelines

### Basic Workflow

1. **User Registration/Login**
   - Create account or sign in via Supabase Auth
   - Complete profile setup with walking preferences and personal metrics

2. **Start Walking Session**
   - Navigate to Walk tab
   - Tap "Start Walking" to begin GPS tracking
   - Monitor real-time metrics (distance, pace, steps, calories)

3. **Journal Entry**
   - After walking, record mood and energy levels
   - Add optional notes about the session
   - Receive AI-powered motivation insights

4. **Progress Monitoring**
   - View daily, weekly, and monthly statistics
   - Track goal achievement and trends
   - Analyze performance metrics and insights

### Advanced Features

**Performance Analytics**
- Real-time performance monitoring
- Automated alerts for performance issues
- Detailed metrics and KPI tracking
- Export capabilities for data analysis

**Custom Goal Setting**
- Daily step targets (customizable)
- Weekly distance goals
- Calorie burn objectives
- Pace improvement targets
- Progress tracking with visual indicators

**AI-Powered Insights**
- Motivation prediction based on historical data
- Personalized recommendations
- Mood correlation analysis
- Optimal walking time suggestions

## 🏗️ Technical Specifications

### System Requirements

**Mobile Development**
- **iOS**: iOS 13.0+ (iPhone 6s and newer)
- **Android**: Android 7.0+ (API level 24)
- **RAM**: Minimum 2GB, Recommended 4GB+
- **Storage**: 100MB app size, 500MB for data

**Development Environment**
- **Node.js**: 18.0.0+
- **npm**: Latest stable version
- **Expo SDK**: 53.0.23
- **React Native**: 0.79.5
- **TypeScript**: 5.8.3

### Key Dependencies

**Core Framework**
```json
{
  "expo": "~53.0.23",
  "react": "19.0.0",
  "react-native": "0.79.5",
  "expo-router": "~5.1.7"
}
```

**Essential Libraries**
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

### Architecture Overview

```
PaceMind App Architecture
├── Frontend (React Native + Expo)
│   ├── App Screens (/app)
│   │   ├── Authentication (login, signup, onboarding)
│   │   ├── Main Tabs (home, walk, journal, progress, settings)
│   │   └── Modals & Navigation
│   ├── Components (/components)
│   │   ├── Activity Metrics & Charts
│   │   ├── Motivation Insights
│   │   ├── UI Components (Button, forms, etc.)
│   │   └── Performance Monitoring
│   ├── Contexts (/contexts)
│   │   ├── AuthContext (Supabase Auth)
│   │   ├── WalkingContext (Activity State)
│   │   └── SettingsContext (User Preferences)
│   ├── Utils (/utils)
│   │   ├── Performance Monitoring
│   │   ├── Data Transformation
│   │   ├── Cache Management
│   │   └── Security Utilities
│   ├── Services (/services)
│   │   ├── Supabase Client
│   │   ├── ML API Integration
│   │   └── Data Synchronization
│   └── Tests (/__tests__)
├── Backend Services
│   ├── Supabase (Database + Auth + RLS)
│   └── ML API (FastAPI + scikit-learn)
└── Infrastructure
    ├── Expo Application Services (EAS)
    ├── Railway (ML API Hosting)
    └── Supabase Cloud
```

## 🧪 Testing

### Test Suite Overview

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test -- --testPathPattern=performance

# Watch mode for development
npm run test:watch
```

### Test Categories

**Unit Tests**
- Context providers and hooks
- Utility functions and data transformations
- Component rendering and interactions

**Integration Tests**
- API communication and error handling
- Database operations and synchronization
- Authentication flow testing

**Performance Tests**
- Memory usage and cleanup
- GPS accuracy and battery optimization
- Network request efficiency

## 🚀 Deployment

### Mobile App Deployment

**Prerequisites**
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to Expo account
eas login
```

**Production Builds**
```bash
# Configure build
eas build:configure

# Create production builds
eas build --platform ios --profile production
eas build --platform android --profile production

# Submit to app stores
eas submit --platform ios
eas submit --platform android
```

**Web Deployment**
```bash
# Build for web
npx expo export --platform web

# Deploy with EAS Hosting
eas hosting:configure
eas hosting:deploy
```

### ML API Deployment

The ML API can be deployed using Railway or Docker:

**Railway (Recommended)**
```bash
cd ml-api
railway login
railway init
railway up
```

**Docker Deployment**
```bash
# Build and run
docker build -t pacemind-ml-api ./ml-api
docker run -p 8000:8000 pacemind-ml-api
```

## 🔧 Troubleshooting

### Common Issues

**App Won't Start**
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npx expo start --clear
```

**GPS Tracking Issues**
- Ensure location permissions are granted
- Test in outdoor environment with clear sky view
- Check device location services are enabled
- Verify app has background location permission

**Database Connection Errors**
- Verify Supabase URL and anon key in `.env`
- Check network connectivity
- Ensure RLS policies are properly configured

**Build Failures**
```bash
# Clear Expo cache
npx expo start --clear

# Reset Metro bundler
npx expo start --reset-cache

# Check for TypeScript errors
npx tsc --noEmit
```

### Debug Mode

Enable comprehensive debugging:
```env
EXPO_PUBLIC_DEBUG_MODE=true
EXPO_PUBLIC_PERFORMANCE_MONITORING=true
```

## 🤝 Contributing

### Development Workflow

1. **Fork & Clone**
   ```bash
   git clone https://github.com/your-username/pacemind-app.git
   cd pacemind-app
   ```

2. **Setup Development Environment**
   ```bash
   npm install
   cp .env.example .env
   # Configure environment variables
   ```

3. **Code Standards**
   ```bash
   # Lint code
   npm run lint
   npm run lint:fix
   
   # Run tests
   npm test
   npm run test:coverage
   ```

### Code Style Guidelines

- Use TypeScript with strict type checking
- Follow React Native best practices
- Implement proper error handling
- Maintain test coverage above 70%
- Use consistent naming conventions

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

---

**PaceMind v1.2.0** - Transforming walking into an intelligent, data-driven wellness journey.
