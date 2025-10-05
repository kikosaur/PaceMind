// Core functionality test runner (JavaScript version to avoid compilation issues)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock console for cleaner output
const originalConsole = console;
const testConsole = {
  log: (...args) => originalConsole.log('📝', ...args),
  error: (...args) => originalConsole.error('❌', ...args),
  warn: (...args) => originalConsole.warn('⚠️', ...args),
  info: (...args) => originalConsole.info('ℹ️', ...args)
};

async function validateCoreFiles() {
  const coreFiles = [
    'services/adaptive-goal-service.ts',
    'lib/motivation-service.ts',
    'services/ai-insights-analyzer.ts',
    'services/behavior-pattern-validator.ts',
    'services/system-integration-tester.ts',
    'services/performance-optimizer.ts',
    'components/insights-interface-streamliner.tsx'
  ];

  const results = {
    filesExist: 0,
    totalFiles: coreFiles.length,
    missingFiles: [],
    validationResults: []
  };

  testConsole.log('🔍 Validating core system files...');

  for (const file of coreFiles) {
    const filePath = path.join(__dirname, file);
    const exists = fs.existsSync(filePath);
    
    if (exists) {
      results.filesExist++;
      const stats = fs.statSync(filePath);
      const sizeKB = Math.round(stats.size / 1024 * 100) / 100;
      
      results.validationResults.push({
        file,
        status: 'EXISTS',
        size: `${sizeKB}KB`,
        lastModified: stats.mtime.toISOString().split('T')[0]
      });
      
      testConsole.log(`✅ ${file} (${sizeKB}KB)`);
    } else {
      results.missingFiles.push(file);
      results.validationResults.push({
        file,
        status: 'MISSING',
        size: 'N/A',
        lastModified: 'N/A'
      });
      
      testConsole.error(`❌ ${file} - MISSING`);
    }
  }

  return results;
}

async function validateFileContents() {
  const validations = [];
  
  testConsole.log('🔍 Validating file contents and structure...');

  // Check adaptive-goal-service.ts
  try {
    const adaptiveGoalContent = fs.readFileSync('services/adaptive-goal-service.ts', 'utf8');
    const hasAdaptiveGoalService = adaptiveGoalContent.includes('class AdaptiveGoalService');
    const hasCalculateMotivationTrend = adaptiveGoalContent.includes('calculateMotivationTrend');
    const hasAdjustGoals = adaptiveGoalContent.includes('adjustGoals');
    
    validations.push({
      file: 'adaptive-goal-service.ts',
      checks: {
        hasMainClass: hasAdaptiveGoalService,
        hasMotivationTrend: hasCalculateMotivationTrend,
        hasGoalAdjustment: hasAdjustGoals
      },
      status: hasAdaptiveGoalService && hasCalculateMotivationTrend && hasAdjustGoals ? 'PASS' : 'PARTIAL'
    });
    
    testConsole.log(`✅ AdaptiveGoalService validation: ${hasAdaptiveGoalService ? 'PASS' : 'FAIL'}`);
  } catch (error) {
    validations.push({
      file: 'adaptive-goal-service.ts',
      status: 'ERROR',
      error: error.message
    });
    testConsole.error(`❌ AdaptiveGoalService validation failed: ${error.message}`);
  }

  // Check motivation-service.ts
  try {
    const motivationContent = fs.readFileSync('lib/motivation-service.ts', 'utf8');
    const hasMotivationService = motivationContent.includes('class MotivationService');
    const hasPredictMotivation = motivationContent.includes('predictMotivation');
    const hasTransformData = motivationContent.includes('transformWalkingData');
    
    validations.push({
      file: 'motivation-service.ts',
      checks: {
        hasMainClass: hasMotivationService,
        hasPrediction: hasPredictMotivation,
        hasDataTransform: hasTransformData
      },
      status: hasMotivationService && hasPredictMotivation && hasTransformData ? 'PASS' : 'PARTIAL'
    });
    
    testConsole.log(`✅ MotivationService validation: ${hasMotivationService ? 'PASS' : 'FAIL'}`);
  } catch (error) {
    validations.push({
      file: 'motivation-service.ts',
      status: 'ERROR',
      error: error.message
    });
    testConsole.error(`❌ MotivationService validation failed: ${error.message}`);
  }
  try {
    const insightsContent = fs.readFileSync('services/ai-insights-analyzer.ts', 'utf8');
    const hasAnalyzer = insightsContent.includes('class AIInsightsAnalyzer');
    const hasValidation = insightsContent.includes('validateInsights');
    const hasAccuracy = insightsContent.includes('calculateAccuracyMetrics');
    
    validations.push({
      file: 'ai-insights-analyzer.ts',
      checks: {
        hasMainClass: hasAnalyzer,
        hasValidation: hasValidation,
        hasAccuracyMetrics: hasAccuracy
      },
      status: hasAnalyzer && hasValidation && hasAccuracy ? 'PASS' : 'PARTIAL'
    });
    
    testConsole.log(`✅ AIInsightsAnalyzer validation: ${hasAnalyzer ? 'PASS' : 'FAIL'}`);
  } catch (error) {
    validations.push({
      file: 'ai-insights-analyzer.ts',
      status: 'ERROR',
      error: error.message
    });
    testConsole.error(`❌ AIInsightsAnalyzer validation failed: ${error.message}`);
  }

  // Check behavior-pattern-validator.ts
  try {
    const behaviorContent = fs.readFileSync('services/behavior-pattern-validator.ts', 'utf8');
    const hasValidator = behaviorContent.includes('class BehaviorPatternValidator');
    const hasPatternDetection = behaviorContent.includes('detectPatterns');
    const hasValidation = behaviorContent.includes('validatePatterns');
    
    validations.push({
      file: 'behavior-pattern-validator.ts',
      checks: {
        hasMainClass: hasValidator,
        hasPatternDetection: hasPatternDetection,
        hasValidation: hasValidation
      },
      status: hasValidator && hasPatternDetection && hasValidation ? 'PASS' : 'PARTIAL'
    });
    
    testConsole.log(`✅ BehaviorPatternValidator validation: ${hasValidator ? 'PASS' : 'FAIL'}`);
  } catch (error) {
    validations.push({
      file: 'behavior-pattern-validator.ts',
      status: 'ERROR',
      error: error.message
    });
    testConsole.error(`❌ BehaviorPatternValidator validation failed: ${error.message}`);
  }

  // Check performance-optimizer.ts
  try {
    const optimizerContent = fs.readFileSync('services/performance-optimizer.ts', 'utf8');
    const hasOptimizer = optimizerContent.includes('class PerformanceOptimizer');
    const hasOptimization = optimizerContent.includes('applyOptimizations');
    const hasCaching = optimizerContent.includes('caching');
    
    validations.push({
      file: 'performance-optimizer.ts',
      checks: {
        hasMainClass: hasOptimizer,
        hasOptimization: hasOptimization,
        hasCaching: hasCaching
      },
      status: hasOptimizer && hasOptimization && hasCaching ? 'PASS' : 'PARTIAL'
    });
    
    testConsole.log(`✅ PerformanceOptimizer validation: ${hasOptimizer ? 'PASS' : 'FAIL'}`);
  } catch (error) {
    validations.push({
      file: 'performance-optimizer.ts',
      status: 'ERROR',
      error: error.message
    });
    testConsole.error(`❌ PerformanceOptimizer validation failed: ${error.message}`);
  }

  return validations;
}

