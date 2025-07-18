#!/usr/bin/env node

/**
 * Pre-deployment build check script for Vercel
 * Ensures all dependencies and configurations are correct
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Running pre-deployment build check...\n');

// Check required files
const requiredFiles = [
  'package.json',
  'next.config.ts',
  'vercel.json',
  'src/app/layout.tsx',
  'src/app/page.tsx',
  'src/lib/supabase.ts'
];

console.log('📁 Checking required files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

// Check package.json
console.log('\n📦 Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Check required dependencies
  const requiredDeps = [
    'next',
    'react',
    'react-dom',
    '@supabase/supabase-js',
    'tailwindcss',
    'typescript'
  ];
  
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
      console.log(`✅ ${dep}`);
    } else {
      console.log(`❌ ${dep} - MISSING`);
      allFilesExist = false;
    }
  });
  
  // Check scripts
  const requiredScripts = ['dev', 'build', 'start'];
  requiredScripts.forEach(script => {
    if (packageJson.scripts[script]) {
      console.log(`✅ Script: ${script}`);
    } else {
      console.log(`❌ Script: ${script} - MISSING`);
      allFilesExist = false;
    }
  });
  
} catch (error) {
  console.log('❌ Error reading package.json:', error.message);
  allFilesExist = false;
}

// Check environment variables template
console.log('\n🔐 Checking environment configuration...');
if (fs.existsSync('.env.example')) {
  console.log('✅ .env.example exists');
} else {
  console.log('⚠️  .env.example not found (recommended for deployment)');
}

// Check Next.js configuration
console.log('\n⚙️  Checking Next.js configuration...');
try {
  const nextConfigContent = fs.readFileSync('next.config.ts', 'utf8');
  
  if (nextConfigContent.includes('ignoreBuildErrors: true')) {
    console.log('✅ TypeScript build errors ignored');
  }
  
  if (nextConfigContent.includes('ignoreDuringBuilds: true')) {
    console.log('✅ ESLint errors ignored during build');
  }
  
  if (nextConfigContent.includes('experimental')) {
    console.log('✅ Experimental features configured');
  }
  
} catch (error) {
  console.log('❌ Error reading next.config.ts:', error.message);
  allFilesExist = false;
}

// Check Vercel configuration
console.log('\n🚀 Checking Vercel configuration...');
try {
  const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  
  if (vercelConfig.buildCommand) {
    console.log('✅ Build command configured');
  }
  
  if (vercelConfig.framework === 'nextjs') {
    console.log('✅ Framework set to Next.js');
  }
  
  if (vercelConfig.functions) {
    console.log('✅ Function timeouts configured');
  }
  
} catch (error) {
  console.log('❌ Error reading vercel.json:', error.message);
  allFilesExist = false;
}

// Final result
console.log('\n' + '='.repeat(50));
if (allFilesExist) {
  console.log('🎉 BUILD CHECK PASSED - Ready for Vercel deployment!');
  console.log('\n📋 Next steps:');
  console.log('1. Push code to GitHub');
  console.log('2. Connect repository to Vercel');
  console.log('3. Add environment variables');
  console.log('4. Deploy!');
  process.exit(0);
} else {
  console.log('❌ BUILD CHECK FAILED - Please fix the issues above');
  process.exit(1);
}
