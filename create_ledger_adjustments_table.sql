-- Create ledger_adjustments table for account balance editing
-- Run this SQL in your Supabase SQL editor if the table doesn't exist

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ledger_adjustments_student_id ON ledger_adjustments(student_id);
CREATE INDEX IF NOT EXISTS idx_ledger_adjustments_date ON ledger_adjustments(date);
CREATE INDEX IF NOT EXISTS idx_ledger_adjustments_type ON ledger_adjustments(type);

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

-- Create trigger to update updated_at timestamp
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

-- Test the table by inserting a sample record (optional)
-- INSERT INTO ledger_adjustments (
--     student_id,
--     description,
--     reference_number,
--     debit_amount,
--     type,
--     created_by
-- ) VALUES (
--     (SELECT id FROM students LIMIT 1),
--     'Test balance adjustment',
--     'TEST-001',
--     100.00,
--     'adjustment',
--     'test-accountant'
-- );

-- Verify the table was created
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'ledger_adjustments'
ORDER BY ordinal_position;
