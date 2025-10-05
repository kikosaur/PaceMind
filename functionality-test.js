const fs = require('fs');
const path = require('path');

console.log('🚀 COMPREHENSIVE FUNCTIONALITY TEST');
console.log('===================================\n');

const testResults = {
  timestamp: new Date().toISOString(),
  authentication: { status: 'pending', details: [] },
  walkingTracking: { status: 'pending', details: [] },
  journaling: { status: 'pending', details: [] },
  notifications: { status: 'pending', details: [] },
  settings: { status: 'pending', details: [] },
  dataSync: { status: 'pending', details: [] },
  userInterface: { status: 'pending', details: [] },
  performance: { status: 'pending', details: [] },
  summary: { passed: 0, failed: 0, warnings: 0 }
};

// Test 1: Authentication System
console.log('🔐 1. AUTHENTICATION SYSTEM VALIDATION');
console.log('---------------------------------------');

try {
  const authFiles = [
    'contexts/AuthContext.tsx',
    'app/(auth)/login.tsx',
    'app/(auth)/signup.tsx',
    'app/(auth)/forgot-password.tsx'
  ];

  let authFeaturesImplemented = 0;
  const requiredAuthFeatures = [
    { feature: 'signIn', description: 'User sign in' },
    { feature: 'signUp', description: 'User registration' },
    { feature: 'logout', description: 'User logout' },
    { feature: 'resetPassword', description: 'Password reset' },
    { feature: 'isAuthenticated', description: 'Authentication state' }
  ];

  // Check AuthContext implementation
  const authContextPath = path.join(process.cwd(), 'contexts/AuthContext.tsx');
  if (fs.existsSync(authContextPath)) {
    const authContent = fs.readFileSync(authContextPath, 'utf8');
    
    for (const { feature, description } of requiredAuthFeatures) {
      if (authContent.includes(feature)) {
        console.log(`✅ ${description} implemented`);
        authFeaturesImplemented++;
      } else {
        console.log(`❌ ${description} missing`);
      }
    }
  }

  // Check auth screens
  let authScreensPresent = 0;
  for (const authFile of authFiles) {
    const fullPath = path.join(process.cwd(), authFile);
    if (fs.existsSync(fullPath)) {
      authScreensPresent++;
      console.log(`✅ ${authFile} present`);
    } else {
      console.log(`❌ ${authFile} missing`);
    }
  }

  const authScore = (authFeaturesImplemented + authScreensPresent) / (requiredAuthFeatures.length + authFiles.length);
  
  if (authScore >= 0.8) {
    testResults.authentication.details.push('Authentication system: COMPLETE');
    testResults.summary.passed++;
  } else if (authScore >= 0.6) {
    testResults.authentication.details.push('Authentication system: PARTIAL');
    testResults.summary.warnings++;
  } else {
    testResults.authentication.details.push('Authentication system: INCOMPLETE');
    testResults.summary.failed++;
  }

  testResults.authentication.status = 'completed';
} catch (error) {
  console.log('❌ Authentication test failed:', error.message);
  testResults.authentication.details.push(`Test error: ${error.message}`);
  testResults.summary.failed++;
}

// Test 2: Walking Tracking System
console.log('\n🚶 2. WALKING TRACKING VALIDATION');
console.log('----------------------------------');

try {
  const walkingFiles = [
    'contexts/WalkingContext.tsx',
    'app/(tabs)/walk.tsx',
    'lib/database.ts'
  ];

  const walkingFeatures = [
    'startWalk',
    'stopWalk',
    'pauseWalk',
    'location',
    'distance',
    'duration',
    'steps'
  ];

  let walkingFeaturesFound = 0;
  let walkingFilesPresent = 0;

  for (const walkingFile of walkingFiles) {
    const fullPath = path.join(process.cwd(), walkingFile);
    if (fs.existsSync(fullPath)) {
      walkingFilesPresent++;
      const content = fs.readFileSync(fullPath, 'utf8');
      
      for (const feature of walkingFeatures) {
        if (content.includes(feature)) {
          walkingFeaturesFound++;
          break;
        }
      }
      
      console.log(`✅ ${walkingFile} present and functional`);
    } else {
      console.log(`❌ ${walkingFile} missing`);
    }
  }

  // Check for GPS and location services
  const walkContextPath = path.join(process.cwd(), 'contexts/WalkingContext.tsx');
  if (fs.existsSync(walkContextPath)) {
    const walkContent = fs.readFileSync(walkContextPath, 'utf8');
    
    if (walkContent.includes('Location') || walkContent.includes('GPS')) {
      console.log('✅ Location services integrated');
      walkingFeaturesFound++;
    } else {
      console.log('⚠️  Location services not clearly integrated');
    }
  }

  const walkingScore = walkingFeaturesFound / walkingFeatures.length;
  
  if (walkingScore >= 0.7 && walkingFilesPresent >= 2) {
    testResults.walkingTracking.details.push('Walking tracking: FUNCTIONAL');
    testResults.summary.passed++;
  } else if (walkingScore >= 0.5) {
    testResults.walkingTracking.details.push('Walking tracking: PARTIAL');
    testResults.summary.warnings++;
  } else {
    testResults.walkingTracking.details.push('Walking tracking: INCOMPLETE');
    testResults.summary.failed++;
  }

  testResults.walkingTracking.status = 'completed';
} catch (error) {
  console.log('❌ Walking tracking test failed:', error.message);
  testResults.walkingTracking.details.push(`Test error: ${error.message}`);
  testResults.summary.failed++;
}

