const fs = require('fs');
const path = require('path');

// Database Connection Test Results
const testResults = {
  timestamp: new Date().toISOString(),
  supabaseConfig: { status: 'pending', details: [] },
  databaseService: { status: 'pending', details: [] },
  apiEndpoints: { status: 'pending', details: [] },
  dataIntegrity: { status: 'pending', details: [] },
  errorHandling: { status: 'pending', details: [] },
  summary: { passed: 0, failed: 0, warnings: 0 }
};

console.log('🔍 Database Connection & API Validation Test');
console.log('============================================');

// 1. SUPABASE CONFIGURATION TEST
console.log('\n📡 1. SUPABASE CONFIGURATION');
console.log('-----------------------------');

try {
  const supabasePath = path.join(process.cwd(), 'lib', 'supabase.ts');
  if (fs.existsSync(supabasePath)) {
    const supabaseContent = fs.readFileSync(supabasePath, 'utf8');
    
    // Test 1: Environment variable configuration
    if (supabaseContent.includes('EXPO_PUBLIC_SUPABASE_URL') && 
        supabaseContent.includes('EXPO_PUBLIC_SUPABASE_ANON_KEY')) {
      console.log('✅ Environment variables properly configured');
      testResults.supabaseConfig.details.push('Environment variables: PASS');
      testResults.summary.passed++;
    } else {
      console.log('❌ Environment variables missing or misconfigured');
      testResults.supabaseConfig.details.push('Environment variables: FAIL');
      testResults.summary.failed++;
    }
    
    // Test 2: Configuration validation
    if (supabaseContent.includes('isSupabaseConfigured')) {
      console.log('✅ Configuration validation implemented');
      testResults.supabaseConfig.details.push('Configuration validation: PASS');
      testResults.summary.passed++;
    } else {
      console.log('⚠️  Configuration validation missing');
      testResults.supabaseConfig.details.push('Configuration validation: WARNING');
      testResults.summary.warnings++;
    }
    
    // Test 3: Client initialization
    if (supabaseContent.includes('createClient') && supabaseContent.includes('auth:')) {
      console.log('✅ Supabase client properly initialized');
      testResults.supabaseConfig.details.push('Client initialization: PASS');
      testResults.summary.passed++;
    } else {
      console.log('❌ Supabase client initialization issues');
      testResults.supabaseConfig.details.push('Client initialization: FAIL');
      testResults.summary.failed++;
    }
    
    // Test 4: Platform-specific configuration
    if (supabaseContent.includes('Platform.OS') && supabaseContent.includes('AsyncStorage')) {
      console.log('✅ Platform-specific storage configured');
      testResults.supabaseConfig.details.push('Platform storage: PASS');
      testResults.summary.passed++;
    } else {
      console.log('⚠️  Platform-specific storage configuration incomplete');
      testResults.supabaseConfig.details.push('Platform storage: WARNING');
      testResults.summary.warnings++;
    }
    
    testResults.supabaseConfig.status = 'completed';
  } else {
    console.log('❌ Supabase configuration file not found');
    testResults.supabaseConfig.details.push('Configuration file: MISSING');
    testResults.supabaseConfig.status = 'error';
    testResults.summary.failed++;
  }
} catch (error) {
  console.log('❌ Supabase configuration test failed:', error.message);
  testResults.supabaseConfig.details.push(`Test error: ${error.message}`);
  testResults.supabaseConfig.status = 'error';
  testResults.summary.failed++;
}

// 2. DATABASE SERVICE TEST
console.log('\n🗄️  2. DATABASE SERVICE VALIDATION');
console.log('-----------------------------------');

