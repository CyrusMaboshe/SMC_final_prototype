// Test script to verify student financial data retrieval
// Run this in the browser console on the student dashboard

async function testStudentFinancialData() {
  console.log('=== TESTING STUDENT FINANCIAL DATA ===');
  
  // Test with a known student ID
  const testStudentId = 'SMC2025001';
  
  try {
    console.log('1. Testing student_get_financial_records function...');
    const { data: financialRecords, error: frError } = await window.supabase
      .rpc('student_get_financial_records', {
        p_student_number: testStudentId
      });
    
    console.log('Financial Records Result:', { data: financialRecords, error: frError });
    
    console.log('2. Testing student_get_payments function...');
    const { data: payments, error: paymentsError } = await window.supabase
      .rpc('student_get_payments', {
        p_student_number: testStudentId
      });
    
    console.log('Payments Result:', { data: payments, error: paymentsError });
    
    console.log('3. Testing direct table access...');
    const { data: student, error: studentError } = await window.supabase
      .from('students')
      .select('id, student_id, first_name, last_name')
      .eq('student_id', testStudentId)
      .single();
    
    console.log('Student Result:', { data: student, error: studentError });
    
    if (student && !studentError) {
      console.log('4. Testing direct financial_records access...');
      const { data: directFinancial, error: directFinancialError } = await window.supabase
        .from('financial_records')
        .select('*')
        .eq('student_id', student.id);
      
      console.log('Direct Financial Records:', { data: directFinancial, error: directFinancialError });
      
      console.log('5. Testing direct payments access...');
      const { data: directPayments, error: directPaymentsError } = await window.supabase
        .from('payments')
        .select('*')
        .eq('student_id', student.id);
      
      console.log('Direct Payments:', { data: directPayments, error: directPaymentsError });
    }
    
    console.log('6. Testing real-time subscription...');
    const channel = window.supabase
      .channel('test_financial_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financial_records'
        },
        (payload) => {
          console.log('Real-time financial update received:', payload);
        }
      )
      .subscribe();
    
    console.log('Real-time subscription created:', channel);
    
    // Test the studentAPI functions
    console.log('7. Testing studentAPI functions...');
    if (window.studentAPI) {
      const apiFinancialRecords = await window.studentAPI.getFinancialRecords(testStudentId);
      const apiPayments = await window.studentAPI.getPayments(testStudentId);
      
      console.log('StudentAPI Financial Records:', apiFinancialRecords);
      console.log('StudentAPI Payments:', apiPayments);
    } else {
      console.log('studentAPI not available in window');
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
  
  console.log('=== TEST COMPLETE ===');
}

// Make the function available globally
window.testStudentFinancialData = testStudentFinancialData;

console.log('Test function loaded. Run testStudentFinancialData() to test.');