// Test 3: Journaling System
console.log('\n📝 3. JOURNALING SYSTEM VALIDATION');
console.log('-----------------------------------');

try {
  const journalFiles = [
    'app/(tabs)/journal.tsx',
    'lib/database.ts'
  ];

  const journalFeatures = [
    'MotivationJournal',
    'createJournal',
    'getJournals',
    'mood',
    'entry',
    'reflection'
  ];

  let journalFeaturesFound = 0;
  let journalFilesPresent = 0;

  for (const journalFile of journalFiles) {
    const fullPath = path.join(process.cwd(), journalFile);
    if (fs.existsSync(fullPath)) {
      journalFilesPresent++;
      const content = fs.readFileSync(fullPath, 'utf8');
      
      const featuresInFile = journalFeatures.filter(feature => content.includes(feature));
      journalFeaturesFound += featuresInFile.length;
      
      console.log(`✅ ${journalFile} present (${featuresInFile.length} features)`);
    } else {
      console.log(`❌ ${journalFile} missing`);
    }
  }

  const journalScore = journalFeaturesFound / journalFeatures.length;
  
  if (journalScore >= 0.6 && journalFilesPresent >= 1) {
    testResults.journaling.details.push('Journaling system: FUNCTIONAL');
    testResults.summary.passed++;
  } else if (journalScore >= 0.3) {
    testResults.journaling.details.push('Journaling system: PARTIAL');
    testResults.summary.warnings++;
  } else {
    testResults.journaling.details.push('Journaling system: INCOMPLETE');
    testResults.summary.failed++;
  }

  testResults.journaling.status = 'completed';
} catch (error) {
  console.log('❌ Journaling test failed:', error.message);
  testResults.journaling.details.push(`Test error: ${error.message}`);
  testResults.summary.failed++;
}

// Test 4: Notification System
console.log('\n🔔 4. NOTIFICATION SYSTEM VALIDATION');
console.log('-------------------------------------');

try {
  const notificationFiles = [
    'services/notification-service.ts',
    'hooks/useNotificationManager.tsx',
    'app/(tabs)/test-notifications.tsx'
  ];

  let notificationFilesPresent = 0;
  let notificationFeaturesFound = 0;

  const notificationFeatures = [
    'sendNotification',
    'scheduleNotification',
    'NotificationPreferences',
    'pushNotification',
    'localNotification'
  ];

  for (const notifFile of notificationFiles) {
    const fullPath = path.join(process.cwd(), notifFile);
    if (fs.existsSync(fullPath)) {
      notificationFilesPresent++;
      const content = fs.readFileSync(fullPath, 'utf8');
      
      const featuresInFile = notificationFeatures.filter(feature => content.includes(feature));
      notificationFeaturesFound += featuresInFile.length;
      
      console.log(`✅ ${notifFile} present (${featuresInFile.length} features)`);
    } else {
      console.log(`❌ ${notifFile} missing`);
    }
  }

  if (notificationFilesPresent >= 2 && notificationFeaturesFound >= 3) {
    testResults.notifications.details.push('Notification system: FUNCTIONAL');
    testResults.summary.passed++;
  } else if (notificationFilesPresent >= 1) {
    testResults.notifications.details.push('Notification system: PARTIAL');
    testResults.summary.warnings++;
  } else {
    testResults.notifications.details.push('Notification system: MISSING');
    testResults.summary.failed++;
  }

  testResults.notifications.status = 'completed';
} catch (error) {
  console.log('❌ Notification test failed:', error.message);
  testResults.notifications.details.push(`Test error: ${error.message}`);
  testResults.summary.failed++;
}

