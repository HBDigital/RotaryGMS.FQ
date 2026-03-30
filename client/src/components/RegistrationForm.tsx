import React, { useState } from 'react';
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
        name: 'Delegate Registration',
        description: `Registration for ${formData.delegate_count} delegate(s)`,
        order_id: orderId,
        handler: async function (response: any) {
          try {
            const verifyResponse = await axios.post(`${API_URL}/verify-payment`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              registrationId,
            });

            if (verifyResponse.data.success) {
              navigate('/payment-success', { 
                state: { 
                  paymentId: response.razorpay_payment_id,
                  amount: amount,
                  delegates: formData.delegate_count 
                } 
              });
            } else {
              navigate('/payment-failure');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            navigate('/payment-failure');
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
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <img src="/rotary-logo.png" alt="Rotary International" className="h-20 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Rotary 3206, GMS 2026</h1>
            <p className="text-gray-600">Register your delegates for the event</p>
            <p className="text-gray-600"><b>Date:</b> 03 May 2026 | <b>Venue:</b> Grant Regent Hotel, Coimbatore</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Contact Information</h2>
              
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
                  <input
                    type="text"
                    name="club_name"
                    value={formData.club_name}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.club_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your club name"
                  />
                  {errors.club_name && <p className="text-red-500 text-sm mt-1">{errors.club_name}</p>}
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Delegate Details</h2>
                <div className="flex items-center space-x-2">
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
                        <input
                          type="text"
                          value={delegate.designation}
                          onChange={(e) => handleDelegateChange(index, 'designation', e.target.value)}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors[`delegate_${index}_designation`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Delegate designation"
                        />
                        {errors[`delegate_${index}_designation`] && (
                          <p className="text-red-500 text-sm mt-1">{errors[`delegate_${index}_designation`]}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-6 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm opacity-90">Total Amount</p>
                  <p className="text-3xl font-bold">₹{totalAmount.toLocaleString()}</p>
                  <p className="text-sm opacity-90 mt-1">
                    {formData.delegate_count} delegate(s) × ₹1,000 each
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
