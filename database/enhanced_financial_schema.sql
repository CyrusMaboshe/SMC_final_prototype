-- Enhanced Financial Management System Database Schema
-- This file contains all the necessary tables, functions, and triggers for real-time financial management

-- Drop existing tables to restart from scratch
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS transaction_entries CASCADE;
DROP TABLE IF EXISTS account_transactions CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS accountant_audit_logs CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS financial_records CASCADE;

-- Create accounts table for account-based transaction tracking
CREATE TABLE accounts (
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

-- Create account_transactions table for double-entry bookkeeping
CREATE TABLE account_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    reference_type VARCHAR(50), -- 'payment', 'fee_record', 'adjustment'
    reference_id UUID, -- ID of the related record
    total_amount DECIMAL(15,2) NOT NULL CHECK (total_amount > 0),
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transaction_entries table for individual debit/credit entries
CREATE TABLE transaction_entries (
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

-- Create enhanced financial_records table
CREATE TABLE financial_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    academic_year VARCHAR(20) NOT NULL,
    semester INTEGER NOT NULL CHECK (semester IN (1, 2)),
    tuition_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    accommodation_fee DECIMAL(10,2) DEFAULT 0,
    other_fees DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue')),
    due_date DATE NOT NULL,
    transaction_id UUID REFERENCES account_transactions(id), -- Link to accounting transaction
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create enhanced payments table
CREATE TABLE payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'mobile_money', 'cheque', 'card')),
    reference_number VARCHAR(100),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    processed_by VARCHAR(100) NOT NULL,
    notes TEXT,
    transaction_id UUID REFERENCES account_transactions(id), -- Link to accounting transaction
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audit_logs table for comprehensive tracking
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_by VARCHAR(100),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comprehensive indexes for performance
CREATE INDEX idx_accounts_account_number ON accounts(account_number);
CREATE INDEX idx_accounts_account_type ON accounts(account_type);
CREATE INDEX idx_accounts_parent_account_id ON accounts(parent_account_id);
CREATE INDEX idx_accounts_is_active ON accounts(is_active);

CREATE INDEX idx_account_transactions_transaction_number ON account_transactions(transaction_number);
CREATE INDEX idx_account_transactions_transaction_date ON account_transactions(transaction_date);
CREATE INDEX idx_account_transactions_reference_type ON account_transactions(reference_type);
CREATE INDEX idx_account_transactions_reference_id ON account_transactions(reference_id);

CREATE INDEX idx_transaction_entries_transaction_id ON transaction_entries(transaction_id);
CREATE INDEX idx_transaction_entries_account_id ON transaction_entries(account_id);

CREATE INDEX idx_financial_records_student_id ON financial_records(student_id);
CREATE INDEX idx_financial_records_academic_year ON financial_records(academic_year);
CREATE INDEX idx_financial_records_semester ON financial_records(semester);
CREATE INDEX idx_financial_records_payment_status ON financial_records(payment_status);
CREATE INDEX idx_financial_records_due_date ON financial_records(due_date);
CREATE INDEX idx_financial_records_transaction_id ON financial_records(transaction_id);

CREATE INDEX idx_payments_student_id ON payments(student_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);
CREATE INDEX idx_payments_payment_method ON payments(payment_method);
CREATE INDEX idx_payments_reference_number ON payments(reference_number);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id);

CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_changed_at ON audit_logs(changed_at);

-- Enable Row Level Security
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for accounts (accountants only)
CREATE POLICY "Accountants can manage accounts" ON accounts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM system_users 
            WHERE id = auth.uid() AND user_type = 'accountant'
        )
    );

-- Create RLS policies for account_transactions (accountants only)
CREATE POLICY "Accountants can manage transactions" ON account_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM system_users 
            WHERE id = auth.uid() AND user_type = 'accountant'
        )
    );

