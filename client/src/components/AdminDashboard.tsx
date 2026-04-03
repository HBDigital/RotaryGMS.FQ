import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Summary {
  totalRegistrations: number;
  totalDelegates: number;
  totalAmount: number;
  pendingPayments: number;
  failedPayments: number;
}

interface Transaction {
  id: number;
  registration_id: number;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  amount: number;
  status: string;
  created_at: string;
  name: string;
  email: string;
  club_name: string;
  receipt_no: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Delegate {
  delegate_name: string;
  delegate_designation: string;
}

interface Registration {
  id: number;
  receipt_no: string;
  name: string;
  email: string;
  phone: string;
  club_name: string;
  delegate_count: number;
  total_amount: number;
  payment_status: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  created_at: string;
  delegates: Delegate[];
  email_status: string;
  whatsapp_status: string;
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'registrations' | 'clubs'>('overview');

  interface ClubStatus {
    unregistered: { id: number; name: string }[];
    registered: { club_name: string; receipt_no: string; delegate_count: number }[];
  }
  const [clubStatus, setClubStatus] = useState<ClubStatus | null>(null);
  const [clubsLoading, setClubsLoading] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [addingClub, setAddingClub] = useState(false);
  const [clubFilter, setClubFilter] = useState('');

  useEffect(() => {
    if (!sessionStorage.getItem('adminLoggedIn')) {
      navigate('/admin-login');
      return;
    }
    fetchDashboardData();
    fetchTransactions(1);
    fetchClubStatus();
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('adminLoggedIn');
    navigate('/admin-login');
  };

  const fetchClubStatus = async () => {
    try {
      setClubsLoading(true);
      const res = await fetch(`${API_URL}/admin/unregistered-clubs`).then(r => r.json());
      setClubStatus(res);
    } catch (error) {
      console.error('Error fetching club status:', error);
    } finally {
      setClubsLoading(false);
    }
  };

  const handleAddClub = async () => {
    if (!newClubName.trim()) return;
    try {
      setAddingClub(true);
      await fetch(`${API_URL}/admin/clubs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClubName.trim() }),
      });
      setNewClubName('');
      fetchClubStatus();
    } catch (error) {
      console.error('Error adding club:', error);
      alert('Failed to add club');
    } finally {
      setAddingClub(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [summaryRes, registrationsRes] = await Promise.all([
        fetch(`${API_URL}/admin/summary`).then(r => r.json()),
        fetch(`${API_URL}/admin/registrations`).then(r => r.json()),
      ]);
      setSummary(summaryRes.summary);
      setRegistrations(registrationsRes.registrations);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      alert('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (page: number) => {
    try {
      setTxLoading(true);
      const res = await fetch(`${API_URL}/admin/transactions?page=${page}&limit=10`).then(r => r.json());
      setRecentTransactions(res.transactions);
      setPagination(res.pagination);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setTxLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const blob = await fetch(`${API_URL}/admin/export-excel`).then(r => r.blob());
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `GMS2026_Registrations_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Failed to export Excel');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      success: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      created: 'bg-blue-100 text-blue-800',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const getNotifBadge = (status: string, label: string) => {
    const icon = label === 'Email' ? '✉️' : '💬';
    const colorClass =
      status === 'sent' ? 'bg-green-100 text-green-800' :
      status === 'failed' ? 'bg-red-100 text-red-800' :
      'bg-gray-100 text-gray-500';
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {icon} {label}: {(status || 'pending').toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Manage registrations and view analytics</p>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <a
                href="/"
                className="bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center"
              >
                Registration Form
              </a>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 sm:px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="mb-3 sm:mb-0">
                  <p className="text-xs sm:text-sm text-gray-600">Total Registrations</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{summary.totalRegistrations}</p>
                </div>
                <div className="bg-blue-100 p-2 sm:p-3 rounded-full">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="mb-3 sm:mb-0">
                  <p className="text-xs sm:text-sm text-gray-600">Total Delegates</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{summary.totalDelegates}</p>
                </div>
                <div className="bg-purple-100 p-2 sm:p-3 rounded-full">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="mb-3 sm:mb-0">
                  <p className="text-xs sm:text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">₹{summary.totalAmount.toLocaleString()}</p>
                </div>
                <div className="bg-green-100 p-2 sm:p-3 rounded-full">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="mb-3 sm:mb-0">
                  <p className="text-xs sm:text-sm text-gray-600">Pending Payments</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{summary.pendingPayments}</p>
                </div>
                <div className="bg-yellow-100 p-2 sm:p-3 rounded-full">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="mb-3 sm:mb-0">
                  <p className="text-xs sm:text-sm text-gray-600">Failed Payments</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{summary.failedPayments}</p>
                </div>
                <div className="bg-red-100 p-2 sm:p-3 rounded-full">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Recent Transactions
              </button>
              <button
                onClick={() => setActiveTab('registrations')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'registrations'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All Registrations
              </button>
              <button
                onClick={() => { setActiveTab('clubs'); fetchClubStatus(); }}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'clubs'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Club Status
                {clubStatus && clubStatus.unregistered.length > 0 && (
                  <span className="ml-2 bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {clubStatus.unregistered.length}
                  </span>
                )}
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Transactions</h2>
                {txLoading ? (
                  <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>
                ) : (
                  <>
                    {/* Mobile Card View */}
                    <div className="block sm:hidden space-y-4">
                      {recentTransactions.map((transaction) => (
                        <div key={transaction.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                          {transaction.receipt_no && (
                            <p className="text-xs font-bold text-blue-700 mb-2">Receipt: {transaction.receipt_no}</p>
                          )}
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold text-gray-900">{transaction.name}</h3>
                              <p className="text-sm text-gray-600">{transaction.club_name}</p>
                            </div>
                            <div className="text-right">
                              {getStatusBadge(transaction.status)}
                              <p className="text-lg font-bold text-gray-900 mt-1">₹{transaction.amount.toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 space-y-1">
                            <p><span className="font-medium">Payment ID:</span> {transaction.razorpay_payment_id || '-'}</p>
                            <p><span className="font-medium">Date:</span> {new Date(transaction.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Desktop Table View */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt No</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Club</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {recentTransactions.map((transaction) => (
                            <tr key={transaction.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-blue-700">{transaction.receipt_no || '-'}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.name}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.club_name}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">₹{transaction.amount.toLocaleString()}</td>
                              <td className="px-4 py-4 whitespace-nowrap">{getStatusBadge(transaction.status)}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">{transaction.razorpay_payment_id || '-'}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(transaction.created_at).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                      </p>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => fetchTransactions(pagination.page - 1)}
                          disabled={pagination.page <= 1}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <span className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md">
                          {pagination.page} / {pagination.totalPages}
                        </span>
                        <button
                          onClick={() => fetchTransactions(pagination.page + 1)}
                          disabled={pagination.page >= pagination.totalPages}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'clubs' && (
              <div>
                <div className="mb-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Club Registration Status
                      {clubStatus && (
                        <span className="ml-3 text-sm font-normal text-gray-500">
                          {clubStatus.registered.length} registered · {clubStatus.unregistered.length} pending
                        </span>
                      )}
                    </h2>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newClubName}
                        onChange={(e) => setNewClubName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddClub()}
                        placeholder="Add new club name"
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleAddClub}
                        disabled={addingClub || !newClubName.trim()}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40"
                      >
                        {addingClub ? 'Adding…' : '+ Add Club'}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={clubFilter}
                      onChange={(e) => setClubFilter(e.target.value)}
                      placeholder="🔍 Filter clubs by name..."
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (!clubStatus) return;
                          const data = clubStatus.unregistered.filter(c => c.name.toLowerCase().includes(clubFilter.toLowerCase()));
                          const csv = ['Club Name', ...data.map(c => c.name)].join('\n');
                          const blob = new Blob([csv], { type: 'text/csv' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `unregistered-clubs-${new Date().toISOString().slice(0,10)}.csv`;
                          a.click();
                        }}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-40"
                        disabled={!clubStatus || clubStatus.unregistered.length === 0}
                      >
                        📥 Export Unregistered
                      </button>
                      <button
                        onClick={() => {
                          if (!clubStatus) return;
                          const data = clubStatus.registered.filter(c => c.club_name.toLowerCase().includes(clubFilter.toLowerCase()));
                          const csv = ['Club Name,Receipt No,Delegate Count', ...data.map(c => `"${c.club_name}",${c.receipt_no},${c.delegate_count}`)].join('\n');
                          const blob = new Blob([csv], { type: 'text/csv' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `registered-clubs-${new Date().toISOString().slice(0,10)}.csv`;
                          a.click();
                        }}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-40"
                        disabled={!clubStatus || clubStatus.registered.length === 0}
                      >
                        📥 Export Registered
                      </button>
                    </div>
                  </div>
                </div>

                {clubsLoading ? (
                  <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>
                ) : clubStatus && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* NOT REGISTERED */}
                    <div>
                      <h3 className="text-base font-semibold text-red-700 mb-3 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
                        Not Yet Registered ({clubStatus.unregistered.length})
                      </h3>
                      <div className="border border-red-200 rounded-lg overflow-hidden">
                        {clubStatus.unregistered.length === 0 ? (
                          <p className="text-center text-gray-500 py-6 text-sm">All clubs have registered! 🎉</p>
                        ) : (
                          <ul className="divide-y divide-red-100 max-h-[480px] overflow-y-auto">
                            {clubStatus.unregistered
                              .filter(club => club.name.toLowerCase().includes(clubFilter.toLowerCase()))
                              .map((club) => (
                                <li key={club.id} className="px-4 py-2.5 text-sm text-gray-800 hover:bg-red-50 flex items-center gap-2">
                                  <span className="text-red-400">✗</span> {club.name}
                                </li>
                              ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* REGISTERED */}
                    <div>
                      <h3 className="text-base font-semibold text-green-700 mb-3 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>
                        Registered ({clubStatus.registered.length})
                      </h3>
                      <div className="border border-green-200 rounded-lg overflow-hidden">
                        {clubStatus.registered.length === 0 ? (
                          <p className="text-center text-gray-500 py-6 text-sm">No registrations yet.</p>
                        ) : (
                          <ul className="divide-y divide-green-100 max-h-[480px] overflow-y-auto">
                            {clubStatus.registered
                              .filter(club => club.club_name.toLowerCase().includes(clubFilter.toLowerCase()))
                              .map((club, i) => (
                                <li key={i} className="px-4 py-2.5 text-sm hover:bg-green-50 flex items-center justify-between">
                                  <span className="flex items-center gap-2">
                                    <span className="text-green-500">✓</span>
                                    <span className="text-gray-800">{club.club_name}</span>
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {club.receipt_no} · {club.delegate_count} delegate{club.delegate_count !== 1 ? 's' : ''}
                                  </span>
                                </li>
                              ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'registrations' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">All Registrations</h2>
                  <button
                    onClick={handleExportExcel}
                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Export Excel</span>
                  </button>
                </div>
                <div className="space-y-4">
                  {registrations.map((registration) => (
                    <div key={registration.id} className="border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 space-y-3 sm:space-y-0">
                        <div>
                          {registration.receipt_no && (
                            <p className="text-xs font-bold text-blue-700 mb-1">Receipt: {registration.receipt_no}</p>
                          )}
                          <h3 className="text-lg font-semibold text-gray-900">{registration.name}</h3>
                          <p className="text-sm text-gray-600">{registration.email} • {registration.phone}</p>
                          <p className="text-sm text-gray-600 mt-1">Club: {registration.club_name}</p>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(registration.payment_status)}
                          <p className="text-sm text-gray-500 mt-2">
                            {new Date(registration.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-gray-50 rounded p-3">
                          <p className="text-xs text-gray-500">Delegates</p>
                          <p className="text-lg font-semibold text-gray-900">{registration.delegate_count}</p>
                        </div>
                        <div className="bg-gray-50 rounded p-3">
                          <p className="text-xs text-gray-500">Total Amount</p>
                          <p className="text-lg font-semibold text-gray-900">₹{registration.total_amount.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Delegate Details:</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-2">
                          {registration.delegates.map((delegate, index) => (
                            <div key={index} className="bg-blue-50 rounded p-3">
                              <p className="text-sm font-medium text-gray-900">{delegate.delegate_name}</p>
                              <p className="text-xs text-gray-600">{delegate.delegate_designation}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-2 items-center">
                        {getNotifBadge(registration.email_status, 'Email')}
                        {getNotifBadge(registration.whatsapp_status, 'WhatsApp')}
                        {registration.razorpay_payment_id && (
                          <p className="text-xs text-gray-500 break-all ml-auto">Payment ID: <span className="font-mono">{registration.razorpay_payment_id}</span></p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
