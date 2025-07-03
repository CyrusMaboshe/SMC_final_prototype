'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestConnection() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setResult('Testing connection...');

    try {
      // Test 1: Basic fetch to Supabase URL
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`
        }
      });

      if (!response.ok) {
        setResult(`❌ Basic fetch failed: ${response.status} ${response.statusText}`);
        return;
      }

      setResult('✅ Basic fetch successful! Testing Supabase client...');

      // Test 2: Basic Supabase connection
      const { data, error } = await supabase
        .from('system_users')
        .select('count')
        .limit(1);

      if (error) {
        setResult(`❌ Supabase client error: ${error.message}`);
        return;
      }

      setResult('✅ Supabase client works! Testing auth function...');

      // Test 3: Test the authenticate_user function
      const { data: authData, error: authError } = await supabase
        .rpc('authenticate_user', {
          p_username: 'SMC20252025',
          p_password: 'vibranium1'
        });

      if (authError) {
        setResult(`❌ Auth Function Error: ${authError.message}`);
        return;
      }

      setResult(`✅ All tests passed! Auth data: ${JSON.stringify(authData, null, 2)}`);

    } catch (err: any) {
      setResult(`❌ Network Error: ${err.message}\n\nThis suggests a network connectivity issue. Please check:\n1. Internet connection\n2. Firewall settings\n3. Try a different network`);
    } finally {
      setLoading(false);
    }
  };

  const testEnvVars = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    setResult(`
Environment Variables:
- SUPABASE_URL: ${url ? '✅ Set' : '❌ Missing'}
- SUPABASE_ANON_KEY: ${key ? '✅ Set' : '❌ Missing'}

URL: ${url}
Key: ${key ? key.substring(0, 20) + '...' : 'Not found'}
    `);
  };

  const testServerSide = async () => {
    setLoading(true);
    setResult('Testing server-side connection...');

    try {
      const response = await fetch('/api/test-auth');
      const data = await response.json();

      if (data.success) {
        setResult(`✅ Server-side test successful!\n${JSON.stringify(data, null, 2)}`);
      } else {
        setResult(`❌ Server-side test failed: ${data.error}`);
      }
    } catch (err: any) {
      setResult(`❌ Server-side test error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Connection Test</h1>
      
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <button
            onClick={testEnvVars}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Test Environment Variables
          </button>

          <button
            onClick={testServerSide}
            disabled={loading}
            className="bg-purple-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
          >
            {loading ? 'Testing...' : 'Test Server-Side Connection'}
          </button>

          <button
            onClick={testConnection}
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
          >
            {loading ? 'Testing...' : 'Test Client-Side Connection'}
          </button>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-gray-100 rounded">
        <h3 className="font-bold mb-2">Result:</h3>
        <pre className="whitespace-pre-wrap">{result}</pre>
      </div>
    </div>
  );
}
