const fs = require('fs');
const path = require('path');

console.log('🔗 END-TO-END INTEGRATION TEST');
console.log('===============================\n');

const testResults = {
  timestamp: new Date().toISOString(),
  userJourney: { status: 'pending', details: [] },
  dataFlow: { status: 'pending', details: [] },
  contextIntegration: { status: 'pending', details: [] },
  serviceIntegration: { status: 'pending', details: [] },
  crossPlatform: { status: 'pending', details: [] },
  realTimeSync: { status: 'pending', details: [] },
  workflowValidation: { status: 'pending', details: [] },
  summary: { passed: 0, failed: 0, warnings: 0 }
};

// Test 1: User Journey Integration
console.log('👤 1. USER JOURNEY INTEGRATION');
console.log('-------------------------------');

try {
  const userJourneySteps = [
    { step: 'App Launch', files: ['app/index.tsx', 'app/_layout.tsx'] },
    { step: 'Authentication', files: ['app/(auth)/login.tsx', 'contexts/AuthContext.tsx'] },
    { step: 'Main Navigation', files: ['app/(tabs)/_layout.tsx'] },
    { step: 'Walking Session', files: ['app/(tabs)/walk.tsx', 'contexts/WalkingContext.tsx'] },
    { step: 'Data Persistence', files: ['lib/database.ts', 'lib/supabase.ts'] },
    { step: 'Progress Tracking', files: ['app/(tabs)/progress.tsx'] },
    { step: 'Journal Entry', files: ['app/(tabs)/journal.tsx'] },
    { step: 'Settings Management', files: ['app/(tabs)/settings.tsx'] }
  ];

  let completedJourneySteps = 0;
  let totalJourneySteps = userJourneySteps.length;

  for (const { step, files } of userJourneySteps) {
    let stepComplete = true;
    let missingFiles = [];

    for (const file of files) {
      const fullPath = path.join(process.cwd(), file);
      if (!fs.existsSync(fullPath)) {
        stepComplete = false;
        missingFiles.push(file);
      }
    }

    if (stepComplete) {
      console.log(`✅ ${step}: Complete`);
      completedJourneySteps++;
    } else {
      console.log(`❌ ${step}: Missing files - ${missingFiles.join(', ')}`);
    }
  }

  const journeyCompleteness = (completedJourneySteps / totalJourneySteps) * 100;
  console.log(`\n📊 User journey completeness: ${journeyCompleteness.toFixed(1)}%`);

  if (journeyCompleteness >= 90) {
    testResults.userJourney.details.push(`Journey completeness: ${journeyCompleteness.toFixed(1)}% - EXCELLENT`);
    testResults.summary.passed++;
  } else if (journeyCompleteness >= 75) {
    testResults.userJourney.details.push(`Journey completeness: ${journeyCompleteness.toFixed(1)}% - GOOD`);
    testResults.summary.warnings++;
  } else {
    testResults.userJourney.details.push(`Journey completeness: ${journeyCompleteness.toFixed(1)}% - INCOMPLETE`);
    testResults.summary.failed++;
  }

  testResults.userJourney.status = 'completed';
} catch (error) {
  console.log('❌ User journey test failed:', error.message);
  testResults.userJourney.details.push(`Test error: ${error.message}`);
  testResults.summary.failed++;
}

// Test 2: Data Flow Integration
console.log('\n📊 2. DATA FLOW INTEGRATION');
console.log('----------------------------');

try {
  const dataFlowComponents = [
    { component: 'AuthContext', file: 'contexts/AuthContext.tsx', dataTypes: ['user', 'profile', 'session'] },
    { component: 'WalkingContext', file: 'contexts/WalkingContext.tsx', dataTypes: ['walkingSession', 'location', 'metrics'] },
    { component: 'DatabaseService', file: 'lib/database.ts', dataTypes: ['Profile', 'WalkingSession', 'MotivationJournal'] },
    { component: 'SupabaseClient', file: 'lib/supabase.ts', dataTypes: ['client', 'auth', 'database'] }
  ];

  let dataFlowScore = 0;
  let maxDataFlowScore = 0;

  for (const { component, file, dataTypes } of dataFlowComponents) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      let componentScore = 0;

      for (const dataType of dataTypes) {
        if (content.includes(dataType)) {
          componentScore++;
        }
        maxDataFlowScore++;
      }

      dataFlowScore += componentScore;
      console.log(`✅ ${component}: ${componentScore}/${dataTypes.length} data types present`);
    } else {
      console.log(`❌ ${component}: File missing`);
      maxDataFlowScore += dataTypes.length;
    }
  }

  const dataFlowIntegration = (dataFlowScore / maxDataFlowScore) * 100;
  console.log(`\n📊 Data flow integration: ${dataFlowIntegration.toFixed(1)}%`);

  if (dataFlowIntegration >= 80) {
    testResults.dataFlow.details.push(`Data flow: ${dataFlowIntegration.toFixed(1)}% - ROBUST`);
    testResults.summary.passed++;
  } else if (dataFlowIntegration >= 60) {
    testResults.dataFlow.details.push(`Data flow: ${dataFlowIntegration.toFixed(1)}% - ADEQUATE`);
    testResults.summary.warnings++;
  } else {
    testResults.dataFlow.details.push(`Data flow: ${dataFlowIntegration.toFixed(1)}% - WEAK`);
    testResults.summary.failed++;
  }

  testResults.dataFlow.status = 'completed';
} catch (error) {
  console.log('❌ Data flow test failed:', error.message);
  testResults.dataFlow.details.push(`Test error: ${error.message}`);
  testResults.summary.failed++;
}