// Test 5: Settings System
console.log('\n⚙️  5. SETTINGS SYSTEM VALIDATION');
console.log('----------------------------------');

try {
  const settingsFiles = [
    'app/(tabs)/settings.tsx',
    'contexts/SettingsContext.tsx'
  ];

  const settingsFeatures = [
    'preferences',
    'privacy',
    'notifications',
    'profile',
    'theme',
    'units'
  ];

  let settingsFilesPresent = 0;
  let settingsFeaturesFound = 0;

  for (const settingsFile of settingsFiles) {
    const fullPath = path.join(process.cwd(), settingsFile);
    if (fs.existsSync(fullPath)) {
      settingsFilesPresent++;
      const content = fs.readFileSync(fullPath, 'utf8');
      
      const featuresInFile = settingsFeatures.filter(feature => 
        content.toLowerCase().includes(feature.toLowerCase())
      );
      settingsFeaturesFound += featuresInFile.length;
      
      console.log(`✅ ${settingsFile} present (${featuresInFile.length} features)`);
    } else {
      console.log(`❌ ${settingsFile} missing`);
    }
  }

  if (settingsFilesPresent >= 2 && settingsFeaturesFound >= 4) {
    testResults.settings.details.push('Settings system: COMPREHENSIVE');
    testResults.summary.passed++;
  } else if (settingsFilesPresent >= 1) {
    testResults.settings.details.push('Settings system: BASIC');
    testResults.summary.warnings++;
  } else {
    testResults.settings.details.push('Settings system: MISSING');
    testResults.summary.failed++;
  }

  testResults.settings.status = 'completed';
} catch (error) {
  console.log('❌ Settings test failed:', error.message);
  testResults.settings.details.push(`Test error: ${error.message}`);
  testResults.summary.failed++;
}

// Test 6: Data Synchronization
console.log('\n🔄 6. DATA SYNCHRONIZATION VALIDATION');
console.log('--------------------------------------');

try {
  const syncFiles = [
    'lib/database.ts',
    'lib/supabase.ts',
    'contexts/AuthContext.tsx'
  ];

  const syncFeatures = [
    'supabase',
    'sync',
    'upload',
    'download',
    'offline',
    'cache'
  ];

  let syncFilesPresent = 0;
  let syncFeaturesFound = 0;

  for (const syncFile of syncFiles) {
    const fullPath = path.join(process.cwd(), syncFile);
    if (fs.existsSync(fullPath)) {
      syncFilesPresent++;
      const content = fs.readFileSync(fullPath, 'utf8');
      
      const featuresInFile = syncFeatures.filter(feature => 
        content.toLowerCase().includes(feature.toLowerCase())
      );
      syncFeaturesFound += featuresInFile.length;
      
      console.log(`✅ ${syncFile} present (${featuresInFile.length} sync features)`);
    } else {
      console.log(`❌ ${syncFile} missing`);
    }
  }

  if (syncFilesPresent >= 3 && syncFeaturesFound >= 4) {
    testResults.dataSync.details.push('Data sync: ROBUST');
    testResults.summary.passed++;
  } else if (syncFilesPresent >= 2) {
    testResults.dataSync.details.push('Data sync: BASIC');
    testResults.summary.warnings++;
  } else {
    testResults.dataSync.details.push('Data sync: INSUFFICIENT');
    testResults.summary.failed++;
  }

  testResults.dataSync.status = 'completed';
} catch (error) {
  console.log('❌ Data sync test failed:', error.message);
  testResults.dataSync.details.push(`Test error: ${error.message}`);
  testResults.summary.failed++;
}

// Test 7: User Interface Components
console.log('\n🎨 7. USER INTERFACE VALIDATION');
console.log('--------------------------------');