-- Create RLS policies for transaction_entries (accountants only)
CREATE POLICY "Accountants can manage transaction entries" ON transaction_entries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM system_users 
            WHERE id = auth.uid() AND user_type = 'accountant'
        )
    );

-- Create RLS policies for financial_records
CREATE POLICY "Accountants can manage all financial records" ON financial_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM system_users 
            WHERE id = auth.uid() AND user_type = 'accountant'
        )
    );

CREATE POLICY "Students can view their own financial records" ON financial_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM students s
            JOIN system_users su ON s.user_id = su.id
            WHERE s.id = financial_records.student_id AND su.id = auth.uid()
        )
    );

-- Create RLS policies for payments
CREATE POLICY "Accountants can manage all payments" ON payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM system_users 
            WHERE id = auth.uid() AND user_type = 'accountant'
        )
    );

CREATE POLICY "Students can view their own payments" ON payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM students s
            JOIN system_users su ON s.user_id = su.id
            WHERE s.id = payments.student_id AND su.id = auth.uid()
        )
    );

-- Create RLS policies for audit_logs (accountants only)
CREATE POLICY "Accountants can view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM system_users
            WHERE id = auth.uid() AND user_type = 'accountant'
        )
    );

-- Create trigger functions for real-time updates and calculations

-- Function to update account balances in real-time
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update account balance based on transaction entries
    IF TG_OP = 'INSERT' THEN
        UPDATE accounts
        SET balance = balance + COALESCE(NEW.credit_amount, 0) - COALESCE(NEW.debit_amount, 0),
            updated_at = NOW()
        WHERE id = NEW.account_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Reverse old entry
        UPDATE accounts
        SET balance = balance - COALESCE(OLD.credit_amount, 0) + COALESCE(OLD.debit_amount, 0),
            updated_at = NOW()
        WHERE id = OLD.account_id;
        -- Apply new entry
        UPDATE accounts
        SET balance = balance + COALESCE(NEW.credit_amount, 0) - COALESCE(NEW.debit_amount, 0),
            updated_at = NOW()
        WHERE id = NEW.account_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE accounts
        SET balance = balance - COALESCE(OLD.credit_amount, 0) + COALESCE(OLD.debit_amount, 0),
            updated_at = NOW()
        WHERE id = OLD.account_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically calculate financial totals and balance
CREATE OR REPLACE FUNCTION calculate_financial_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate total amount
    NEW.total_amount = COALESCE(NEW.tuition_fee, 0) + COALESCE(NEW.accommodation_fee, 0) + COALESCE(NEW.other_fees, 0);

    -- Calculate balance (total_amount - amount_paid)
    NEW.balance = NEW.total_amount - COALESCE(NEW.amount_paid, 0);

    -- Update payment status based on balance
    IF NEW.balance <= 0 THEN
        NEW.payment_status = 'paid';
    ELSIF NEW.amount_paid > 0 THEN
        NEW.payment_status = 'partial';
    ELSIF NEW.due_date < CURRENT_DATE THEN
        NEW.payment_status = 'overdue';
    ELSE
        NEW.payment_status = 'pending';
    END IF;

    -- Set updated_at timestamp
    NEW.updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update financial record when payment is made
CREATE OR REPLACE FUNCTION update_financial_record_on_payment()
RETURNS TRIGGER AS $$
DECLARE
    student_uuid UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update amount_paid in financial_records
        UPDATE financial_records
        SET amount_paid = (
            SELECT COALESCE(SUM(amount), 0)
            FROM payments
            WHERE student_id = NEW.student_id
        ),
        updated_at = NOW()
        WHERE student_id = NEW.student_id;

        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Update amount_paid for both old and new student if different
        UPDATE financial_records
        SET amount_paid = (
            SELECT COALESCE(SUM(amount), 0)
            FROM payments
            WHERE student_id = NEW.student_id
        ),
        updated_at = NOW()
        WHERE student_id = NEW.student_id;

        IF OLD.student_id != NEW.student_id THEN
            UPDATE financial_records
            SET amount_paid = (
                SELECT COALESCE(SUM(amount), 0)
                FROM payments
                WHERE student_id = OLD.student_id
            ),
            updated_at = NOW()
            WHERE student_id = OLD.student_id;
        END IF;

        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Update amount_paid in financial_records
        UPDATE financial_records
        SET amount_paid = (
            SELECT COALESCE(SUM(amount), 0)
            FROM payments
            WHERE student_id = OLD.student_id
        ),
        updated_at = NOW()
        WHERE student_id = OLD.student_id;

        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (table_name, record_id, action, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), current_user);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), current_user);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), current_user);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for real-time updates