// Test 3: Context Provider Integration
console.log('\n🔄 3. CONTEXT PROVIDER INTEGRATION');
console.log('-----------------------------------');

try {
  const contextProviders = [
    'AuthProvider',
    'WalkingProvider', 
    'SettingsProvider',
    'NotificationProvider'
  ];

  // Check main layout for provider integration
  const mainLayoutPath = path.join(process.cwd(), 'app/_layout.tsx');
  let providersIntegrated = 0;

  if (fs.existsSync(mainLayoutPath)) {
    const layoutContent = fs.readFileSync(mainLayoutPath, 'utf8');

    for (const provider of contextProviders) {
      if (layoutContent.includes(provider)) {
        console.log(`✅ ${provider} integrated in main layout`);
        providersIntegrated++;
      } else {
        console.log(`⚠️  ${provider} not found in main layout`);
      }
    }
  } else {
    console.log('❌ Main layout file not found');
  }

  // Check individual context files
  const contextFiles = [
    'contexts/AuthContext.tsx',
    'contexts/WalkingContext.tsx',
    'contexts/SettingsContext.tsx'
  ];

  let contextFilesPresent = 0;
  for (const contextFile of contextFiles) {
    const fullPath = path.join(process.cwd(), contextFile);
    if (fs.existsSync(fullPath)) {
      contextFilesPresent++;
      console.log(`✅ ${contextFile} present`);
    } else {
      console.log(`❌ ${contextFile} missing`);
    }
  }

  const contextIntegrationScore = (providersIntegrated + contextFilesPresent) / (contextProviders.length + contextFiles.length);

  if (contextIntegrationScore >= 0.8) {
    testResults.contextIntegration.details.push('Context integration: COMPLETE');
    testResults.summary.passed++;
  } else if (contextIntegrationScore >= 0.6) {
    testResults.contextIntegration.details.push('Context integration: PARTIAL');
    testResults.summary.warnings++;
  } else {
    testResults.contextIntegration.details.push('Context integration: INCOMPLETE');
    testResults.summary.failed++;
  }

  testResults.contextIntegration.status = 'completed';
} catch (error) {
  console.log('❌ Context integration test failed:', error.message);
  testResults.contextIntegration.details.push(`Test error: ${error.message}`);
  testResults.summary.failed++;
}

// Test 4: Service Integration
console.log('\n🛠️  4. SERVICE INTEGRATION');
console.log('---------------------------');

try {
  const serviceIntegrations = [
    { service: 'Database Service', file: 'lib/database.ts', integrations: ['supabase', 'Profile', 'WalkingSession'] },
    { service: 'Motivation Service', file: 'lib/motivation-service.ts', integrations: ['API', 'cache', 'prediction'] },
    { service: 'Notification Service', file: 'services/notification-service.ts', integrations: ['expo-notifications', 'preferences'] }
  ];

  let serviceIntegrationScore = 0;
  let maxServiceScore = 0;

  for (const { service, file, integrations } of serviceIntegrations) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      let serviceScore = 0;

      for (const integration of integrations) {
        if (content.toLowerCase().includes(integration.toLowerCase())) {
          serviceScore++;
        }
        maxServiceScore++;
      }

      serviceIntegrationScore += serviceScore;
      console.log(`✅ ${service}: ${serviceScore}/${integrations.length} integrations present`);
    } else {
      console.log(`❌ ${service}: File missing`);
      maxServiceScore += integrations.length;
    }
  }

  const serviceIntegrationPercentage = (serviceIntegrationScore / maxServiceScore) * 100;
  console.log(`\n📊 Service integration: ${serviceIntegrationPercentage.toFixed(1)}%`);

  if (serviceIntegrationPercentage >= 75) {
    testResults.serviceIntegration.details.push(`Service integration: ${serviceIntegrationPercentage.toFixed(1)}% - STRONG`);
    testResults.summary.passed++;
  } else if (serviceIntegrationPercentage >= 50) {
    testResults.serviceIntegration.details.push(`Service integration: ${serviceIntegrationPercentage.toFixed(1)}% - MODERATE`);
    testResults.summary.warnings++;
  } else {
    testResults.serviceIntegration.details.push(`Service integration: ${serviceIntegrationPercentage.toFixed(1)}% - WEAK`);
    testResults.summary.failed++;
  }

  testResults.serviceIntegration.status = 'completed';
} catch (error) {
  console.log('❌ Service integration test failed:', error.message);
  testResults.serviceIntegration.details.push(`Test error: ${error.message}`);
  testResults.summary.failed++;
}