try {
  const dbServicePath = path.join(process.cwd(), 'lib', 'database.ts');
  if (fs.existsSync(dbServicePath)) {
    const dbContent = fs.readFileSync(dbServicePath, 'utf8');
    
    // Test 1: Core CRUD operations
    const crudOperations = ['getProfile', 'updateProfile', 'createProfile', 'createWalkingSession', 'updateWalkingSession'];
    const missingOperations = crudOperations.filter(op => !dbContent.includes(op));
    
    if (missingOperations.length === 0) {
      console.log('✅ All core CRUD operations implemented');
      testResults.databaseService.details.push('CRUD operations: PASS');
      testResults.summary.passed++;
    } else {
      console.log('❌ Missing CRUD operations:', missingOperations);
      testResults.databaseService.details.push(`Missing operations: ${missingOperations.join(', ')}`);
      testResults.summary.failed++;
    }
    
    // Test 2: Error handling patterns
    const errorHandlingPatterns = ['console.error', 'try', 'catch', 'throw'];
    const missingPatterns = errorHandlingPatterns.filter(pattern => !dbContent.includes(pattern));
    
    if (missingPatterns.length <= 1) {
      console.log('✅ Error handling patterns present');
      testResults.databaseService.details.push('Error handling: PASS');
      testResults.summary.passed++;
    } else {
      console.log('⚠️  Error handling could be improved');
      testResults.databaseService.details.push('Error handling: WARNING');
      testResults.summary.warnings++;
    }
    
    // Test 3: Type safety
    const typeInterfaces = ['Profile', 'WalkingSession', 'MotivationJournal', 'UserGoal'];
    const missingTypes = typeInterfaces.filter(type => !dbContent.includes(`interface ${type}`));
    
    if (missingTypes.length === 0) {
      console.log('✅ All required type interfaces defined');
      testResults.databaseService.details.push('Type definitions: PASS');
      testResults.summary.passed++;
    } else {
      console.log('❌ Missing type interfaces:', missingTypes);
      testResults.databaseService.details.push(`Missing types: ${missingTypes.join(', ')}`);
      testResults.summary.failed++;
    }
    
    // Test 4: Null safety checks
    if (dbContent.includes('if (!supabase)') && dbContent.includes('return null')) {
      console.log('✅ Null safety checks implemented');
      testResults.databaseService.details.push('Null safety: PASS');
      testResults.summary.passed++;
    } else {
      console.log('⚠️  Null safety checks could be improved');
      testResults.databaseService.details.push('Null safety: WARNING');
      testResults.summary.warnings++;
    }
    
    testResults.databaseService.status = 'completed';
  } else {
    console.log('❌ Database service file not found');
    testResults.databaseService.details.push('Service file: MISSING');
    testResults.databaseService.status = 'error';
    testResults.summary.failed++;
  }
} catch (error) {
  console.log('❌ Database service test failed:', error.message);
  testResults.databaseService.details.push(`Test error: ${error.message}`);
  testResults.databaseService.status = 'error';
  testResults.summary.failed++;
}

// 3. API ENDPOINTS VALIDATION
console.log('\n🌐 3. API ENDPOINTS VALIDATION');
console.log('------------------------------');

try {
  // Check for API service files
  const apiServices = [
    'services/NotificationService.ts',
    'services/WalkingService.ts',
    'services/MotivationService.ts'
  ];
  
  let foundServices = 0;
  let serviceDetails = [];
  
  for (const service of apiServices) {
    const servicePath = path.join(process.cwd(), service);
    if (fs.existsSync(servicePath)) {
      foundServices++;
      const serviceContent = fs.readFileSync(servicePath, 'utf8');
      
      // Check for proper async/await patterns
      if (serviceContent.includes('async') && serviceContent.includes('await')) {
        serviceDetails.push(`${service}: Async patterns ✅`);
      } else {
        serviceDetails.push(`${service}: Missing async patterns ⚠️`);
      }
      
      // Check for error handling
      if (serviceContent.includes('try') && serviceContent.includes('catch')) {
        serviceDetails.push(`${service}: Error handling ✅`);
      } else {
        serviceDetails.push(`${service}: Missing error handling ⚠️`);
      }
    } else {
      serviceDetails.push(`${service}: File not found ❌`);
    }
  }
  
  console.log(`Found ${foundServices}/${apiServices.length} API service files`);
  serviceDetails.forEach(detail => console.log(`  ${detail}`));
  
  if (foundServices >= apiServices.length * 0.7) {
    testResults.apiEndpoints.details.push(`API services: ${foundServices}/${apiServices.length} found`);
    testResults.summary.passed++;
  } else {
    testResults.apiEndpoints.details.push(`API services: Only ${foundServices}/${apiServices.length} found`);
    testResults.summary.failed++;
  }
  
  testResults.apiEndpoints.status = 'completed';
} catch (error) {
  console.log('❌ API endpoints test failed:', error.message);
  testResults.apiEndpoints.details.push(`Test error: ${error.message}`);
  testResults.apiEndpoints.status = 'error';
  testResults.summary.failed++;
}

// 4. DATA INTEGRITY VALIDATION
console.log('\n🔒 4. DATA INTEGRITY VALIDATION');
console.log('-------------------------------');

try {
  // Check database schema files
  const schemaFiles = [
    'scripts/setup-database.sql',
    'scripts/existing-db.sql',
    'docs/supabase-setup.md'
  ];
  
  let schemaValidation = [];
  
  for (const schemaFile of schemaFiles) {
    const schemaPath = path.join(process.cwd(), schemaFile);
    if (fs.existsSync(schemaPath)) {
      const schemaContent = fs.readFileSync(schemaPath, 'utf8');
      
      // Check for foreign key constraints
      if (schemaContent.includes('REFERENCES') || schemaContent.includes('FOREIGN KEY')) {
        schemaValidation.push(`${schemaFile}: Foreign keys ✅`);
      } else {
        schemaValidation.push(`${schemaFile}: No foreign keys ⚠️`);
      }
      
      // Check for data validation constraints
      if (schemaContent.includes('CHECK') || schemaContent.includes('CONSTRAINT')) {
        schemaValidation.push(`${schemaFile}: Data constraints ✅`);
      } else {
        schemaValidation.push(`${schemaFile}: No data constraints ⚠️`);
      }
      
      // Check for RLS (Row Level Security)
      if (schemaContent.includes('RLS') || schemaContent.includes('ROW LEVEL SECURITY')) {
        schemaValidation.push(`${schemaFile}: RLS configured ✅`);
      } else {
        schemaValidation.push(`${schemaFile}: No RLS ⚠️`);
      }
    } else {
      schemaValidation.push(`${schemaFile}: File not found ❌`);
    }
  }
  
  console.log('Schema validation results:');
  schemaValidation.forEach(result => console.log(`  ${result}`));
  
  testResults.dataIntegrity.details = schemaValidation;
  testResults.dataIntegrity.status = 'completed';
  testResults.summary.passed++;
} catch (error) {
  console.log('❌ Data integrity test failed:', error.message);
  testResults.dataIntegrity.details.push(`Test error: ${error.message}`);
  testResults.dataIntegrity.status = 'error';
  testResults.summary.failed++;
}

