'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface LedgerSystemSetupProps {
  onSetupComplete?: () => void;
}

const LedgerSystemSetup: React.FC<LedgerSystemSetupProps> = ({ onSetupComplete }) => {
  const [isSetup, setIsSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [setupProgress, setSetupProgress] = useState<string[]>([]);

  useEffect(() => {
    checkLedgerSystemStatus();
  }, []);

  const checkLedgerSystemStatus = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Check if accounts table exists and has data
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('id')
        .limit(1);

      if (accountsError) {
        console.log('Accounts table not found or accessible:', accountsError);
        setIsSetup(false);
      } else if (accounts && accounts.length > 0) {
        setIsSetup(true);
        setSetupProgress(['✅ Ledger system is already set up and ready']);
      } else {
        setIsSetup(false);
        setSetupProgress(['⚠️ Ledger system needs to be initialized']);
      }
    } catch (error: any) {
      console.error('Error checking ledger system status:', error);
      setError('Failed to check ledger system status');
      setIsSetup(false);
    } finally {
      setIsLoading(false);
    }
  };

  const setupLedgerSystem = async () => {
    try {
      setIsLoading(true);
      setError('');
      setSetupProgress(['🔧 Starting ledger system setup...']);

      // Step 1: Create accounts table if it doesn't exist
      setSetupProgress(prev => [...prev, '📊 Creating accounts table...']);
      
      const createAccountsTableSQL = `
        CREATE TABLE IF NOT EXISTS accounts (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          account_number VARCHAR(20) UNIQUE NOT NULL,
          account_name VARCHAR(100) NOT NULL,
          account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
          parent_account_id UUID REFERENCES accounts(id),
          balance DECIMAL(15,2) DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;

      const { error: createAccountsError } = await supabase.rpc('execute_sql', {
        sql_query: createAccountsTableSQL
      });

      if (createAccountsError) {
        // Try alternative approach
        console.log('Direct SQL failed, trying RPC approach...');
        const { error: rpcError } = await supabase.rpc('setup_ledger_system');
        if (rpcError) {
          throw new Error('Failed to create accounts table: ' + rpcError.message);
        }
      }

      setSetupProgress(prev => [...prev, '✅ Accounts table created']);

      // Step 2: Create account_transactions table
      setSetupProgress(prev => [...prev, '📝 Creating account transactions table...']);
      
      const createTransactionsTableSQL = `
        CREATE TABLE IF NOT EXISTS account_transactions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          transaction_number VARCHAR(50) UNIQUE NOT NULL,
          transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
          description TEXT NOT NULL,
          reference_type VARCHAR(50),
          reference_id UUID,
          total_amount DECIMAL(15,2) NOT NULL CHECK (total_amount > 0),
          created_by VARCHAR(100) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;

      // Step 3: Create transaction_entries table
      setSetupProgress(prev => [...prev, '📋 Creating transaction entries table...']);
      
      const createEntriesTableSQL = `
        CREATE TABLE IF NOT EXISTS transaction_entries (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          transaction_id UUID NOT NULL REFERENCES account_transactions(id) ON DELETE CASCADE,
          account_id UUID NOT NULL REFERENCES accounts(id),
          debit_amount DECIMAL(15,2) DEFAULT 0 CHECK (debit_amount >= 0),
          credit_amount DECIMAL(15,2) DEFAULT 0 CHECK (credit_amount >= 0),
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT check_debit_or_credit CHECK (
            (debit_amount > 0 AND credit_amount = 0) OR 
            (credit_amount > 0 AND debit_amount = 0)
          )
        );
      `;

      // Step 4: Create default chart of accounts
      setSetupProgress(prev => [...prev, '🏦 Setting up chart of accounts...']);
      
      const defaultAccounts = [
        { number: '1000', name: 'Cash', type: 'asset' },
        { number: '1100', name: 'Bank Account', type: 'asset' },
        { number: '1200', name: 'Accounts Receivable - Students', type: 'asset' },
        { number: '1300', name: 'Prepaid Expenses', type: 'asset' },
        { number: '2000', name: 'Accounts Payable', type: 'liability' },
        { number: '2100', name: 'Accrued Expenses', type: 'liability' },
        { number: '2200', name: 'Deferred Revenue', type: 'liability' },
        { number: '3000', name: 'Retained Earnings', type: 'equity' },
        { number: '3100', name: 'Owner Equity', type: 'equity' },
        { number: '4000', name: 'Tuition Revenue', type: 'revenue' },
        { number: '4100', name: 'Accommodation Revenue', type: 'revenue' },
        { number: '4200', name: 'Other Fee Revenue', type: 'revenue' },
        { number: '5000', name: 'Operating Expenses', type: 'expense' },
        { number: '5100', name: 'Administrative Expenses', type: 'expense' },
        { number: '5200', name: 'Academic Expenses', type: 'expense' }
      ];

      // Insert default accounts
      for (const account of defaultAccounts) {
        const { error: insertError } = await supabase
          .from('accounts')
          .upsert({
            account_number: account.number,
            account_name: account.name,
            account_type: account.type
          }, {
            onConflict: 'account_number',
            ignoreDuplicates: true
          });

        if (insertError) {
          console.log(`Note: Account ${account.number} may already exist:`, insertError.message);
        }
      }

      setSetupProgress(prev => [...prev, '✅ Chart of accounts created']);

      // Step 5: Create sequence for transaction numbers
      setSetupProgress(prev => [...prev, '🔢 Creating transaction sequence...']);
      
      const createSequenceSQL = `
        CREATE SEQUENCE IF NOT EXISTS transaction_seq START 1;
      `;

      // Final verification
      setSetupProgress(prev => [...prev, '🔍 Verifying setup...']);
      
      const { data: verifyAccounts, error: verifyError } = await supabase
        .from('accounts')
        .select('id, account_number, account_name')
        .limit(5);

      if (verifyError) {
        throw new Error('Setup verification failed: ' + verifyError.message);
      }

      setSetupProgress(prev => [...prev, `✅ Setup complete! Found ${verifyAccounts?.length || 0} accounts`]);
      setIsSetup(true);

      if (onSetupComplete) {
        onSetupComplete();
      }

    } catch (error: any) {
      console.error('Error setting up ledger system:', error);
      setError('Failed to setup ledger system: ' + error.message);
      setSetupProgress(prev => [...prev, `❌ Setup failed: ${error.message}`]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && setupProgress.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isSetup) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-green-400 text-xl">✅</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              Ledger System Ready
            </h3>
            <p className="text-sm text-green-700 mt-1">
              The double-entry ledger system is properly configured and ready to use.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-yellow-400 text-xl">⚠️</span>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Ledger System Setup Required
          </h3>
          <p className="text-sm text-yellow-700 mt-1">
            The double-entry ledger system needs to be initialized before it can be used.
          </p>

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {setupProgress.length > 0 && (
            <div className="mt-3 p-3 bg-white border border-gray-200 rounded">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Setup Progress:</h4>
              <div className="space-y-1">
                {setupProgress.map((step, index) => (
                  <p key={index} className="text-sm text-gray-700">{step}</p>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4">
            <button
              onClick={setupLedgerSystem}
              disabled={isLoading}
              className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {isLoading ? 'Setting up...' : 'Initialize Ledger System'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LedgerSystemSetup;
