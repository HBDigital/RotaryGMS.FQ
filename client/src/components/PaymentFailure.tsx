import React from 'react';
import { useNavigate } from 'react-router-dom';

const PaymentFailure: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Failed</h1>
        <p className="text-gray-600 mb-6">
          We couldn't process your payment. Please try again.
        </p>

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
          <button
            onClick={() => navigate('/admin')}
            className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            View Dashboard
          </button>
        </div>

        <div className="mt-6 text-left bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Common Issues:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Insufficient funds</li>
            <li>• Incorrect card details</li>
            <li>• Network connectivity issues</li>
            <li>• Payment gateway timeout</li>
          </ul>
        </div>

        <p className="text-sm text-gray-500 mt-6">
          If you continue to face issues, please contact support.
        </p>
      </div>
    </div>
  );
};

export default PaymentFailure;
