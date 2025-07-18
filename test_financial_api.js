// Test script to verify financial API functions
// Run this in the browser console on the student dashboard

async function testFinancialAPI() {
  console.log('Testing Financial API Functions...');
  
  const studentId = 'SMC2025001'; // Claire Mukubesa
  
  try {
    console.log('1. Testing studentAPI.getFinancialRecords...');
    const financialRecords = await window.studentAPI.getFinancialRecords(studentId);
    console.log('Financial Records:', financialRecords);
    
    console.log('2. Testing studentAPI.getPayments...');
    const payments = await window.studentAPI.getPayments(studentId);
    console.log('Payments:', payments);
    
    // Test calculations
    console.log('3. Testing calculations...');
    const totalOwed = financialRecords?.reduce((sum, record) => {
      const amount = typeof record.total_amount === 'string' ? parseFloat(record.total_amount) : record.total_amount;
      return sum + (amount || 0);
    }, 0) || 0;
    
    const totalPaid = payments?.reduce((sum, payment) => {
      const amount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount;
      return sum + (amount || 0);
    }, 0) || 0;
    
    const totalBalance = financialRecords?.reduce((sum, record) => {
      const balance = typeof record.balance === 'string' ? parseFloat(record.balance) : record.balance;
      return sum + (balance || 0);
    }, 0) || 0;
    
    console.log('Calculated Totals:', {
      totalOwed,
      totalPaid,
      totalBalance,
      recordsCount: financialRecords?.length || 0,
      paymentsCount: payments?.length || 0
    });
    
    return {
      success: true,
      data: {
        financialRecords,
        payments,
        totals: { totalOwed, totalPaid, totalBalance }
      }
    };
    
  } catch (error) {
    console.error('Error testing financial API:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Make the function available globally for testing
window.testFinancialAPI = testFinancialAPI;

console.log('Financial API test function loaded. Run testFinancialAPI() to test.');
