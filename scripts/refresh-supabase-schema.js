const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function refreshSchema() {
  console.log('Attempting to refresh Supabase schema cache...');
  
  try {
    // Try to force a schema refresh by making a direct SQL query
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'walking_sessions' 
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `
    });
    
    if (error) {
      console.error('Error querying schema:', error);
      
      // Try alternative approach - direct table query
      console.log('Trying direct table query...');
      const { data: tableData, error: tableError } = await supabase
        .from('walking_sessions')
        .select('*')
        .limit(0); // Just get schema, no data
      
      if (tableError) {
        console.error('Direct table query error:', tableError);
      } else {
        console.log('✓ Direct table query successful - schema should be refreshed');
      }
    } else {
      console.log('Schema columns found:', data);
      const hasCaloriesBurned = data?.some(col => col.column_name === 'calories_burned');
      const hasCalories = data?.some(col => col.column_name === 'calories');
      
      console.log('Column analysis:');
      console.log('- calories_burned exists:', hasCaloriesBurned);
      console.log('- calories exists:', hasCalories);
    }
    
    // Test the actual problematic operation
    console.log('Testing walking_sessions update operation...');
    const { data: sessions, error: sessionsError } = await supabase
      .from('walking_sessions')
      .select('id')
      .limit(1);
    
    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
    } else if (sessions && sessions.length > 0) {
      const { error: updateError } = await supabase
        .from('walking_sessions')
        .update({ calories_burned: 100 })
        .eq('id', sessions[0].id);
      
      if (updateError) {
        console.error('Update test failed:', updateError);
      } else {
        console.log('✓ Update test successful');
      }
    } else {
      console.log('No sessions found to test update');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

refreshSchema().then(() => {
  console.log('Schema refresh completed');
  process.exit(0);
}).catch(error => {
  console.error('Schema refresh failed:', error);
  process.exit(1);
});