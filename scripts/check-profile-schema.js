const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfileSchema() {
  console.log('🔍 Checking profile table schema...');
  
  const requiredColumns = [
    'height_unit',
    'weight_unit', 
    'fitness_level',
    'age',
    'weight',
    'height'
  ];
  
  const results = {};
  
  for (const column of requiredColumns) {
    try {
      console.log(`\n⏳ Testing column: ${column}`);
      
      const { error } = await supabase
        .from('profiles')
        .select(column)
        .limit(1);
      
      if (error) {
        console.log(`❌ Column '${column}' missing or inaccessible`);
        console.log(`   Error: ${error.message}`);
        results[column] = false;
      } else {
        console.log(`✅ Column '${column}' exists and accessible`);
        results[column] = true;
      }
    } catch (err) {
      console.log(`❌ Column '${column}' test failed`);
      console.log(`   Error: ${err.message}`);
      results[column] = false;
    }
  }
  
  console.log('\n📊 Schema Check Results:');
  console.log('========================');
  
  const missingColumns = [];
  const existingColumns = [];
  
  for (const [column, exists] of Object.entries(results)) {
    const status = exists ? '✅' : '❌';
    console.log(`${status} ${column}: ${exists ? 'EXISTS' : 'MISSING'}`);
    
    if (exists) {
      existingColumns.push(column);
    } else {
      missingColumns.push(column);
    }
  }
  
  console.log('\n📋 Summary:');
  console.log(`✅ Existing columns (${existingColumns.length}): ${existingColumns.join(', ') || 'None'}`);
  console.log(`❌ Missing columns (${missingColumns.length}): ${missingColumns.join(', ') || 'None'}`);
  
  if (missingColumns.length > 0) {
    console.log('\n🚨 ACTION REQUIRED:');
    console.log('The following columns need to be added to your Supabase database:');
    missingColumns.forEach(col => console.log(`   - ${col}`));
    
    console.log('\n💡 To fix this:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of scripts/add-profile-fields.sql');
    console.log('4. Execute the script');
    
    return false;
  } else {
    console.log('\n🎉 All required columns exist! Your database schema is up to date.');
    return true;
  }
}

// Run the check
checkProfileSchema()
  .then((allColumnsExist) => {
    if (allColumnsExist) {
      console.log('\n✨ Schema check completed - no action needed!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Schema check completed - manual migration required!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Schema check failed:', error.message);
    process.exit(1);
  });