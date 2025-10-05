const fs = require('fs');
const path = require('path');

// Validation Results
const results = {
  timestamp: new Date().toISOString(),
  routing: { status: 'pending', issues: [], recommendations: [] },
  database: { status: 'pending', issues: [], recommendations: [] },
  errorHandling: { status: 'pending', issues: [], recommendations: [] },
  functionality: { status: 'pending', issues: [], recommendations: [] },
  integration: { status: 'pending', issues: [], recommendations: [] },
  summary: { totalIssues: 0, criticalIssues: 0, warnings: 0 }
};

console.log('🔍 Starting Comprehensive Application Validation...');
console.log('================================================');

// 1. ROUTING VALIDATION
console.log('\n📍 1. ROUTING LOGIC VALIDATION');
console.log('--------------------------------');

try {
  // Check main layout structure
  const layoutPath = path.join(process.cwd(), 'app', '_layout.tsx');
  if (fs.existsSync(layoutPath)) {
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');
    
    // Check for required providers
    const requiredProviders = ['AuthProvider', 'WalkingProvider', 'SettingsProvider', 'NotificationProvider'];
    const missingProviders = requiredProviders.filter(provider => !layoutContent.includes(provider));
    
    if (missingProviders.length === 0) {
      console.log('✅ All required context providers found');
      results.routing.status = 'good';
    } else {
      console.log('⚠️  Missing providers:', missingProviders);
      results.routing.issues.push(`Missing providers: ${missingProviders.join(', ')}`);
      results.routing.status = 'warning';
    }
    
    // Check for proper Stack navigation setup
    if (layoutContent.includes('Stack.Screen') && layoutContent.includes('expo-router')) {
      console.log('✅ Expo Router navigation properly configured');
    } else {
      console.log('❌ Navigation configuration issues detected');
      results.routing.issues.push('Navigation configuration incomplete');
      results.routing.status = 'error';
    }
  } else {
    console.log('❌ Main layout file not found');
    results.routing.issues.push('Main layout file missing');
    results.routing.status = 'error';
  }

  // Check authentication routing
  const authLayoutPath = path.join(process.cwd(), 'app', '(auth)', '_layout.tsx');
  if (fs.existsSync(authLayoutPath)) {
    console.log('✅ Authentication routing structure exists');
  } else {
    console.log('⚠️  Authentication routing structure missing');
    results.routing.issues.push('Authentication routing missing');
  }

  // Check main app routing
  const tabsLayoutPath = path.join(process.cwd(), 'app', '(tabs)', '_layout.tsx');
  if (fs.existsSync(tabsLayoutPath)) {
    console.log('✅ Main app routing structure exists');
  } else {
    console.log('⚠️  Main app routing structure missing');
    results.routing.issues.push('Main app routing missing');
  }

} catch (error) {
  console.log('❌ Routing validation failed:', error.message);
  results.routing.issues.push(`Routing validation error: ${error.message}`);
  results.routing.status = 'error';
}

// 2. DATABASE VALIDATION
console.log('\n🗄️  2. DATABASE & API VALIDATION');
console.log('----------------------------------');

