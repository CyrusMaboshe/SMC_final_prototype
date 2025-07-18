import { NextRequest, NextResponse } from 'next/server';
import { createAccessControlTables, testTablesExist } from '@/utils/createTables';

export async function POST(request: NextRequest) {
  try {
    console.log('📡 API: Starting database setup...');
    
    const result = await createAccessControlTables();
    
    if (result.success) {
      console.log('✅ API: Database setup completed successfully');
      return NextResponse.json({ 
        success: true, 
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('❌ API: Database setup failed:', result.error);
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('❌ API: Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📡 API: Testing table existence...');
    
    const results = await testTablesExist();
    
    return NextResponse.json({ 
      success: true, 
      tables: results,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ API: Error testing tables:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