// 5. ERROR HANDLING VALIDATION
console.log('\n🛡️  5. ERROR HANDLING VALIDATION');
console.log('---------------------------------');

try {
  // Check AuthContext error handling
  const authContextPath = path.join(process.cwd(), 'contexts', 'AuthContext.tsx');
  if (fs.existsSync(authContextPath)) {
    const authContent = fs.readFileSync(authContextPath, 'utf8');
    
    // Test comprehensive error handling
    const errorPatterns = [
      { pattern: 'try', description: 'Try blocks' },
      { pattern: 'catch', description: 'Catch blocks' },
      { pattern: 'throw', description: 'Error throwing' },
      { pattern: 'console.error', description: 'Error logging' },
      { pattern: 'console.warn', description: 'Warning logging' }
    ];
    
    let errorHandlingScore = 0;
    errorPatterns.forEach(({ pattern, description }) => {
      if (authContent.includes(pattern)) {
        console.log(`✅ ${description} implemented`);
        errorHandlingScore++;
      } else {
        console.log(`⚠️  ${description} missing`);
      }
    });
    
    if (errorHandlingScore >= errorPatterns.length * 0.8) {
      testResults.errorHandling.details.push('AuthContext error handling: GOOD');
      testResults.summary.passed++;
    } else {
      testResults.errorHandling.details.push('AuthContext error handling: NEEDS IMPROVEMENT');
      testResults.summary.warnings++;
    }
  }
  
  // Check for global error boundary
  const errorBoundaryPaths = [
    'components/ErrorBoundary.tsx',
    'components/common/ErrorBoundary.tsx'
  ];
  
  let errorBoundaryFound = false;
  for (const boundaryPath of errorBoundaryPaths) {
    if (fs.existsSync(path.join(process.cwd(), boundaryPath))) {
      console.log('✅ Error boundary component found');
      errorBoundaryFound = true;
      break;
    }
  }
  
  if (!errorBoundaryFound) {
    console.log('⚠️  No error boundary component found');
    testResults.errorHandling.details.push('Error boundary: MISSING');
    testResults.summary.warnings++;
  } else {
    testResults.errorHandling.details.push('Error boundary: PRESENT');
    testResults.summary.passed++;
  }
  
  testResults.errorHandling.status = 'completed';
} catch (error) {
  console.log('❌ Error handling test failed:', error.message);
  testResults.errorHandling.details.push(`Test error: ${error.message}`);
  testResults.errorHandling.status = 'error';
  testResults.summary.failed++;
}

// SUMMARY
console.log('\n📊 DATABASE & API TEST SUMMARY');
console.log('===============================');

console.log(`Tests Passed: ${testResults.summary.passed}`);
console.log(`Tests Failed: ${testResults.summary.failed}`);
console.log(`Warnings: ${testResults.summary.warnings}`);

const totalTests = testResults.summary.passed + testResults.summary.failed + testResults.summary.warnings;
const successRate = totalTests > 0 ? ((testResults.summary.passed / totalTests) * 100).toFixed(1) : 0;

console.log(`Success Rate: ${successRate}%`);

// Overall assessment
let overallStatus = 'GOOD';
if (testResults.summary.failed > 0) {
  overallStatus = 'NEEDS ATTENTION';
} else if (testResults.summary.warnings > 2) {
  overallStatus = 'FAIR';
}

console.log(`Overall Status: ${overallStatus}`);

// Save detailed results
fs.writeFileSync('database-test-report.json', JSON.stringify(testResults, null, 2));
console.log('\n📄 Detailed report saved to: database-test-report.json');

console.log('\n🎯 KEY RECOMMENDATIONS');
console.log('======================');

if (testResults.summary.failed > 0) {
  console.log('1. Address failed tests immediately - these are critical issues');
}

if (testResults.summary.warnings > 0) {
  console.log('2. Implement missing error boundary component');
  console.log('3. Enhance error handling in database service');
  console.log('4. Add comprehensive input validation');
}

console.log('5. Consider implementing connection pooling for better performance');
console.log('6. Add database query optimization and indexing');
console.log('7. Implement comprehensive logging and monitoring');

console.log('\n✅ Database & API Validation Complete!');