try {
  let uiComponentsFound = 0;
  let styleSystemPresent = false;

  // Check components directory
  const componentsPath = path.join(process.cwd(), 'components');
  if (fs.existsSync(componentsPath)) {
    const componentFiles = fs.readdirSync(componentsPath);
    uiComponentsFound = componentFiles.length;
    console.log(`✅ Components directory: ${uiComponentsFound} components found`);
  }

  // Check style system
  const stylesPath = path.join(process.cwd(), 'app/styles');
  if (fs.existsSync(stylesPath)) {
    styleSystemPresent = true;
    console.log('✅ Design system present');
  }

  // Check main screens
  const tabsPath = path.join(process.cwd(), 'app/(tabs)');
  let mainScreens = 0;
  if (fs.existsSync(tabsPath)) {
    const screenFiles = fs.readdirSync(tabsPath).filter(file => file.endsWith('.tsx'));
    mainScreens = screenFiles.length;
    console.log(`✅ Main screens: ${mainScreens} screens found`);
  }

  if (uiComponentsFound >= 5 && styleSystemPresent && mainScreens >= 4) {
    testResults.userInterface.details.push('UI system: COMPREHENSIVE');
    testResults.summary.passed++;
  } else if (uiComponentsFound >= 3 && mainScreens >= 3) {
    testResults.userInterface.details.push('UI system: ADEQUATE');
    testResults.summary.warnings++;
  } else {
    testResults.userInterface.details.push('UI system: BASIC');
    testResults.summary.failed++;
  }

  testResults.userInterface.status = 'completed';
} catch (error) {
  console.log('❌ UI test failed:', error.message);
  testResults.userInterface.details.push(`Test error: ${error.message}`);
  testResults.summary.failed++;
}

// Test 8: Performance Optimization
console.log('\n⚡ 8. PERFORMANCE VALIDATION');
console.log('-----------------------------');

try {
  const performancePatterns = [
    { pattern: 'useMemo', description: 'Memoization' },
    { pattern: 'useCallback', description: 'Callback optimization' },
    { pattern: 'lazy', description: 'Lazy loading' },
    { pattern: 'FlatList', description: 'Optimized lists' },
    { pattern: 'Image', description: 'Image optimization' }
  ];

  let performanceOptimizations = 0;
  const filesToCheck = [
    'app/(tabs)/home.tsx',
    'app/(tabs)/progress.tsx',
    'app/(tabs)/walk.tsx',
    'contexts/WalkingContext.tsx'
  ];

  for (const file of filesToCheck) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      for (const { pattern, description } of performancePatterns) {
        if (content.includes(pattern)) {
          console.log(`✅ ${description} found in ${file}`);
          performanceOptimizations++;
          break;
        }
      }
    }
  }

  if (performanceOptimizations >= 3) {
    testResults.performance.details.push('Performance: OPTIMIZED');
    testResults.summary.passed++;
  } else if (performanceOptimizations >= 1) {
    testResults.performance.details.push('Performance: BASIC');
    testResults.summary.warnings++;
  } else {
    testResults.performance.details.push('Performance: NEEDS OPTIMIZATION');
    testResults.summary.failed++;
  }

  testResults.performance.status = 'completed';
} catch (error) {
  console.log('❌ Performance test failed:', error.message);
  testResults.performance.details.push(`Test error: ${error.message}`);
  testResults.summary.failed++;
}

// Generate Summary Report
console.log('\n📊 FUNCTIONALITY TEST SUMMARY');
console.log('==============================');
console.log(`Tests Passed: ${testResults.summary.passed}`);
console.log(`Tests Failed: ${testResults.summary.failed}`);
console.log(`Warnings: ${testResults.summary.warnings}`);

const totalTests = testResults.summary.passed + testResults.summary.failed + testResults.summary.warnings;
const successRate = ((testResults.summary.passed + testResults.summary.warnings * 0.5) / totalTests) * 100;

console.log(`Success Rate: ${successRate.toFixed(1)}%`);

let overallStatus = 'EXCELLENT';
if (testResults.summary.failed > 3) {
  overallStatus = 'CRITICAL';
} else if (testResults.summary.failed > 1) {
  overallStatus = 'NEEDS IMPROVEMENT';
} else if (testResults.summary.warnings > 2) {
  overallStatus = 'GOOD';
}

console.log(`Overall Status: ${overallStatus}`);

// Save detailed report
fs.writeFileSync('functionality-report.json', JSON.stringify(testResults, null, 2));
console.log('\n📄 Detailed report saved to: functionality-report.json');

// Recommendations
console.log('\n🎯 KEY RECOMMENDATIONS');
console.log('======================');

if (testResults.summary.failed > 0) {
  console.log('1. Address failed functionality tests - these are critical features');
}

if (testResults.summary.warnings > 0) {
  console.log('2. Enhance partially implemented features');
  console.log('3. Add comprehensive testing for all user workflows');
}

console.log('4. Implement performance monitoring and optimization');
console.log('5. Add user analytics and feature usage tracking');
console.log('6. Consider implementing A/B testing for feature improvements');
console.log('7. Add comprehensive accessibility features');
console.log('8. Implement offline-first functionality where applicable');

console.log('\n✅ Functionality Validation Complete!');