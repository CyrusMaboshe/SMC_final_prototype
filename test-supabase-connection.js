const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Testing Supabase Connection...\n');

// Test environment variables
console.log('Environment Variables:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');
console.log('');

// Create clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Test anon client
const anonClient = createClient(supabaseUrl, supabaseAnonKey);

// Test service role client
const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  try {
    console.log('🧪 Testing Anon Client...');
    const { data: anonData, error: anonError } = await anonClient
      .from('system_users')
      .select('count')
      .limit(1);
    
    if (anonError) {
      console.log('⚠️  Anon client error (expected for RLS):', anonError.message);
    } else {
      console.log('✅ Anon client connected successfully');
    }

    console.log('\n🧪 Testing Service Role Client...');
    const { data: serviceData, error: serviceError } = await serviceClient
      .from('system_users')
      .select('count')
      .limit(1);
    
    if (serviceError) {
      console.log('❌ Service client error:', serviceError.message);
      return false;
    } else {
      console.log('✅ Service client connected successfully');
    }

    console.log('\n🧪 Testing Authentication Function...');
    const { data: authData, error: authError } = await anonClient
      .rpc('authenticate_user', {
        p_username: 'test',
        p_password: 'test'
      });
    
    if (authError) {
      console.log('⚠️  Auth function error (expected for invalid creds):', authError.message);
    } else {
      console.log('✅ Auth function accessible');
    }

    console.log('\n🎉 Connection test completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});
