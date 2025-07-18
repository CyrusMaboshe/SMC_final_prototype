-- Ledger Adjustments Table
-- This table stores manual adjustments made by accountants to student ledgers

CREATE TABLE IF NOT EXISTS ledger_adjustments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    reference_number VARCHAR(100) NOT NULL,
    debit_amount DECIMAL(15,2) DEFAULT 0 CHECK (debit_amount >= 0),
    credit_amount DECIMAL(15,2) DEFAULT 0 CHECK (credit_amount >= 0),
    type VARCHAR(50) NOT NULL CHECK (type IN ('fee', 'payment', 'adjustment')),
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_debit_or_credit CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR 
        (credit_amount > 0 AND debit_amount = 0)
    )
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_ledger_adjustments_student_id ON ledger_adjustments(student_id);
CREATE INDEX IF NOT EXISTS idx_ledger_adjustments_date ON ledger_adjustments(date);
CREATE INDEX IF NOT EXISTS idx_ledger_adjustments_type ON ledger_adjustments(type);

-- Function to get complete student ledger including adjustments
CREATE OR REPLACE FUNCTION get_complete_student_ledger(
    p_student_id UUID,
    p_from_date DATE DEFAULT NULL,
    p_to_date DATE DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    date DATE,
    description TEXT,
    reference_number VARCHAR,
    debit_amount DECIMAL,
    credit_amount DECIMAL,
    running_balance DECIMAL,
    entry_type VARCHAR,
    source_table VARCHAR,
    editable BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH all_entries AS (
        -- Financial Records (Fees)
        SELECT 
            fr.id,
            COALESCE(fr.due_date, fr.created_at::DATE) as date,
            CONCAT(fr.academic_year, ' Semester ', fr.semester, ' Fees') as description,
            CONCAT('FEE-', SUBSTRING(fr.id::TEXT, 1, 8)) as reference_number,
            fr.total_amount as debit_amount,
            0::DECIMAL as credit_amount,
            'fee'::VARCHAR as entry_type,
            'financial_records'::VARCHAR as source_table,
            true as editable
        FROM financial_records fr
        WHERE fr.student_id = p_student_id
        AND (p_from_date IS NULL OR COALESCE(fr.due_date, fr.created_at::DATE) >= p_from_date)
        AND (p_to_date IS NULL OR COALESCE(fr.due_date, fr.created_at::DATE) <= p_to_date)
        
        UNION ALL
        
        -- Payments
        SELECT 
            p.id,
            p.payment_date as date,
            CONCAT('Payment - ', p.payment_method, 
                   CASE WHEN p.notes IS NOT NULL THEN CONCAT(' (', p.notes, ')') ELSE '' END) as description,
            COALESCE(p.reference_number, CONCAT('PAY-', SUBSTRING(p.id::TEXT, 1, 8))) as reference_number,
            0::DECIMAL as debit_amount,
            p.amount as credit_amount,
            'payment'::VARCHAR as entry_type,
            'payments'::VARCHAR as source_table,
            true as editable
        FROM payments p
        WHERE p.student_id = p_student_id
        AND (p_from_date IS NULL OR p.payment_date >= p_from_date)
        AND (p_to_date IS NULL OR p.payment_date <= p_to_date)
        
        UNION ALL
        
        -- Ledger Adjustments
        SELECT 
            la.id,
            la.date,
            la.description,
            la.reference_number,
            la.debit_amount,
            la.credit_amount,
            la.type as entry_type,
            'ledger_adjustments'::VARCHAR as source_table,
            true as editable
        FROM ledger_adjustments la
        WHERE la.student_id = p_student_id
        AND (p_from_date IS NULL OR la.date >= p_from_date)
        AND (p_to_date IS NULL OR la.date <= p_to_date)
    ),
    ordered_entries AS (
        SELECT 
            ae.*,
            ROW_NUMBER() OVER (ORDER BY ae.date, ae.id) as rn
        FROM all_entries ae
    ),
    entries_with_balance AS (
        SELECT 
            oe.*,
            SUM(oe.debit_amount - oe.credit_amount) OVER (
                ORDER BY oe.date, oe.id 
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) as running_balance
        FROM ordered_entries oe
    )
    SELECT 
        ewb.id,
        ewb.date,
        ewb.description,
        ewb.reference_number,
        ewb.debit_amount,
        ewb.credit_amount,
        ewb.running_balance,
        ewb.entry_type,
        ewb.source_table,
        ewb.editable
    FROM entries_with_balance ewb
    ORDER BY ewb.date, ewb.id;
END;
$$ LANGUAGE plpgsql;

-- Function to get ledger balance for a student
CREATE OR REPLACE FUNCTION get_student_ledger_balance(p_student_id UUID)
RETURNS TABLE (
    total_debits DECIMAL,
    total_credits DECIMAL,
    balance DECIMAL,
    entry_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH ledger_summary AS (
        SELECT 
            COALESCE(SUM(debit_amount), 0) as total_debits,
            COALESCE(SUM(credit_amount), 0) as total_credits,
            COUNT(*)::INTEGER as entry_count
        FROM get_complete_student_ledger(p_student_id)
    )
    SELECT 
        ls.total_debits,
        ls.total_credits,
        ls.total_debits - ls.total_credits as balance,
        ls.entry_count
    FROM ledger_summary ls;
END;
$$ LANGUAGE plpgsql;

-- Function to create automatic balance adjustment
CREATE OR REPLACE FUNCTION create_balance_adjustment(
    p_student_id UUID,
    p_created_by VARCHAR,
    p_description TEXT DEFAULT 'Automatic Balance Adjustment'
)
RETURNS UUID AS $$
DECLARE
    current_balance DECIMAL;
    adjustment_id UUID;
BEGIN
    -- Get current balance
    SELECT balance INTO current_balance
    FROM get_student_ledger_balance(p_student_id);
    
    -- Only create adjustment if balance is not zero
    IF current_balance != 0 THEN
        INSERT INTO ledger_adjustments (
            student_id,
            date,
            description,
            reference_number,
            debit_amount,
            credit_amount,
            type,
            created_by
        ) VALUES (
            p_student_id,
            CURRENT_DATE,
            p_description,
            CONCAT('BAL-', EXTRACT(EPOCH FROM NOW())::BIGINT),
            CASE WHEN current_balance < 0 THEN ABS(current_balance) ELSE 0 END,
            CASE WHEN current_balance > 0 THEN current_balance ELSE 0 END,
            'adjustment',
            p_created_by
        )
        RETURNING id INTO adjustment_id;
        
        RETURN adjustment_id;
    ELSE
        RETURN NULL;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ledger_adjustments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ledger_adjustments_updated_at
    BEFORE UPDATE ON ledger_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION update_ledger_adjustments_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE ledger_adjustments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies that match the financial_records pattern
-- Accountants can manage all ledger adjustments
CREATE POLICY "Accountants can manage all ledger adjustments" ON ledger_adjustments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM system_users
            WHERE id = auth.uid() AND role = 'accountant'
        )
    );

-- Students can view their own ledger adjustments
CREATE POLICY "Students can view their own ledger adjustments" ON ledger_adjustments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM students s
            JOIN system_users su ON s.user_id = su.id
            WHERE s.id = ledger_adjustments.student_id AND su.id = auth.uid()
        )
    );

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON ledger_adjustments TO authenticated;
GRANT USAGE ON SEQUENCE ledger_adjustments_id_seq TO authenticated;
