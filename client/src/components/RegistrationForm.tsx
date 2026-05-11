import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface FormData {
  name: string;
  email: string;
  phone: string;
  club_name: string;
  delegate_count: number;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const RegistrationForm: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    club_name: '',
    delegate_count: 1,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [clubs, setClubs] = useState<string[]>([]);
  const [registrationClosed, setRegistrationClosed] = useState(false);
  const [registrationCloseDate, setRegistrationCloseDate] = useState('2026-05-03');

  useEffect(() => {
    // Fetch clubs
    fetch(`${API_URL}/clubs`)
      .then(res => res.json())
      .then(data => setClubs(data.clubs.map((c: { name: string }) => c.name)))
      .catch(() => setClubs([]));

    // Fetch registration closure date
    fetch(`${API_URL}/settings/registration-close-date`)
      .then(res => res.json())
      .then(data => {
        const closeDate = data.registration_close_date_ist || '2026-05-03';
        setRegistrationCloseDate(closeDate);
        
        // Check if registration is closed
        const parts = closeDate.split('-').map(Number);
        if (parts.length === 3 && !parts.some(Number.isNaN)) {
          const [year, month, day] = parts;
          const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
          const closeAtUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0) - istOffsetMs;
          setRegistrationClosed(Date.now() >= closeAtUtcMs);
        }
      })
      .catch(() => {
        setRegistrationCloseDate('2026-05-03');
        setRegistrationClosed(false);
      });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleDelegateCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty or valid positive integers up to 200
    if (value === '' || /^[1-9]\d*$/.test(value)) {
      const count = value === '' ? 0 : parseInt(value, 10);
      if (count <= 200) {
        setFormData({ ...formData, delegate_count: count });
        if (errors.delegate_count) {
          setErrors({ ...errors, delegate_count: '' });
        }
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (!/^[0-9]{10}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Phone must be 10 digits';
    }
    if (!formData.club_name.trim()) newErrors.club_name = 'Club name is required';
    if (!formData.delegate_count || formData.delegate_count < 1) {
      newErrors.delegate_count = 'Please enter a valid number of delegates (minimum 1)';
    } else if (!Number.isInteger(formData.delegate_count)) {
      newErrors.delegate_count = 'Please enter a whole number';
    } else if (formData.delegate_count > 200) {
      newErrors.delegate_count = 'Maximum 200 delegates allowed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async (registrationId: number, amount: number) => {
    try {
      console.log('=== Starting payment process ===');
      console.log('Loading Razorpay script...');
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        console.error('Failed to load Razorpay script');
        alert('Failed to load payment gateway. Please try again.');
        setLoading(false);
        return;
      }
      console.log('Razorpay script loaded successfully');

      console.log('Creating order...', { registrationId, amount });
      const orderResponse = await fetch(`${API_URL}/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId, amount }),
      }).then(res => res.json());
      
      console.log('Order response:', orderResponse);

      if (!orderResponse.orderId || !orderResponse.keyId) {
        console.error('Invalid order response:', orderResponse);
        alert(orderResponse.error || 'Failed to create payment order. Please try again.');
        setLoading(false);
        return;
      }

      const { orderId, keyId } = orderResponse;

      const options = {
        key: keyId,
        amount: amount * 100,
        currency: 'INR',
        name: 'DLA-RID3206',
        description: `Registration for ${formData.delegate_count} delegate(s)`,
        order_id: orderId,
        handler: async function (response: any) {
          try {
            console.log('Payment response received:', response);
            
            const verifyResponse = await fetch(`${API_URL}/verify-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                registrationId,
              }),
            }).then(res => res.json());

            console.log('Verification response:', verifyResponse);

            if (verifyResponse.success) {
              // Store verification details for success page
              const verificationData = {
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                amount: amount,
                delegates: formData.delegate_count,
                receipt_no: verifyResponse.receipt_no,
                verificationDetails: verifyResponse.verification_details,
                registrationData: {
                  name: formData.name,
                  email: formData.email,
                  club_name: formData.club_name,
                  delegate_count: formData.delegate_count
                }
              };

              navigate('/payment-success', { 
                state: verificationData
              });
            } else {
              console.error('Payment verification failed:', verifyResponse.error);
              navigate('/payment-failure', { 
                state: { 
                  error: verifyResponse.error,
                  orderId: response.razorpay_order_id,
                  paymentId: response.razorpay_payment_id
                } 
              });
            }
          } catch (error: any) {
            console.error('Payment verification error:', error);
            const errorMessage = error?.message || 'Payment verification failed';
            navigate('/payment-failure', { 
              state: { 
                error: errorMessage,
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id
              } 
            });
          }
        },
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone,
        },
        theme: {
          color: '#0ea5e9',
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
            alert('Payment cancelled. Your registration has been saved and you can complete payment later.');
          }
        }
      };

      console.log('Opening Razorpay checkout...');
      const razorpay = new window.Razorpay(options);
      razorpay.open();
      console.log('Razorpay checkout opened');
    } catch (error) {
      console.error('Payment error:', error);
      alert('Failed to initiate payment. Please try again.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== Proceed to Payment clicked ===');
    console.log('Form data:', formData);

    if (registrationClosed) {
      console.log('Registration closed, blocking submission');
      alert(`Registrations are closed from ${registrationCloseDate} (IST)`);
      return;
    }

    if (!validateForm()) {
      console.log('Form validation failed, errors:', errors);
      return;
    }

    console.log('Form validation passed, submitting...');
    setLoading(true);

    try {
      console.log('Sending registration request to API...');
      const response = await fetch(`${API_URL}/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      console.log('API response status:', response.status);
      const responseBody = await response.json();
      console.log('API response body:', responseBody);

      if (responseBody?.closed) {
        console.log('Registration closed response from server');
        alert(responseBody.error || `Registrations are closed from ${registrationCloseDate} (IST)`);
        setLoading(false);
        return;
      }
      
      if (responseBody.success) {
        const { registrationId, total_amount } = responseBody;
        console.log('Registration successful, proceeding to payment:', { registrationId, total_amount });
        await handlePayment(registrationId, total_amount);
      } else {
        console.error('Registration failed:', responseBody.error || 'Unknown error');
        alert(responseBody.error || 'Registration failed. Please try again.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Failed to create registration. Please check your internet connection and try again.');
      setLoading(false);
    }
  };

  const getPricePerDelegate = (delegateCount: number) => {
    if (delegateCount <= 4) return 1250;
    if (delegateCount <= 10) return 1000;
    if (delegateCount <= 18) return 900;
    return 750; // 19 and above
  };

  const totalAmount = (() => {
    // Special pricing for test user
    if (
      formData.email.toLowerCase() === 'vivek@warblerit.com' &&
      formData.phone.replace(/\s/g, '') === '9994472344' &&
      formData.club_name === 'Coimbatore Manchester'
    ) {
      return 1; // Rs.1 for testing
    }

    const count = formData.delegate_count;
    return count * getPricePerDelegate(count);
  })();

  const pricePerDelegate = getPricePerDelegate(formData.delegate_count);

  return (
    <div className="min-h-screen py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <img src="/rotary-logo.png" alt="Rotary International" className="h-16 sm:h-20 mx-auto mb-4" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Rotary District 3206 <br /> District Learning Assembly</h1>
            <p className="text-sm sm:text-base text-gray-600">Register your delegates for the event</p>
            <p className="text-xs sm:text-sm text-gray-600 mt-2"><b>Date:</b> 24 May 2026 | <b>Venue:</b> KPR College of Arts Science and Research, Coimbatore</p>
            <p className="text-xs sm:text-sm text-blue-600 mt-2"><b >Google Map Link:</b> <a href="https://share.google/bOskrewX72xznhLSc" target="_blank" rel="noopener noreferrer">KPR College of Arts Science</a></p>
            {registrationClosed && (
              <div className="mt-4 inline-block bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-2 text-sm font-medium">
                Registrations are closed from {registrationCloseDate} (IST)
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Contact Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Your name"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="your.email@example.com"
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="10-digit phone number"
                  />
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Club Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="club_name"
                      value={formData.club_name}
                      onChange={(e) => {
                        setFormData({ ...formData, club_name: e.target.value });
                        if (errors.club_name) setErrors({ ...errors, club_name: '' });
                      }}
                      className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white appearance-none cursor-pointer ${
                        errors.club_name ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">— Select your club —</option>
                      {clubs.length === 0 && (
                        <option disabled>Loading clubs...</option>
                      )}
                      {clubs.map((club) => (
                        <option key={club} value={club}>{club}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {errors.club_name && <p className="text-red-500 text-sm mt-1">{errors.club_name}</p>}
                </div>
              </div>
            </div>

            {/* Registration Pricing */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-5 mb-6">
              <p className="text-sm font-semibold text-gray-800 mb-3">Registration Pricing</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Individual <br />(1-4)</p>
                  <p className="text-lg font-bold text-gray-900">₹1,250</p>
                  <p className="text-[10px] text-gray-400">per delegate</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Group 1 <br />(5-10)</p>
                  <p className="text-lg font-bold text-gray-900">₹1,000</p>
                  <p className="text-[10px] text-gray-400">per delegate</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Group 2 <br />(11-18)</p>
                  <p className="text-lg font-bold text-gray-900">₹900</p>
                  <p className="text-[10px] text-gray-400">per delegate</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Group 3 <br />(above 19 members)</p>
                  <p className="text-lg font-bold text-gray-900">₹750</p>
                  <p className="text-[10px] text-gray-400">per delegate</p>
                </div>
              </div>
            </div>

            {/* Delegate Details & Pricing */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6 mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Delegate Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Delegates <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="delegate_count"
                    value={formData.delegate_count || ''}
                    onChange={handleDelegateCountChange}
                    placeholder="Enter number of delegates"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white ${
                      errors.delegate_count ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.delegate_count && (
                    <p className="text-red-500 text-sm mt-1">{errors.delegate_count}</p>
                  )}
                </div>

                <div>
                  {/* Pricing Calculation Display */}
                  <div className="p-4 bg-green-100 rounded-lg border border-green-300">
                    <p className="text-sm font-medium text-gray-700 mb-2">Your Calculation:</p>
                    <p className="text-lg font-bold text-gray-900">{formData.delegate_count} Delegate{formData.delegate_count > 1 ? 's' : ''} × ₹{pricePerDelegate.toLocaleString()} = ₹{totalAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-4 sm:p-6 text-white">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                <div>
                  <p className="text-sm opacity-90">Total Amount</p>
                  <p className="text-2xl sm:text-3xl font-bold">₹{totalAmount.toLocaleString()}</p>
                  <p className="text-sm opacity-90 mt-1">
                    {formData.delegate_count} delegate(s) × ₹{pricePerDelegate.toLocaleString()} each
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading || registrationClosed}
                  className="w-full sm:w-auto bg-white text-blue-600 px-6 sm:px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {registrationClosed ? 'Registrations Closed' : loading ? 'Processing...' : 'Proceed to Payment'}
                </button>
              </div>
            </div>
          </form>

                  </div>
      </div>
    </div>
  );
};

export default RegistrationForm;