-- Trigger for account balance updates
DROP TRIGGER IF EXISTS update_account_balance_trigger ON transaction_entries;
CREATE TRIGGER update_account_balance_trigger
    AFTER INSERT OR UPDATE OR DELETE ON transaction_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_account_balance();

-- Trigger for financial record calculations
DROP TRIGGER IF EXISTS calculate_financial_totals_trigger ON financial_records;
CREATE TRIGGER calculate_financial_totals_trigger
    BEFORE INSERT OR UPDATE ON financial_records
    FOR EACH ROW
    EXECUTE FUNCTION calculate_financial_totals();

-- Trigger for payment updates
DROP TRIGGER IF EXISTS update_financial_on_payment ON payments;
CREATE TRIGGER update_financial_on_payment
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_financial_record_on_payment();

-- Audit triggers
DROP TRIGGER IF EXISTS audit_accounts_trigger ON accounts;
CREATE TRIGGER audit_accounts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

DROP TRIGGER IF EXISTS audit_financial_records_trigger ON financial_records;
CREATE TRIGGER audit_financial_records_trigger
    AFTER INSERT OR UPDATE OR DELETE ON financial_records
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

DROP TRIGGER IF EXISTS audit_payments_trigger ON payments;
CREATE TRIGGER audit_payments_trigger
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

DROP TRIGGER IF EXISTS audit_transactions_trigger ON account_transactions;
CREATE TRIGGER audit_transactions_trigger
    AFTER INSERT OR UPDATE OR DELETE ON account_transactions
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

-- Insert default chart of accounts
INSERT INTO accounts (account_number, account_name, account_type) VALUES
('1000', 'Cash', 'asset'),
('1100', 'Accounts Receivable', 'asset'),
('1200', 'Student Fees Receivable', 'asset'),
('2000', 'Accounts Payable', 'liability'),
('2100', 'Student Deposits', 'liability'),
('3000', 'Retained Earnings', 'equity'),
('4000', 'Tuition Revenue', 'revenue'),
('4100', 'Accommodation Revenue', 'revenue'),
('4200', 'Other Fee Revenue', 'revenue'),
('5000', 'Operating Expenses', 'expense')
ON CONFLICT (account_number) DO NOTHING;

-- RPC Functions for Financial Management API