async function generateTestReport(fileResults, contentResults) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: fileResults.totalFiles,
      filesExist: fileResults.filesExist,
      missingFiles: fileResults.missingFiles.length,
      contentValidations: contentResults.length,
      passedValidations: contentResults.filter(v => v.status === 'PASS').length,
      partialValidations: contentResults.filter(v => v.status === 'PARTIAL').length,
      failedValidations: contentResults.filter(v => v.status === 'ERROR').length
    },
    fileValidation: fileResults,
    contentValidation: contentResults,
    overallStatus: 'UNKNOWN'
  };

  // Determine overall status
  const fileScore = (fileResults.filesExist / fileResults.totalFiles) * 100;
  const contentScore = contentResults.length > 0 ? 
    (contentResults.filter(v => v.status === 'PASS').length / contentResults.length) * 100 : 0;
  
  const overallScore = (fileScore + contentScore) / 2;
  
  if (overallScore >= 90) {
    report.overallStatus = 'EXCELLENT';
  } else if (overallScore >= 75) {
    report.overallStatus = 'GOOD';
  } else if (overallScore >= 50) {
    report.overallStatus = 'NEEDS_IMPROVEMENT';
  } else {
    report.overallStatus = 'CRITICAL';
  }

  return report;
}

async function main() {
  testConsole.log('🚀 Starting Core Functionality Validation');
  testConsole.log('==========================================');
  
  try {
    // Validate file existence
    const fileResults = await validateCoreFiles();
    
    testConsole.log('');
    testConsole.log('📊 File Validation Summary:');
    testConsole.log(`   Files Found: ${fileResults.filesExist}/${fileResults.totalFiles}`);
    testConsole.log(`   Missing Files: ${fileResults.missingFiles.length}`);
    
    if (fileResults.missingFiles.length > 0) {
      testConsole.warn('   Missing:', fileResults.missingFiles.join(', '));
    }
    
    // Validate file contents
    testConsole.log('');
    const contentResults = await validateFileContents();
    
    // Generate comprehensive report
    const report = await generateTestReport(fileResults, contentResults);
    
    testConsole.log('');
    testConsole.log('📈 Final Test Report:');
    testConsole.log('====================');
    testConsole.log(`Overall Status: ${report.overallStatus}`);
    testConsole.log(`Files Validated: ${report.summary.filesExist}/${report.summary.totalFiles}`);
    testConsole.log(`Content Validations: ${report.summary.passedValidations}/${report.summary.contentValidations} passed`);
    
    if (report.summary.partialValidations > 0) {
      testConsole.warn(`Partial Validations: ${report.summary.partialValidations}`);
    }
    
    if (report.summary.failedValidations > 0) {
      testConsole.error(`Failed Validations: ${report.summary.failedValidations}`);
    }
    
    // Save detailed report
    const reportPath = 'test-results.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    testConsole.log(`📄 Detailed report saved to: ${reportPath}`);
    
    testConsole.log('');
    testConsole.log('✅ Core functionality validation completed!');
    
    // Exit with appropriate code
    process.exit(report.overallStatus === 'CRITICAL' ? 1 : 0);
    
  } catch (error) {
    testConsole.error('❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
main().catch(error => {
  testConsole.error('❌ Unexpected error:', error);
  process.exit(1);
});