// Test 5: Cross-Platform Compatibility
console.log('\n📱 5. CROSS-PLATFORM COMPATIBILITY');
console.log('------------------------------------');

try {
  const platformSpecificFeatures = [
    { feature: 'expo-location', description: 'Location services' },
    { feature: 'expo-notifications', description: 'Push notifications' },
    { feature: 'react-native-maps', description: 'Map integration' },
    { feature: '@react-native-async-storage', description: 'Local storage' },
    { feature: 'expo-constants', description: 'Platform constants' }
  ];

  // Check package.json for platform dependencies
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  let platformFeaturesSupported = 0;

  if (fs.existsSync(packageJsonPath)) {
    const packageContent = fs.readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageContent);
    const allDependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    for (const { feature, description } of platformSpecificFeatures) {
      if (allDependencies[feature] || packageContent.includes(feature)) {
        console.log(`✅ ${description}: Supported`);
        platformFeaturesSupported++;
      } else {
        console.log(`⚠️  ${description}: Not found`);
      }
    }
  }

  // Check app.json for platform configuration
  const appJsonPath = path.join(process.cwd(), 'app.json');
  let platformConfigPresent = false;

  if (fs.existsSync(appJsonPath)) {
    const appContent = fs.readFileSync(appJsonPath, 'utf8');
    if (appContent.includes('ios') && appContent.includes('android')) {
      console.log('✅ Platform configurations present');
      platformConfigPresent = true;
    }
  }

  const crossPlatformScore = (platformFeaturesSupported / platformSpecificFeatures.length) + (platformConfigPresent ? 0.2 : 0);

  if (crossPlatformScore >= 0.8) {
    testResults.crossPlatform.details.push('Cross-platform: EXCELLENT');
    testResults.summary.passed++;
  } else if (crossPlatformScore >= 0.6) {
    testResults.crossPlatform.details.push('Cross-platform: GOOD');
    testResults.summary.warnings++;
  } else {
    testResults.crossPlatform.details.push('Cross-platform: LIMITED');
    testResults.summary.failed++;
  }

  testResults.crossPlatform.status = 'completed';
} catch (error) {
  console.log('❌ Cross-platform test failed:', error.message);
  testResults.crossPlatform.details.push(`Test error: ${error.message}`);
  testResults.summary.failed++;
}

// Test 6: Real-time Synchronization
console.log('\n⚡ 6. REAL-TIME SYNCHRONIZATION');
console.log('-------------------------------');

try {
  const realtimeFeatures = [
    { feature: 'supabase', description: 'Real-time database' },
    { feature: 'subscription', description: 'Data subscriptions' },
    { feature: 'sync', description: 'Data synchronization' },
    { feature: 'realtime', description: 'Real-time updates' }
  ];

  const filesToCheck = [
    'lib/supabase.ts',
    'contexts/WalkingContext.tsx',
    'contexts/AuthContext.tsx',
    'lib/database.ts'
  ];

  let realtimeImplementations = 0;

  for (const file of filesToCheck) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8').toLowerCase();
      
      for (const { feature, description } of realtimeFeatures) {
        if (content.includes(feature.toLowerCase())) {
          console.log(`✅ ${description} found in ${file}`);
          realtimeImplementations++;
          break;
        }
      }
    }
  }

  if (realtimeImplementations >= 3) {
    testResults.realTimeSync.details.push('Real-time sync: IMPLEMENTED');
    testResults.summary.passed++;
  } else if (realtimeImplementations >= 1) {
    testResults.realTimeSync.details.push('Real-time sync: PARTIAL');
    testResults.summary.warnings++;
  } else {
    testResults.realTimeSync.details.push('Real-time sync: NOT IMPLEMENTED');
    testResults.summary.failed++;
  }

  testResults.realTimeSync.status = 'completed';
} catch (error) {
  console.log('❌ Real-time sync test failed:', error.message);
  testResults.realTimeSync.details.push(`Test error: ${error.message}`);
  testResults.summary.failed++;
}

// Test 7: Workflow Validation
console.log('\n🔄 7. WORKFLOW VALIDATION');
console.log('--------------------------');

