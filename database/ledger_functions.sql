-- Double Entry Ledger Functions
-- This file contains the database functions needed for the double-entry ledger system

-- Function to get student-specific ledger entries
CREATE OR REPLACE FUNCTION get_student_ledger_entries(
    p_student_id UUID,
    p_from_date DATE DEFAULT NULL,
    p_to_date DATE DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    date DATE,
    transaction_number VARCHAR,
    description TEXT,
    reference_type VARCHAR,
    reference_number VARCHAR,
    debit_amount DECIMAL,
    credit_amount DECIMAL,
    running_balance DECIMAL,
    account_name VARCHAR,
    account_type VARCHAR,
    student_name VARCHAR,
    student_id VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH student_transactions AS (
        SELECT 
            te.id,
            at.transaction_date as date,
            at.transaction_number,
            COALESCE(te.description, at.description) as description,
            at.reference_type,
            CASE 
                WHEN at.reference_type = 'payment' THEN p.reference_number
                WHEN at.reference_type = 'fee_record' THEN fr.id::VARCHAR
                ELSE NULL
            END as reference_number,
            te.debit_amount,
            te.credit_amount,
            a.account_name,
            a.account_type,
            CONCAT(s.first_name, ' ', s.last_name) as student_name,
            s.student_id as student_number,
            ROW_NUMBER() OVER (ORDER BY at.transaction_date, at.created_at, te.id) as rn
        FROM transaction_entries te
        JOIN account_transactions at ON te.transaction_id = at.id
        JOIN accounts a ON te.account_id = a.id
        LEFT JOIN payments p ON at.reference_type = 'payment' AND at.reference_id = p.id
        LEFT JOIN financial_records fr ON at.reference_type = 'fee_record' AND at.reference_id = fr.id
        LEFT JOIN students s ON COALESCE(p.student_id, fr.student_id) = s.id
        WHERE COALESCE(p.student_id, fr.student_id) = p_student_id
        AND (p_from_date IS NULL OR at.transaction_date >= p_from_date)
        AND (p_to_date IS NULL OR at.transaction_date <= p_to_date)
    ),
    running_balances AS (
        SELECT 
            st.*,
            SUM(st.debit_amount - st.credit_amount) OVER (
                ORDER BY st.date, st.rn 
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) as running_balance
        FROM student_transactions st
    )
    SELECT 
        rb.id,
        rb.date,
        rb.transaction_number,
        rb.description,
        rb.reference_type,
        rb.reference_number,
        rb.debit_amount,
        rb.credit_amount,
        rb.running_balance,
        rb.account_name,
        rb.account_type,
        rb.student_name,
        rb.student_number
    FROM running_balances rb
    ORDER BY rb.date, rb.rn;
END;
$$ LANGUAGE plpgsql;

-- Function to get full ledger entries (for accountants)
CREATE OR REPLACE FUNCTION get_full_ledger_entries(
    p_account_filter UUID DEFAULT NULL,
    p_from_date DATE DEFAULT NULL,
    p_to_date DATE DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    date DATE,
    transaction_number VARCHAR,
    description TEXT,
    reference_type VARCHAR,
    reference_number VARCHAR,
    debit_amount DECIMAL,
    credit_amount DECIMAL,
    running_balance DECIMAL,
    account_name VARCHAR,
    account_type VARCHAR,
    student_name VARCHAR,
    student_id VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH all_transactions AS (
        SELECT 
            te.id,
            at.transaction_date as date,
            at.transaction_number,
            COALESCE(te.description, at.description) as description,
            at.reference_type,
            CASE 
                WHEN at.reference_type = 'payment' THEN p.reference_number
                WHEN at.reference_type = 'fee_record' THEN fr.id::VARCHAR
                ELSE NULL
            END as reference_number,
            te.debit_amount,
            te.credit_amount,
            a.account_name,
            a.account_type,
            CONCAT(s.first_name, ' ', s.last_name) as student_name,
            s.student_id as student_number,
            te.account_id,
            ROW_NUMBER() OVER (ORDER BY at.transaction_date, at.created_at, te.id) as rn
        FROM transaction_entries te
        JOIN account_transactions at ON te.transaction_id = at.id
        JOIN accounts a ON te.account_id = a.id
        LEFT JOIN payments p ON at.reference_type = 'payment' AND at.reference_id = p.id
        LEFT JOIN financial_records fr ON at.reference_type = 'fee_record' AND at.reference_id = fr.id
        LEFT JOIN students s ON COALESCE(p.student_id, fr.student_id) = s.id
        WHERE (p_account_filter IS NULL OR te.account_id = p_account_filter)
        AND (p_from_date IS NULL OR at.transaction_date >= p_from_date)
        AND (p_to_date IS NULL OR at.transaction_date <= p_to_date)
    ),
    running_balances AS (
        SELECT 
            at.*,
            SUM(at.debit_amount - at.credit_amount) OVER (
                PARTITION BY at.account_id
                ORDER BY at.date, at.rn 
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) as running_balance
        FROM all_transactions at
    )
    SELECT 
        rb.id,
        rb.date,
        rb.transaction_number,
        rb.description,
        rb.reference_type,
        rb.reference_number,
        rb.debit_amount,
        rb.credit_amount,
        rb.running_balance,
        rb.account_name,
        rb.account_type,
        rb.student_name,
        rb.student_number
    FROM running_balances rb
    ORDER BY rb.date, rb.rn;
END;
$$ LANGUAGE plpgsql;

-- Function to create default chart of accounts
CREATE OR REPLACE FUNCTION create_default_chart_of_accounts()
RETURNS VOID AS $$
BEGIN
    -- Insert default accounts if they don't exist
    INSERT INTO accounts (account_number, account_name, account_type) VALUES
    ('1000', 'Cash', 'asset'),
    ('1100', 'Bank Account', 'asset'),
    ('1200', 'Accounts Receivable - Students', 'asset'),
    ('1300', 'Prepaid Expenses', 'asset'),
    ('2000', 'Accounts Payable', 'liability'),
    ('2100', 'Accrued Expenses', 'liability'),
    ('2200', 'Deferred Revenue', 'liability'),
    ('3000', 'Retained Earnings', 'equity'),
    ('3100', 'Owner Equity', 'equity'),
    ('4000', 'Tuition Revenue', 'revenue'),
    ('4100', 'Accommodation Revenue', 'revenue'),
    ('4200', 'Other Fee Revenue', 'revenue'),
    ('5000', 'Operating Expenses', 'expense'),
    ('5100', 'Administrative Expenses', 'expense'),
    ('5200', 'Academic Expenses', 'expense')
    ON CONFLICT (account_number) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function to ensure ledger system is properly set up
CREATE OR REPLACE FUNCTION setup_ledger_system()
RETURNS TEXT AS $$
DECLARE
    result_message TEXT := '';
BEGIN
    -- Create default chart of accounts
    PERFORM create_default_chart_of_accounts();
    result_message := result_message || 'Chart of accounts created. ';
    
    -- Create sequence for transaction numbers if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'transaction_seq') THEN
        CREATE SEQUENCE transaction_seq START 1;
        result_message := result_message || 'Transaction sequence created. ';
    END IF;
    
    result_message := result_message || 'Ledger system setup complete.';
    RETURN result_message;
END;
$$ LANGUAGE plpgsql;

-- Function to get account balances summary
CREATE OR REPLACE FUNCTION get_account_balances_summary()
RETURNS TABLE (
    account_type VARCHAR,
    total_balance DECIMAL,
    account_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.account_type,
        COALESCE(SUM(a.balance), 0) as total_balance,
        COUNT(*)::INTEGER as account_count
    FROM accounts a
    WHERE a.is_active = true
    GROUP BY a.account_type
    ORDER BY a.account_type;
END;
$$ LANGUAGE plpgsql;
