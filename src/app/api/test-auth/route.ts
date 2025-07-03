import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Test the authenticate_user function
    const { data, error } = await supabase
      .rpc('authenticate_user', {
        p_username: 'SMC20252025',
        p_password: 'vibranium1'
      });

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Authentication test successful'
    });

  } catch (err: any) {
    return NextResponse.json({ 
      success: false, 
      error: err.message,
      type: 'Network/Connection Error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    
    const { data, error } = await supabase
      .rpc('authenticate_user', {
        p_username: username,
        p_password: password
      });

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 401 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid credentials' 
      }, { status: 401 });
    }

    return NextResponse.json({ 
      success: true, 
      user: data[0],
      message: 'Login successful'
    });

  } catch (err: any) {
    return NextResponse.json({ 
      success: false, 
      error: err.message,
      type: 'Server Error'
    }, { status: 500 });
  }
}