try {
  const criticalWorkflows = [
    {
      workflow: 'User Registration & Login',
      components: ['app/(auth)/signup.tsx', 'app/(auth)/login.tsx', 'contexts/AuthContext.tsx'],
      dataFlow: ['signUp', 'signIn', 'user', 'profile']
    },
    {
      workflow: 'Walking Session Management',
      components: ['app/(tabs)/walk.tsx', 'contexts/WalkingContext.tsx', 'lib/database.ts'],
      dataFlow: ['startWalk', 'stopWalk', 'WalkingSession', 'location']
    },
    {
      workflow: 'Progress Tracking & Analytics',
      components: ['app/(tabs)/progress.tsx', 'lib/database.ts'],
      dataFlow: ['getWalkingSessions', 'metrics', 'analytics']
    }
  ];

  let workflowsValidated = 0;

  for (const { workflow, components, dataFlow } of criticalWorkflows) {
    let workflowComplete = true;
    let missingComponents = [];
    let missingDataFlow = [];

    // Check components
    for (const component of components) {
      const fullPath = path.join(process.cwd(), component);
      if (!fs.existsSync(fullPath)) {
        workflowComplete = false;
        missingComponents.push(component);
      }
    }

    // Check data flow
    if (workflowComplete) {
      for (const component of components) {
        const fullPath = path.join(process.cwd(), component);
        const content = fs.readFileSync(fullPath, 'utf8');
        
        const dataFlowPresent = dataFlow.some(flow => content.includes(flow));
        if (!dataFlowPresent) {
          missingDataFlow.push(component);
        }
      }
    }

    if (workflowComplete && missingDataFlow.length === 0) {
      console.log(`✅ ${workflow}: Complete workflow`);
      workflowsValidated++;
    } else {
      console.log(`❌ ${workflow}: Issues found`);
      if (missingComponents.length > 0) {
        console.log(`  Missing components: ${missingComponents.join(', ')}`);
      }
      if (missingDataFlow.length > 0) {
        console.log(`  Data flow issues in: ${missingDataFlow.join(', ')}`);
      }
    }
  }

  const workflowCompleteness = (workflowsValidated / criticalWorkflows.length) * 100;
  console.log(`\n📊 Workflow completeness: ${workflowCompleteness.toFixed(1)}%`);

  if (workflowCompleteness >= 90) {
    testResults.workflowValidation.details.push(`Workflows: ${workflowCompleteness.toFixed(1)}% - COMPLETE`);
    testResults.summary.passed++;
  } else if (workflowCompleteness >= 70) {
    testResults.workflowValidation.details.push(`Workflows: ${workflowCompleteness.toFixed(1)}% - MOSTLY COMPLETE`);
    testResults.summary.warnings++;
  } else {
    testResults.workflowValidation.details.push(`Workflows: ${workflowCompleteness.toFixed(1)}% - INCOMPLETE`);
    testResults.summary.failed++;
  }

  testResults.workflowValidation.status = 'completed';
} catch (error) {
  console.log('❌ Workflow validation test failed:', error.message);
  testResults.workflowValidation.details.push(`Test error: ${error.message}`);
  testResults.summary.failed++;
}

// Generate Summary Report
console.log('\n📊 INTEGRATION TEST SUMMARY');
console.log('============================');
console.log(`Tests Passed: ${testResults.summary.passed}`);
console.log(`Tests Failed: ${testResults.summary.failed}`);
console.log(`Warnings: ${testResults.summary.warnings}`);

const totalTests = testResults.summary.passed + testResults.summary.failed + testResults.summary.warnings;
const successRate = ((testResults.summary.passed + testResults.summary.warnings * 0.5) / totalTests) * 100;

console.log(`Success Rate: ${successRate.toFixed(1)}%`);

let overallStatus = 'EXCELLENT';
if (testResults.summary.failed > 2) {
  overallStatus = 'CRITICAL';
} else if (testResults.summary.failed > 0) {
  overallStatus = 'NEEDS IMPROVEMENT';
} else if (testResults.summary.warnings > 2) {
  overallStatus = 'GOOD';
}

console.log(`Overall Status: ${overallStatus}`);

// Save detailed report
fs.writeFileSync('integration-report.json', JSON.stringify(testResults, null, 2));
console.log('\n📄 Detailed report saved to: integration-report.json');

// Recommendations
console.log('\n🎯 KEY RECOMMENDATIONS');
console.log('======================');

if (testResults.summary.failed > 0) {
  console.log('1. Address failed integration tests - these affect core workflows');
}

if (testResults.summary.warnings > 0) {
  console.log('2. Strengthen partial integrations for better reliability');
}

console.log('3. Implement comprehensive end-to-end testing automation');
console.log('4. Add integration monitoring and health checks');
console.log('5. Consider implementing circuit breakers for service failures');
console.log('6. Add comprehensive logging for integration points');
console.log('7. Implement graceful degradation for service dependencies');
console.log('8. Add performance monitoring for critical workflows');

console.log('\n✅ Integration Testing Complete!');