-- Function to create financial record with accounting transaction
CREATE OR REPLACE FUNCTION accountant_create_financial_record(
    p_student_id VARCHAR,
    p_academic_year VARCHAR,
    p_semester INTEGER,
    p_tuition_fee DECIMAL,
    p_accommodation_fee DECIMAL DEFAULT 0,
    p_other_fees DECIMAL DEFAULT 0,
    p_due_date DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student_uuid UUID;
    v_total_amount DECIMAL;
    v_transaction_id UUID;
    v_transaction_number VARCHAR;
    v_record_id UUID;
    v_receivable_account_id UUID;
    v_tuition_account_id UUID;
    v_accommodation_account_id UUID;
    v_other_account_id UUID;
BEGIN
    -- Get student UUID from student_id
    SELECT id INTO v_student_uuid
    FROM students
    WHERE student_id = p_student_id;

    IF v_student_uuid IS NULL THEN
        RAISE EXCEPTION 'Student not found with ID: %', p_student_id;
    END IF;

    -- Calculate total amount
    v_total_amount := COALESCE(p_tuition_fee, 0) + COALESCE(p_accommodation_fee, 0) + COALESCE(p_other_fees, 0);

    -- Generate transaction number
    v_transaction_number := 'FEE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('transaction_seq')::TEXT, 6, '0');

    -- Get account IDs
    SELECT id INTO v_receivable_account_id FROM accounts WHERE account_number = '1200';
    SELECT id INTO v_tuition_account_id FROM accounts WHERE account_number = '4000';
    SELECT id INTO v_accommodation_account_id FROM accounts WHERE account_number = '4100';
    SELECT id INTO v_other_account_id FROM accounts WHERE account_number = '4200';

    -- Create accounting transaction
    INSERT INTO account_transactions (
        transaction_number, description, reference_type, total_amount, created_by
    ) VALUES (
        v_transaction_number,
        'Student fees for ' || p_academic_year || ' Semester ' || p_semester,
        'fee_record',
        v_total_amount,
        current_user
    ) RETURNING id INTO v_transaction_id;

    -- Create financial record
    INSERT INTO financial_records (
        student_id, academic_year, semester, tuition_fee, accommodation_fee,
        other_fees, due_date, transaction_id
    ) VALUES (
        v_student_uuid, p_academic_year, p_semester, p_tuition_fee,
        p_accommodation_fee, p_other_fees, p_due_date, v_transaction_id
    ) RETURNING id INTO v_record_id;

    -- Update transaction reference_id
    UPDATE account_transactions
    SET reference_id = v_record_id
    WHERE id = v_transaction_id;

    -- Create transaction entries (double-entry bookkeeping)
    -- Debit: Student Fees Receivable
    INSERT INTO transaction_entries (transaction_id, account_id, debit_amount, description)
    VALUES (v_transaction_id, v_receivable_account_id, v_total_amount, 'Student fees receivable');

    -- Credit: Revenue accounts
    IF p_tuition_fee > 0 THEN
        INSERT INTO transaction_entries (transaction_id, account_id, credit_amount, description)
        VALUES (v_transaction_id, v_tuition_account_id, p_tuition_fee, 'Tuition fee revenue');
    END IF;

    IF p_accommodation_fee > 0 THEN
        INSERT INTO transaction_entries (transaction_id, account_id, credit_amount, description)
        VALUES (v_transaction_id, v_accommodation_account_id, p_accommodation_fee, 'Accommodation fee revenue');
    END IF;

    IF p_other_fees > 0 THEN
        INSERT INTO transaction_entries (transaction_id, account_id, credit_amount, description)
        VALUES (v_transaction_id, v_other_account_id, p_other_fees, 'Other fee revenue');
    END IF;

    RETURN v_record_id;
END;
$$;

-- Create sequence for transaction numbers
CREATE SEQUENCE IF NOT EXISTS transaction_seq START 1;

-- Function to record payment with accounting transaction
CREATE OR REPLACE FUNCTION accountant_record_payment(
    p_student_id VARCHAR,
    p_amount DECIMAL,
    p_payment_method VARCHAR DEFAULT 'cash',
    p_reference_number VARCHAR DEFAULT NULL,
    p_payment_date DATE DEFAULT CURRENT_DATE,
    p_processed_by VARCHAR DEFAULT current_user,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student_uuid UUID;
    v_transaction_id UUID;
    v_transaction_number VARCHAR;
    v_payment_id UUID;
    v_cash_account_id UUID;
    v_receivable_account_id UUID;
BEGIN
    -- Get student UUID from student_id
    SELECT id INTO v_student_uuid
    FROM students
    WHERE student_id = p_student_id;

    IF v_student_uuid IS NULL THEN
        RAISE EXCEPTION 'Student not found with ID: %', p_student_id;
    END IF;

    -- Generate transaction number
    v_transaction_number := 'PAY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('transaction_seq')::TEXT, 6, '0');

    -- Get account IDs
    SELECT id INTO v_cash_account_id FROM accounts WHERE account_number = '1000';
    SELECT id INTO v_receivable_account_id FROM accounts WHERE account_number = '1200';

    -- Create accounting transaction
    INSERT INTO account_transactions (
        transaction_number, description, reference_type, total_amount, created_by
    ) VALUES (
        v_transaction_number,
        'Payment received from student ' || p_student_id,
        'payment',
        p_amount,
        p_processed_by
    ) RETURNING id INTO v_transaction_id;

    -- Create payment record
    INSERT INTO payments (
        student_id, amount, payment_method, reference_number,
        payment_date, processed_by, notes, transaction_id
    ) VALUES (
        v_student_uuid, p_amount, p_payment_method, p_reference_number,
        p_payment_date, p_processed_by, p_notes, v_transaction_id
    ) RETURNING id INTO v_payment_id;

    -- Update transaction reference_id
    UPDATE account_transactions
    SET reference_id = v_payment_id
    WHERE id = v_transaction_id;

    -- Create transaction entries (double-entry bookkeeping)
    -- Debit: Cash
    INSERT INTO transaction_entries (transaction_id, account_id, debit_amount, description)
    VALUES (v_transaction_id, v_cash_account_id, p_amount, 'Payment received');

    -- Credit: Student Fees Receivable
    INSERT INTO transaction_entries (transaction_id, account_id, credit_amount, description)
    VALUES (v_transaction_id, v_receivable_account_id, p_amount, 'Payment against receivable');

    RETURN v_payment_id;
END;
$$;

-- Function to get all financial records for accountant
CREATE OR REPLACE FUNCTION accountant_get_all_financial_records()
RETURNS TABLE (
    id UUID,
    student_id UUID,
    student_number VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    academic_year VARCHAR,
    semester INTEGER,
    tuition_fee DECIMAL,
    accommodation_fee DECIMAL,
    other_fees DECIMAL,
    total_amount DECIMAL,
    amount_paid DECIMAL,
    balance DECIMAL,
    payment_status VARCHAR,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        fr.id,
        fr.student_id,
        s.student_id as student_number,
        s.first_name,
        s.last_name,
        fr.academic_year,
        fr.semester,
        fr.tuition_fee,
        fr.accommodation_fee,
        fr.other_fees,
        fr.total_amount,
        fr.amount_paid,
        fr.balance,
        fr.payment_status,
        fr.due_date,
        fr.created_at,
        fr.updated_at
    FROM financial_records fr
    JOIN students s ON fr.student_id = s.id
    ORDER BY fr.created_at DESC;
END;
$$;

-- Function to get all payments for accountant
CREATE OR REPLACE FUNCTION accountant_get_all_payments()
RETURNS TABLE (
    id UUID,
    student_id UUID,
    student_number VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    amount DECIMAL,
    payment_method VARCHAR,
    reference_number VARCHAR,
    payment_date DATE,
    processed_by VARCHAR,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.student_id,
        s.student_id as student_number,
        s.first_name,
        s.last_name,
        p.amount,
        p.payment_method,
        p.reference_number,
        p.payment_date,
        p.processed_by,
        p.notes,
        p.created_at
    FROM payments p
    JOIN students s ON p.student_id = s.id
    ORDER BY p.created_at DESC;
END;
$$;

-- Function to get all students for accountant
CREATE OR REPLACE FUNCTION accountant_get_all_students()
RETURNS TABLE (
    id UUID,
    student_id VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    email VARCHAR,
    program VARCHAR,
    year_of_study INTEGER,
    semester INTEGER,
    status VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.student_id,
        s.first_name,
        s.last_name,
        s.email,
        s.program,
        s.year_of_study,
        s.semester,
        s.status
    FROM students s
    ORDER BY s.student_id;
END;
$$;

-- Function to get student financial records (for student portal)
CREATE OR REPLACE FUNCTION student_get_financial_records(p_student_number VARCHAR)
RETURNS TABLE (
    id UUID,
    academic_year VARCHAR,
    semester INTEGER,
    tuition_fee DECIMAL,
    accommodation_fee DECIMAL,
    other_fees DECIMAL,
    total_amount DECIMAL,
    amount_paid DECIMAL,
    balance DECIMAL,
    payment_status VARCHAR,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student_uuid UUID;
BEGIN
    -- Get student UUID from student_id
    SELECT id INTO v_student_uuid
    FROM students
    WHERE student_id = p_student_number;

    IF v_student_uuid IS NULL THEN
        RAISE EXCEPTION 'Student not found with ID: %', p_student_number;
    END IF;

    RETURN QUERY
    SELECT
        fr.id,
        fr.academic_year,
        fr.semester,
        fr.tuition_fee,
        fr.accommodation_fee,
        fr.other_fees,
        fr.total_amount,
        fr.amount_paid,
        fr.balance,
        fr.payment_status,
        fr.due_date,
        fr.created_at,
        fr.updated_at
    FROM financial_records fr
    WHERE fr.student_id = v_student_uuid
    ORDER BY fr.academic_year DESC, fr.semester DESC;
END;
$$;

-- Function to get student payments (for student portal)
CREATE OR REPLACE FUNCTION student_get_payments(p_student_number VARCHAR)
RETURNS TABLE (
    id UUID,
    amount DECIMAL,
    payment_method VARCHAR,
    reference_number VARCHAR,
    payment_date DATE,
    processed_by VARCHAR,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student_uuid UUID;
BEGIN
    -- Get student UUID from student_id
    SELECT id INTO v_student_uuid
    FROM students
    WHERE student_id = p_student_number;

    IF v_student_uuid IS NULL THEN
        RAISE EXCEPTION 'Student not found with ID: %', p_student_number;
    END IF;

    RETURN QUERY
    SELECT
        p.id,
        p.amount,
        p.payment_method,
        p.reference_number,
        p.payment_date,
        p.processed_by,
        p.notes,
        p.created_at
    FROM payments p
    WHERE p.student_id = v_student_uuid
    ORDER BY p.payment_date DESC, p.created_at DESC;
END;
$$;

-- Function to get account balances (for accountant reporting)
CREATE OR REPLACE FUNCTION accountant_get_account_balances()
RETURNS TABLE (
    id UUID,
    account_number VARCHAR,
    account_name VARCHAR,
    account_type VARCHAR,
    balance DECIMAL,
    is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.account_number,
        a.account_name,
        a.account_type,
        a.balance,
        a.is_active
    FROM accounts a
    WHERE a.is_active = true
    ORDER BY a.account_number;
END;
$$;

-- Function to get transaction history (for accountant reporting)
CREATE OR REPLACE FUNCTION accountant_get_transaction_history(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    transaction_id UUID,
    transaction_number VARCHAR,
    transaction_date DATE,
    description TEXT,
    total_amount DECIMAL,
    account_name VARCHAR,
    debit_amount DECIMAL,
    credit_amount DECIMAL,
    created_by VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        at.id as transaction_id,
        at.transaction_number,
        at.transaction_date,
        at.description,
        at.total_amount,
        a.account_name,
        te.debit_amount,
        te.credit_amount,
        at.created_by
    FROM account_transactions at
    JOIN transaction_entries te ON at.id = te.transaction_id
    JOIN accounts a ON te.account_id = a.id
    WHERE (p_start_date IS NULL OR at.transaction_date >= p_start_date)
      AND (p_end_date IS NULL OR at.transaction_date <= p_end_date)
    ORDER BY at.transaction_date DESC, at.created_at DESC
    LIMIT p_limit;
END;
$$;

-- Enable real-time subscriptions for all financial tables
ALTER PUBLICATION supabase_realtime ADD TABLE accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE account_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE transaction_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE financial_records;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
