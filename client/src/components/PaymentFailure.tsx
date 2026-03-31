import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PaymentFailure: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { error, orderId, paymentId } = location.state || {};

  const getErrorDescription = (errorMessage: string) => {
    if (errorMessage?.includes('signature')) {
      return 'Payment signature verification failed. This could indicate a security issue.';
    }
    if (errorMessage?.includes('amount')) {
      return 'Payment amount mismatch. The amount charged doesn\'t match our records.';
    }
    if (errorMessage?.includes('Order verification failed')) {
      return 'Order verification failed. The payment doesn\'t belong to the correct order.';
    }
    if (errorMessage?.includes('Payment not completed')) {
      return 'Payment was not completed successfully. Please check with your bank.';
    }
    if (errorMessage?.includes('Registration not found')) {
      return 'Registration record not found. Please contact support.';
    }
    return 'Payment processing failed. Please try again or contact support if the issue persists.';
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Payment Failed</h1>
        <p className="text-gray-600 mb-6">
          We couldn't process your payment. Please try again.
        </p>

        {/* Error Details */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-red-800 mb-2 text-sm">Error Details:</h3>
            <p className="text-sm text-red-700 mb-2">{error}</p>
            <p className="text-xs text-red-600">{getErrorDescription(error)}</p>
          </div>
        )}

        {/* Transaction Details */}
        {(orderId || paymentId) && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-800 mb-2 text-sm">Transaction Details:</h3>
            <div className="space-y-1 text-sm">
              {orderId && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-mono text-xs text-gray-900 break-all max-w-[50%]">{orderId}</span>
                </div>
              )}
              {paymentId && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment ID:</span>
                  <span className="font-mono text-xs text-gray-900 break-all max-w-[50%]">{paymentId}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Your registration details have been saved. You can complete the payment later or try again now.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/')}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>

        <div className="mt-6 text-left bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2 text-sm">Common Issues:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Insufficient funds</li>
            <li>• Incorrect card details</li>
            <li>• Network connectivity issues</li>
            <li>• Payment gateway timeout</li>
            <li>• Bank verification failed</li>
            <li>• Daily transaction limit exceeded</li>
          </ul>
        </div>

        <p className="text-sm text-gray-500 mt-6">
          If you continue to face issues, please contact support with the transaction details above.
        </p>
      </div>
    </div>
  );
};

export default PaymentFailure;
