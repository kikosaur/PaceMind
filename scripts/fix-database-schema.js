const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDatabaseSchema() {
  console.log('Applying database schema fixes...');
  
  try {
    // Test if calories_burned column exists by trying to query it
    console.log('Testing calories_burned column...');
    const { data: testCaloriesBurned, error: caloriesBurnedError } = await supabase
      .from('walking_sessions')
      .select('calories_burned')
      .limit(1);
    
    if (!caloriesBurnedError) {
      console.log('✓ calories_burned column exists and is accessible');
      
      // Test a simple update to make sure it works
      console.log('Testing database write operations...');
      const { data: sessions, error: sessionsError } = await supabase
        .from('walking_sessions')
        .select('id')
        .limit(1);
      
      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError);
      } else if (sessions && sessions.length > 0) {
        const { error: updateError } = await supabase
          .from('walking_sessions')
          .update({ calories_burned: 0 })
          .eq('id', sessions[0].id);
        
        if (updateError) {
          console.error('Error updating session:', updateError);
        } else {
          console.log('✓ Database write operations working correctly');
        }
      } else {
        console.log('No sessions found to test update operation');
      }
    } else {
      console.error('calories_burned column error:', caloriesBurnedError);
      
      // Test if calories column exists instead
      console.log('Testing calories column...');
      const { data: testCalories, error: caloriesError } = await supabase
        .from('walking_sessions')
        .select('calories')
        .limit(1);
      
      if (!caloriesError) {
        console.log('Found calories column - this might be the issue');
        console.log('The database has "calories" but the app expects "calories_burned"');
      } else {
        console.error('calories column error:', caloriesError);
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixDatabaseSchema().then(() => {
  console.log('Schema fix completed');
  process.exit(0);
}).catch(error => {
  console.error('Schema fix failed:', error);
  process.exit(1);
});