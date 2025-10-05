const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Define __dirname for CommonJS compatibility
const __dirname = __dirname || path.resolve();
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.error('Make sure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyProfileFieldsMigration() {
  console.log('🚀 Starting profile fields migration...');
  
  try {
    // Read the SQL migration file
    const sqlFilePath = path.join(__dirname, 'add-profile-fields.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📄 Read migration file:', sqlFilePath);
    
    // Split the SQL into individual statements (excluding comments and empty lines)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && !stmt.startsWith('/*'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;
      
      console.log(`\n⏳ Executing statement ${i + 1}/${statements.length}...`);
      console.log(`SQL: ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`);
      
      const { error } = await supabase.rpc('exec_sql', { 
        sql_query: statement 
      });
      
      if (error) {
        // Some errors might be expected (like "column already exists")
        if (error.message.includes('already exists') || error.message.includes('IF NOT EXISTS')) {
          console.log(`⚠️  Expected warning: ${error.message}`);
        } else {
          console.error(`❌ Error executing statement: ${error.message}`);
          throw error;
        }
      } else {
        console.log('✅ Statement executed successfully');
      }
    }
    
    // Test the new columns
    console.log('\n🔍 Testing new profile columns...');
    
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('height_unit, weight_unit, fitness_level, age, weight, height')
      .limit(1);
    
    if (testError) {
      console.error('❌ Error testing new columns:', testError.message);
      throw testError;
    } else {
      console.log('✅ All new profile columns are accessible');
      console.log('📊 Test query result:', testData);
    }
    
    console.log('\n🎉 Profile fields migration completed successfully!');
    console.log('📋 Added columns: age, weight, height, fitness_level, weight_unit, height_unit');
    console.log('🔒 Applied validation constraints for data integrity');
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    console.error('📋 This might be because:');
    console.error('   1. The columns already exist');
    console.error('   2. Insufficient database permissions');
    console.error('   3. Network connectivity issues');
    console.error('\n💡 You may need to run the SQL manually in Supabase Dashboard');
    throw error;
  }
}

// Run the migration
applyProfileFieldsMigration()
  .then(() => {
    console.log('\n✨ Migration script completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Migration script failed:', error.message);
    process.exit(1);
  });