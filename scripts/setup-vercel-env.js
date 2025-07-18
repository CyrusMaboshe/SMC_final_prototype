#!/usr/bin/env node

/**
 * Vercel Environment Variables Setup Script
 * This script helps set up the correct environment variables for Vercel deployment
 */

console.log('🔧 Vercel Environment Variables Setup\n');

const envVars = {
  'NEXT_PUBLIC_SUPABASE_URL': 'https://tigknjhplktzqzradmkd.supabase.co',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpZ2tuamhwbGt0enF6cmFkbWtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0NTg5NTksImV4cCI6MjA2NjAzNDk1OX0.GhMpUkea-rEqqIKWZv9q7l_MIeZVK57Tj5oAlKC-4tY',
  'SUPABASE_SERVICE_ROLE_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpZ2tuamhwbGt0enF6cmFkbWtkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ1ODk1OSwiZXhwIjoyMDY2MDM0OTU5fQ.ELJLBA-FwDTaLhG88VUaiLKYjjdg_efpYamelF9AgIM'
};

console.log('📋 Required Environment Variables for Vercel:\n');

Object.entries(envVars).forEach(([key, value], index) => {
  console.log(`${index + 1}. Variable Name: ${key}`);
  console.log(`   Value: ${value}`);
  console.log(`   Environment: Production, Preview\n`);
});

console.log('🚀 How to add these to Vercel:\n');
console.log('1. Go to https://vercel.com/dashboard');
console.log('2. Select your SMC project');
console.log('3. Go to Settings → Environment Variables');
console.log('4. Add each variable above');
console.log('5. Set environment to "Production" and "Preview"');
console.log('6. Click "Redeploy" after adding all variables\n');

console.log('✅ After adding these variables, your "Invalid API key" error will be fixed!');

// If Vercel CLI is available, provide commands
console.log('\n🔧 Or use Vercel CLI commands:\n');
Object.entries(envVars).forEach(([key, value]) => {
  console.log(`vercel env add ${key}`);
  console.log(`# Enter: ${value}\n`);
});

console.log('💡 Tip: Copy and paste each value exactly as shown above.');
console.log('⚠️  Make sure to add all THREE variables for the app to work properly.\n');