try {
  // Check Supabase configuration
  const supabasePath = path.join(process.cwd(), 'lib', 'supabase.ts');
  if (fs.existsSync(supabasePath)) {
    const supabaseContent = fs.readFileSync(supabasePath, 'utf8');
    
    if (supabaseContent.includes('EXPO_PUBLIC_SUPABASE_URL') && supabaseContent.includes('EXPO_PUBLIC_SUPABASE_ANON_KEY')) {
      console.log('✅ Supabase configuration structure correct');
      results.database.status = 'good';
    } else {
      console.log('⚠️  Supabase configuration incomplete');
      results.database.issues.push('Supabase environment variables not properly configured');
      results.database.status = 'warning';
    }
    
    if (supabaseContent.includes('isSupabaseConfigured')) {
      console.log('✅ Supabase configuration validation present');
    } else {
      console.log('⚠️  Missing Supabase configuration validation');
      results.database.recommendations.push('Add Supabase configuration validation');
    }
  } else {
    console.log('❌ Supabase configuration file not found');
    results.database.issues.push('Supabase configuration missing');
    results.database.status = 'error';
  }

  // Check database service
  const dbServicePath = path.join(process.cwd(), 'lib', 'database.ts');
  if (fs.existsSync(dbServicePath)) {
    const dbContent = fs.readFileSync(dbServicePath, 'utf8');
    
    // Check for proper error handling
    if (dbContent.includes('console.error') && dbContent.includes('try') && dbContent.includes('catch')) {
      console.log('✅ Database service has error handling');
    } else {
      console.log('⚠️  Database service error handling could be improved');
      results.database.recommendations.push('Enhance error handling in database service');
    }
    
    // Check for type definitions
    if (dbContent.includes('interface Profile') && dbContent.includes('interface WalkingSession')) {
      console.log('✅ Database type definitions present');
    } else {
      console.log('⚠️  Database type definitions incomplete');
      results.database.issues.push('Missing or incomplete type definitions');
    }
  } else {
    console.log('❌ Database service file not found');
    results.database.issues.push('Database service missing');
    results.database.status = 'error';
  }

} catch (error) {
  console.log('❌ Database validation failed:', error.message);
  results.database.issues.push(`Database validation error: ${error.message}`);
  results.database.status = 'error';
}

// 3. ERROR HANDLING VALIDATION
console.log('\n🛡️  3. ERROR HANDLING VALIDATION');
console.log('----------------------------------');

try {
  // Check for error boundary components
  const errorBoundaryPaths = [
    path.join(process.cwd(), 'components', 'ErrorBoundary.tsx'),
    path.join(process.cwd(), 'components', 'common', 'ErrorBoundary.tsx')
  ];
  
  let errorBoundaryFound = false;
  for (const errorPath of errorBoundaryPaths) {
    if (fs.existsSync(errorPath)) {
      console.log('✅ Error boundary component found');
      errorBoundaryFound = true;
      break;
    }
  }
  
  if (!errorBoundaryFound) {
    console.log('⚠️  No error boundary component found');
    results.errorHandling.recommendations.push('Add error boundary component for better error handling');
  }

  // Check AuthContext error handling
  const authContextPath = path.join(process.cwd(), 'contexts', 'AuthContext.tsx');
  if (fs.existsSync(authContextPath)) {
    const authContent = fs.readFileSync(authContextPath, 'utf8');
    
    if (authContent.includes('try') && authContent.includes('catch') && authContent.includes('throw')) {
      console.log('✅ AuthContext has proper error handling');
      results.errorHandling.status = 'good';
    } else {
      console.log('⚠️  AuthContext error handling could be improved');
      results.errorHandling.recommendations.push('Enhance error handling in AuthContext');
      results.errorHandling.status = 'warning';
    }
  }

} catch (error) {
  console.log('❌ Error handling validation failed:', error.message);
  results.errorHandling.issues.push(`Error handling validation error: ${error.message}`);
  results.errorHandling.status = 'error';
}

// 4. FUNCTIONALITY VALIDATION
console.log('\n⚙️  4. FUNCTIONALITY VALIDATION');
console.log('--------------------------------');

