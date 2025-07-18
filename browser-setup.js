// BROWSER CONSOLE SETUP SCRIPT
// Copy and paste this entire script into your browser console while on localhost:3000

console.log('🚀 Starting Supabase table creation...');

// Function to create tables via API
async function setupDatabase() {
  try {
    console.log('📡 Calling setup API...');
    
    const response = await fetch('/api/setup-db', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ SUCCESS: Database setup completed!');
      console.log('✅ All access control tables created');
      console.log('✅ Test semester period added');
      console.log('🎉 You can now use the Access Control features!');
      console.log('🔄 Refresh the accountant dashboard to see changes');
      
      // Test the tables
      await testTables();
      
      return true;
    } else {
      console.error('❌ FAILED: Database setup failed:', data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ ERROR: Setup failed:', error.message);
    return false;
  }
}

// Function to test if tables exist
async function testTables() {
  try {
    console.log('🔍 Testing table existence...');
    
    const response = await fetch('/api/setup-db', {
      method: 'GET',
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('📊 Table Status:');
      Object.entries(data.tables).forEach(([table, exists]) => {
        console.log(`${exists ? '✅' : '❌'} ${table}: ${exists ? 'exists' : 'missing'}`);
      });
      return data.tables;
    } else {
      console.error('❌ Test failed:', data.error);
      return {};
    }
  } catch (error) {
    console.error('❌ Test error:', error.message);
    return {};
  }
}

// Run the setup
console.log('🎯 Running database setup...');
setupDatabase().then(success => {
  if (success) {
    console.log('');
    console.log('🎉 SETUP COMPLETE!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Go to http://localhost:3000/accountant/dashboard');
    console.log('2. Click on "Access Control" tab');
    console.log('3. Try creating a semester period');
    console.log('4. The error should be fixed!');
  } else {
    console.log('');
    console.log('❌ SETUP FAILED!');
    console.log('');
    console.log('Try the manual Supabase SQL approach:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Open SQL Editor');
    console.log('3. Run the SQL from the previous instructions');
  }
});
