import SystemIntegrationTester from './services/system-integration-tester';
import PerformanceOptimizer from './services/performance-optimizer';

/**
 * Comprehensive system integration test runner
 */
async function runSystemIntegrationTests() {
  console.log('🚀 Starting comprehensive system integration tests...\n');
  
  const testUserId = 'test-user-123';
  const tester = SystemIntegrationTester.getInstance();
  const optimizer = PerformanceOptimizer.getInstance();

  try {
    // Step 1: Run performance optimizations first
    console.log('⚡ Running performance optimizations...');
    const optimizationResult = await optimizer.optimizeSystemPerformance();
    
    console.log('✅ Performance optimization completed:');
    console.log(`   - Optimizations applied: ${optimizationResult.optimizationsApplied.length}`);
    console.log(`   - Overall improvement: ${optimizationResult.performanceGains.overallImprovement.toFixed(1)}%`);
    console.log(`   - Goal adjustment speedup: ${optimizationResult.performanceGains.goalAdjustmentSpeedup.toFixed(1)}%`);
    console.log(`   - Insight generation speedup: ${optimizationResult.performanceGains.insightGenerationSpeedup.toFixed(1)}%`);
    console.log(`   - Pattern detection speedup: ${optimizationResult.performanceGains.patternDetectionSpeedup.toFixed(1)}%\n`);

    // Step 2: Run comprehensive system tests
    console.log('🧪 Running comprehensive system integration tests...');
    const testResult = await tester.runFullSystemTest(testUserId);
    
    console.log('📊 System integration test results:');
    console.log(`   - Overall Status: ${testResult.overallStatus}`);
    console.log(`   - Tests Run: ${testResult.testResults.length}`);
    console.log(`   - Execution Time: ${testResult.executionTime}ms`);
    
    const passedTests = testResult.testResults.filter(test => test.status === 'PASS').length;
    const failedTests = testResult.testResults.filter(test => test.status === 'FAIL').length;
    const warningTests = testResult.testResults.filter(test => test.status === 'WARNING').length;
    const skippedTests = testResult.testResults.filter(test => test.status === 'SKIP').length;
    
    console.log(`   - Passed: ${passedTests}`);
    console.log(`   - Failed: ${failedTests}`);
    console.log(`   - Warnings: ${warningTests}`);
    console.log(`   - Skipped: ${skippedTests}\n`);

    // Step 3: Display detailed test results
    console.log('📋 Detailed Test Results:');
    testResult.testResults.forEach((test, index) => {
      const statusIcon = test.status === 'PASS' ? '✅' : 
                        test.status === 'FAIL' ? '❌' : 
                        test.status === 'WARNING' ? '⚠️' : '⏭️';
      
      console.log(`   ${index + 1}. ${statusIcon} ${test.testName}: ${test.status}`);
      console.log(`      Duration: ${test.duration}ms`);
      console.log(`      Details: ${test.details}`);
      
      if (test.errorMessage) {
        console.log(`      Error: ${test.errorMessage}`);
      }
      
      if (test.metrics) {
        const metricsStr = Object.entries(test.metrics)
          .map(([key, value]) => `${key}: ${typeof value === 'number' ? value.toFixed(2) : value}`)
          .join(', ');
        console.log(`      Metrics: ${metricsStr}`);
      }
      console.log('');
    });

    // Step 4: Display performance metrics
    console.log('⚡ Performance Metrics:');
    console.log(`   - Goal Adjustment Time: ${testResult.performanceMetrics.goalAdjustmentTime}ms`);
    console.log(`   - Insight Generation Time: ${testResult.performanceMetrics.insightGenerationTime}ms`);
    console.log(`   - Pattern Detection Time: ${testResult.performanceMetrics.patternDetectionTime}ms`);
    console.log(`   - Database Response Time: ${testResult.performanceMetrics.databaseResponseTime}ms`);
    console.log(`   - Memory Usage: ${(testResult.performanceMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   - API Response Time: ${testResult.performanceMetrics.apiResponseTime}ms\n`);

    // Step 5: Display issues if any
    if (testResult.issues.length > 0) {
      console.log('🚨 Issues Identified:');
      testResult.issues.forEach((issue, index) => {
        const severityIcon = issue.severity === 'HIGH' ? '🔴' : 
                            issue.severity === 'MEDIUM' ? '🟡' : '🟢';
        
        console.log(`   ${index + 1}. ${severityIcon} [${issue.severity}] ${issue.component}`);
        console.log(`      Description: ${issue.description}`);
        console.log(`      Impact: ${issue.impact}`);
        console.log(`      Suggested Fix: ${issue.suggestedFix}\n`);
      });
    }

    // Step 6: Display recommendations
    if (testResult.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      testResult.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
      console.log('');
    }

    // Step 7: Generate comprehensive reports
    console.log('📄 Generating comprehensive reports...');
    
    const systemTestReport = tester.generateSystemTestReport(testResult);
    const optimizationReport = optimizer.generateOptimizationReport(optimizationResult);
    
    // Save reports (in a real implementation, these would be saved to files)
    console.log('📁 Reports generated:');
    console.log('   - System Integration Test Report');
    console.log('   - Performance Optimization Report\n');

    // Step 8: Final assessment
    console.log('🎯 Final Assessment:');
    
    if (testResult.overallStatus === 'PASS') {
      console.log('✅ System is fully operational and optimized!');
      console.log('   - All core functionalities are working correctly');
      console.log('   - Performance optimizations are effective');
      console.log('   - System is ready for production use');
    } else if (testResult.overallStatus === 'WARNING') {
      console.log('⚠️ System is operational with minor issues:');
      console.log('   - Core functionalities are working');
      console.log('   - Some optimizations may need attention');
      console.log('   - Monitor system performance closely');
    } else {
      console.log('❌ System has critical issues that need attention:');
      console.log('   - Some core functionalities may be compromised');
      console.log('   - Immediate fixes required before production use');
      console.log('   - Review failed tests and address issues');
    }

    // Step 9: Summary statistics
    console.log('\n📈 Summary Statistics:');
    console.log(`   - Total test execution time: ${testResult.executionTime}ms`);
    console.log(`   - Total optimization time: ${optimizationResult.executionTime}ms`);
    console.log(`   - Overall system improvement: ${optimizationResult.performanceGains.overallImprovement.toFixed(1)}%`);
    console.log(`   - Test success rate: ${((passedTests / testResult.testResults.length) * 100).toFixed(1)}%`);
    console.log(`   - Issues identified: ${testResult.issues.length}`);
    console.log(`   - Recommendations provided: ${testResult.recommendations.length}`);

    return {
      success: testResult.overallStatus !== 'FAIL',
      testResult,
      optimizationResult,
      reports: {
        systemTest: systemTestReport,
        optimization: optimizationReport
      }
    };

  } catch (error) {
    console.error('❌ System integration test failed:', error);
    console.log('\n🚨 Critical Error:');
    console.log(`   - Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.log('   - System may have fundamental issues');
    console.log('   - Review system configuration and dependencies');
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Validates that all system components are properly integrated
 */
async function validateSystemIntegration() {
  console.log('🔍 Validating system integration...\n');
  
  const validationResults = {
    adaptiveGoalService: false,
    aiInsightsAnalyzer: false,
    behaviorPatternValidator: false,
    systemIntegrationTester: false,
    performanceOptimizer: false,
    streamlinedInterface: false
  };

  try {
    // Check if all services can be instantiated
    const { AdaptiveGoalService } = await import('./services/adaptive-goal-service');
    const { AIInsightsAnalyzer } = await import('./services/ai-insights-analyzer');
    const { BehaviorPatternValidator } = await import('./services/behavior-pattern-validator');
    const SystemIntegrationTester = await import('./services/system-integration-tester');
    const PerformanceOptimizer = await import('./services/performance-optimizer');

    validationResults.adaptiveGoalService = !!AdaptiveGoalService.getInstance();
    validationResults.aiInsightsAnalyzer = !!AIInsightsAnalyzer.getInstance();
    validationResults.behaviorPatternValidator = !!BehaviorPatternValidator.getInstance();
    validationResults.systemIntegrationTester = !!SystemIntegrationTester.default.getInstance();
    validationResults.performanceOptimizer = !!PerformanceOptimizer.default.getInstance();

    // Check if streamlined interface component exists
    try {
      await import('./components/insights-interface-streamliner');
      validationResults.streamlinedInterface = true;
    } catch (error) {
      console.log('⚠️ Streamlined interface component not found or has issues');
    }

    console.log('✅ System Integration Validation Results:');
    Object.entries(validationResults).forEach(([component, isValid]) => {
      const status = isValid ? '✅' : '❌';
      console.log(`   ${status} ${component}: ${isValid ? 'OK' : 'FAILED'}`);
    });

    const allValid = Object.values(validationResults).every(result => result);
    
    if (allValid) {
      console.log('\n🎉 All system components are properly integrated!');
    } else {
      console.log('\n⚠️ Some system components have integration issues.');
    }

    return { success: allValid, validationResults };

  } catch (error) {
    console.error('❌ System validation failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Main test execution function
 */
async function main() {
  console.log('🎯 PaceMind System Integration & Performance Test Suite');
  console.log('=====================================================\n');

  // Step 1: Validate system integration
  const validationResult = await validateSystemIntegration();
  
  if (!validationResult.success) {
    console.log('\n❌ System validation failed. Cannot proceed with integration tests.');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Step 2: Run comprehensive integration tests
  const testResult = await runSystemIntegrationTests();
  
  console.log('\n' + '='.repeat(50));
  console.log('🏁 Test Suite Completed');
  console.log('='.repeat(50));
  
  if (testResult.success) {
    console.log('🎉 All tests completed successfully!');
    console.log('   System is ready for production deployment.');
    process.exit(0);
  } else {
    console.log('⚠️ Tests completed with issues.');
    console.log('   Review results and address identified problems.');
    process.exit(1);
  }
}

// Run the test suite if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Test suite execution failed:', error);
    process.exit(1);
  });
}

export { runSystemIntegrationTests, validateSystemIntegration };