import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface Delegate {
  name: string;
  designation: string;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  club_name: string;
  delegate_count: number;
  delegates: Delegate[];
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
    delegates: [{ name: '', designation: '' }],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [clubs, setClubs] = useState<string[]>([]);

  useEffect(() => {
    axios.get(`${API_URL}/clubs`)
      .then(res => setClubs(res.data.clubs.map((c: { name: string }) => c.name)))
      .catch(() => setClubs([]));
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleDelegateCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const count = parseInt(e.target.value);
    const newDelegates = Array.from({ length: count }, (_, i) => 
      formData.delegates[i] || { name: '', designation: '' }
    );
    setFormData({ ...formData, delegate_count: count, delegates: newDelegates });
  };

  const handleDelegateChange = (index: number, field: 'name' | 'designation', value: string) => {
    const newDelegates = [...formData.delegates];
    newDelegates[index][field] = value;
    setFormData({ ...formData, delegates: newDelegates });
    
    const errorKey = `delegate_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors({ ...errors, [errorKey]: '' });
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

    formData.delegates.forEach((delegate, index) => {
      if (!delegate.name.trim()) {
        newErrors[`delegate_${index}_name`] = `Delegate ${index + 1} name is required`;
      }
      if (!delegate.designation.trim()) {
        newErrors[`delegate_${index}_designation`] = `Delegate ${index + 1} designation is required`;
      }
    });

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
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert('Failed to load payment gateway. Please try again.');
        return;
      }

      const orderResponse = await axios.post(`${API_URL}/create-order`, {
        registrationId,
        amount,
      });

      const { orderId, keyId } = orderResponse.data;

      const options = {
        key: keyId,
        amount: amount * 100,
        currency: 'INR',
        name: 'GMS-RID3206',
        description: `Registration for ${formData.delegate_count} delegate(s)`,
        order_id: orderId,
        handler: async function (response: any) {
          try {
            console.log('Payment response received:', response);
            
            const verifyResponse = await axios.post(`${API_URL}/verify-payment`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              registrationId,
            });

            console.log('Verification response:', verifyResponse.data);

            if (verifyResponse.data.success) {
              // Store verification details for success page
              const verificationData = {
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                amount: amount,
                delegates: formData.delegate_count,
                receipt_no: verifyResponse.data.receipt_no,
                verificationDetails: verifyResponse.data.verification_details,
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
              console.error('Payment verification failed:', verifyResponse.data.error);
              navigate('/payment-failure', { 
                state: { 
                  error: verifyResponse.data.error,
                  orderId: response.razorpay_order_id,
                  paymentId: response.razorpay_payment_id
                } 
              });
            }
          } catch (error: any) {
            console.error('Payment verification error:', error);
            const errorMessage = error.response?.data?.error || 'Payment verification failed';
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

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment error:', error);
      alert('Failed to initiate payment. Please try again.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/registrations`, formData);
      
      if (response.data.success) {
        const { registrationId, total_amount } = response.data;
        await handlePayment(registrationId, total_amount);
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Failed to create registration. Please try again.');
      setLoading(false);
    }
  };

  const totalAmount = formData.delegate_count * 1000;

  return (
    <div className="min-h-screen py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <img src="/rotary-logo.png" alt="Rotary International" className="h-16 sm:h-20 mx-auto mb-4" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Rotary 3206, GMS 2026</h1>
            <p className="text-sm sm:text-base text-gray-600">Register your delegates for the event</p>
            <p className="text-xs sm:text-sm text-gray-600 mt-2"><b>Date:</b> 03 May 2026 | <b>Venue:</b> Grant Regent Hotel, Coimbatore</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Contact Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your full name"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
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

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Delegate Details</h2>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                  <label className="text-sm font-medium text-gray-700">Number of Delegates:</label>
                  <select
                    value={formData.delegate_count}
                    onChange={handleDelegateCountChange}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <option key={num} value={num}>
                        {num}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                {formData.delegates.map((delegate, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                    <h3 className="font-medium text-gray-700 mb-3">Delegate {index + 1}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={delegate.name}
                          onChange={(e) => handleDelegateChange(index, 'name', e.target.value)}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors[`delegate_${index}_name`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Delegate name"
                        />
                        {errors[`delegate_${index}_name`] && (
                          <p className="text-red-500 text-sm mt-1">{errors[`delegate_${index}_name`]}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Designation <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            value={delegate.designation}
                            onChange={(e) => handleDelegateChange(index, 'designation', e.target.value)}
                            className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white appearance-none cursor-pointer ${
                              errors[`delegate_${index}_designation`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          >
                            <option value="">Select Designation</option>
                            <option value="President 2025-26">President 2025-26</option>
                            <option value="President Elect(2026-27)">President Elect(2026-27)</option>
                            <option value="Treasurer 2026-27">Treasurer 2026-27</option>
                            <option value="Secretary elect 2026-27">Secretary elect 2026-27</option>
                            <option value="TRF Chair 2026-27">TRF Chair 2026-27</option>
                            <option value="Member">Member</option>
                            <option value="Rotaract">Rotaract</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                        {errors[`delegate_${index}_designation`] && (
                          <p className="text-red-500 text-sm mt-1">{errors[`delegate_${index}_designation`]}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-4 sm:p-6 text-white">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                <div>
                  <p className="text-sm opacity-90">Total Amount</p>
                  <p className="text-2xl sm:text-3xl font-bold">₹{totalAmount.toLocaleString()}</p>
                  <p className="text-sm opacity-90 mt-1">
                    {formData.delegate_count} delegate(s) × ₹1,000 each
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto bg-white text-blue-600 px-6 sm:px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Proceed to Payment'}
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