try {
  // Check core components
  const coreComponents = [
    'app/(tabs)/home.tsx',
    'app/(tabs)/walk.tsx',
    'app/(tabs)/journal.tsx',
    'app/(tabs)/progress.tsx',
    'app/(tabs)/settings.tsx'
  ];
  
  let foundComponents = 0;
  for (const component of coreComponents) {
    const componentPath = path.join(process.cwd(), component);
    if (fs.existsSync(componentPath)) {
      foundComponents++;
    }
  }
  
  console.log(`✅ Found ${foundComponents}/${coreComponents.length} core components`);
  
  if (foundComponents === coreComponents.length) {
    results.functionality.status = 'good';
  } else if (foundComponents >= coreComponents.length * 0.8) {
    results.functionality.status = 'warning';
    results.functionality.issues.push(`Missing ${coreComponents.length - foundComponents} core components`);
  } else {
    results.functionality.status = 'error';
    results.functionality.issues.push(`Critical: Missing ${coreComponents.length - foundComponents} core components`);
  }

  // Check services
  const services = [
    'services/NotificationService.ts',
    'services/WalkingService.ts',
    'services/MotivationService.ts'
  ];
  
  let foundServices = 0;
  for (const service of services) {
    const servicePath = path.join(process.cwd(), service);
    if (fs.existsSync(servicePath)) {
      foundServices++;
    }
  }
  
  console.log(`✅ Found ${foundServices}/${services.length} core services`);

} catch (error) {
  console.log('❌ Functionality validation failed:', error.message);
  results.functionality.issues.push(`Functionality validation error: ${error.message}`);
  results.functionality.status = 'error';
}

// 5. INTEGRATION VALIDATION
console.log('\n🔗 5. INTEGRATION VALIDATION');
console.log('-----------------------------');

try {
  // Check package.json for dependencies
  const packagePath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packagePath)) {
    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    const criticalDeps = [
      'expo-router',
      '@supabase/supabase-js',
      'react-native-safe-area-context',
      '@tanstack/react-query'
    ];
    
    const missingDeps = criticalDeps.filter(dep => 
      !packageContent.dependencies?.[dep] && !packageContent.devDependencies?.[dep]
    );
    
    if (missingDeps.length === 0) {
      console.log('✅ All critical dependencies present');
      results.integration.status = 'good';
    } else {
      console.log('⚠️  Missing dependencies:', missingDeps);
      results.integration.issues.push(`Missing dependencies: ${missingDeps.join(', ')}`);
      results.integration.status = 'warning';
    }
  }

} catch (error) {
  console.log('❌ Integration validation failed:', error.message);
  results.integration.issues.push(`Integration validation error: ${error.message}`);
  results.integration.status = 'error';
}

// SUMMARY
console.log('\n📊 VALIDATION SUMMARY');
console.log('=====================');

const allIssues = [
  ...results.routing.issues,
  ...results.database.issues,
  ...results.errorHandling.issues,
  ...results.functionality.issues,
  ...results.integration.issues
];

const criticalIssues = allIssues.filter(issue => 
  issue.includes('❌') || issue.includes('Critical') || issue.includes('missing')
);

results.summary.totalIssues = allIssues.length;
results.summary.criticalIssues = criticalIssues.length;
results.summary.warnings = allIssues.length - criticalIssues.length;

console.log(`Total Issues Found: ${results.summary.totalIssues}`);
console.log(`Critical Issues: ${results.summary.criticalIssues}`);
console.log(`Warnings: ${results.summary.warnings}`);

// Overall status
let overallStatus = 'good';
const statuses = [
  results.routing.status,
  results.database.status,
  results.errorHandling.status,
  results.functionality.status,
  results.integration.status
];

if (statuses.includes('error')) {
  overallStatus = 'error';
} else if (statuses.includes('warning')) {
  overallStatus = 'warning';
}

console.log(`\nOverall Status: ${overallStatus.toUpperCase()}`);

// Save detailed results
fs.writeFileSync('validation-report.json', JSON.stringify(results, null, 2));
console.log('\n📄 Detailed report saved to: validation-report.json');

console.log('\n🎯 RECOMMENDATIONS');
console.log('==================');

const allRecommendations = [
  ...results.routing.recommendations,
  ...results.database.recommendations,
  ...results.errorHandling.recommendations,
  ...results.functionality.recommendations,
  ...results.integration.recommendations
];

if (allRecommendations.length > 0) {
  allRecommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`);
  });
} else {
  console.log('No specific recommendations at this time.');
}

console.log('\n✅ Validation Complete!');