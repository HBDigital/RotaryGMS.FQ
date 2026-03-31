import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface VerificationDetails {
  registration_id: number;
  order_id: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  email: string;
  contact: string;
}

const PaymentSuccess: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    paymentId, 
    orderId, 
    amount, 
    delegates, 
    verificationDetails, 
    registrationData 
  } = location.state || {};

  const verification = verificationDetails as VerificationDetails;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">Your registration has been confirmed and verified</p>

        {/* Registration Details */}
        {registrationData && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left">
            <h3 className="font-semibold text-gray-800 mb-2 text-sm">Registration Details</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium text-gray-900">{registrationData.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium text-gray-900 text-xs break-all">{registrationData.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Club:</span>
                <span className="font-medium text-gray-900">{registrationData.club_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delegates:</span>
                <span className="font-medium text-gray-900">{registrationData.delegate_count}</span>
              </div>
            </div>
          </div>
        )}

        {/* Payment Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">Payment Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Payment ID:</span>
              <span className="font-mono text-xs text-gray-900 break-all max-w-[50%]">{paymentId || verification?.payment_id || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Order ID:</span>
              <span className="font-mono text-xs text-gray-900 break-all max-w-[50%]">{orderId || verification?.order_id || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Amount Paid:</span>
              <span className="font-semibold text-gray-900">₹{amount?.toLocaleString() || verification?.amount ? (verification.amount / 100).toLocaleString() : '0'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="font-semibold text-green-600 capitalize">{verification?.status || 'Verified'}</span>
            </div>
            {verification?.method && (
              <div className="flex justify-between">
                <span className="text-gray-600">Method:</span>
                <span className="font-medium text-gray-900 capitalize">{verification.method}</span>
              </div>
            )}
            {verification?.currency && (
              <div className="flex justify-between">
                <span className="text-gray-600">Currency:</span>
                <span className="font-medium text-gray-900">{verification.currency.toUpperCase()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Verification Badge */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-green-800 font-medium text-sm">Payment verified with gateway</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/')}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Register Another
          </button>
        </div>

        <p className="text-sm text-gray-500 mt-6">
          A confirmation email will be sent to your registered email address.
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccess;
