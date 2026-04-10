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

interface DesignationRegistration {
  person_name: string;
  club_name: string;
}

interface DesignationReportItem {
  designation: string;
  total_registered: number;
  registrations: DesignationRegistration[];
}

interface ClubDesignationRegistration {
  person_name: string;
  designation: string;
}

interface ClubDesignationReportItem {
  club_name: string;
  total_registered: number;
  registrations: ClubDesignationRegistration[];
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
  const [activeTab, setActiveTab] = useState<'overview' | 'registrations' | 'designation' | 'district'>('overview');

  const DESIGNATION_SHORT: Record<string, string> = {
    'President 2025-26': 'Pres\'26',
    'President Elect(2026-27)': 'PE\'27',
    'Treasurer 2026-27': 'Treas',
    'Secretary elect 2026-27': 'Secy',
    'TRF Chair 2026-27': 'TRF',
  };

  const handleExportDesignationExcel = async (view: 'designation' | 'club') => {
    try {
      const blob = await fetch(`${API_URL}/admin/export-designation-excel?view=${view}`).then(r => r.blob());
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `GMS2026_${view}_report_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting designation Excel:', error);
      alert('Failed to export designation report');
    }
  };

  interface DistrictClub {
    name: string; ggr: string | null; status: 'completed' | 'partial' | 'not_registered';
    required_present: string[]; required_missing: string[];
  }
  interface AG { name: string; phone: string | null; reminder_sent_today: boolean; total: number; completed: number; partial: number; not_registered: number; clubs: DistrictClub[]; }
  interface DD { name: string; assistant_governors: AG[]; }
  interface ZoneReport { zone: number; district_directors: DD[]; }
  interface AgListItem { assistant_governor: string; district_director: string; zone: number; }

  const [districtReport, setDistrictReport] = useState<ZoneReport[]>([]);
  const [agList, setAgList] = useState<AgListItem[]>([]);
  const [districtLoading, setDistrictLoading] = useState(false);
  const [districtFilter, setDistrictFilter] = useState('');
  const [designationView, setDesignationView] = useState<'designation' | 'club'>('designation');
  const [expandedDDs, setExpandedDDs] = useState<Record<string, boolean>>({});
  const [expandedAGs, setExpandedAGs] = useState<Record<string, boolean>>({});
  const [reminderStatus, setReminderStatus] = useState<Record<string, 'idle' | 'sending' | 'sent' | 'cooldown'>>({});
  const [manualEntryModalOpen, setManualEntryModalOpen] = useState(false);
  const [manualPayForm, setManualPayForm] = useState({
    club_name: '',
    delegate_name: '',
    delegate_designation: 'President 2025-26',
    email: '',
    phone: '',
    payment_mode: 'CASH',
    payment_reference: '',
  });
  const [markingPaid, setMarkingPaid] = useState(false);
  const REFRESH_INTERVAL = 300;
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [reconciling, setReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<{ reconciled: {name:string;receipt_no:string}[]; failed: {name:string;reason:string}[]; total_checked: number } | null>(null);

  const isViewer = sessionStorage.getItem('adminRole') === 'viewer';
  const formatISTDateTime = (value: string) => {
    const normalized = String(value || '').trim().replace(' ', 'T');
    const utcValue = normalized.endsWith('Z') ? normalized : `${normalized}Z`;
    const date = new Date(utcValue);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  };
  const designationReport: DesignationReportItem[] = Object.values(
    registrations.reduce((acc, registration) => {
      registration.delegates.forEach((delegate) => {
        const designation = delegate.delegate_designation || 'Unknown';
        if (!acc[designation]) {
          acc[designation] = {
            designation,
            total_registered: 0,
            registrations: [],
          };
        }
        acc[designation].total_registered += 1;
        acc[designation].registrations.push({
          person_name: delegate.delegate_name,
          club_name: registration.club_name,
        });
      });
      return acc;
    }, {} as Record<string, DesignationReportItem>)
  ).sort((a, b) => a.designation.localeCompare(b.designation));
  const clubDesignationReport: ClubDesignationReportItem[] = Object.values(
    registrations.reduce((acc, registration) => {
      const clubName = registration.club_name || 'Unknown';
      if (!acc[clubName]) {
        acc[clubName] = {
          club_name: clubName,
          total_registered: 0,
          registrations: [],
        };
      }
      registration.delegates.forEach((delegate) => {
        acc[clubName].total_registered += 1;
        acc[clubName].registrations.push({
          person_name: delegate.delegate_name,
          designation: delegate.delegate_designation,
        });
      });
      return acc;
    }, {} as Record<string, ClubDesignationReportItem>)
  ).sort((a, b) => a.club_name.localeCompare(b.club_name));
  const districtClubNames = Array.from(new Set(
    districtReport.flatMap(zone =>
      zone.district_directors.flatMap(dd =>
        dd.assistant_governors.flatMap(ag => ag.clubs.map(club => club.name))
      )
    )
  )).sort((a, b) => a.localeCompare(b));

  useEffect(() => {
    if (!sessionStorage.getItem('adminLoggedIn')) {
      navigate('/admin-login');
      return;
    }
    fetchDashboardData();
    fetchTransactions(1);
    fetchDistrictReport();
  }, [navigate]);

  useEffect(() => {
    if (isViewer && activeTab === 'overview') {
      setActiveTab('registrations');
    }
  }, [isViewer, activeTab]);

  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchDashboardData();
          fetchTransactions(1);
          fetchDistrictReport();
          fetch(`${API_URL}/admin/reconcile-payments`, { method: 'POST' }).catch(() => {});
          return REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const handleReconcile = async () => {
    setReconciling(true);
    setReconcileResult(null);
    try {
      const res = await fetch(`${API_URL}/admin/reconcile-payments`, { method: 'POST' });
      const data = await res.json();
      setReconcileResult(data);
      if (data.reconciled?.length > 0) {
        fetchDashboardData();
        fetchTransactions(1);
      }
    } catch {
      alert('Failed to sync payments');
    } finally {
      setReconciling(false);
    }
  };

  const sendAgReminder = async (agName: string) => {
    setReminderStatus(prev => ({ ...prev, [agName]: 'sending' }));
    try {
      const resp = await fetch(`${API_URL}/admin/send-ag-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ag_name: agName }),
      });
      if (resp.status === 429) {
        setReminderStatus(prev => ({ ...prev, [agName]: 'cooldown' }));
      } else if (resp.ok) {
        setReminderStatus(prev => ({ ...prev, [agName]: 'sent' }));
      } else {
        setReminderStatus(prev => ({ ...prev, [agName]: 'idle' }));
        alert('Failed to send reminder');
      }
    } catch {
      setReminderStatus(prev => ({ ...prev, [agName]: 'idle' }));
      alert('Failed to send reminder');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminLoggedIn');
    navigate('/admin-login');
  };

  const fetchDistrictReport = async () => {
    try {
      setDistrictLoading(true);
      const res = await fetch(`${API_URL}/admin/district-report`).then(r => r.json());
      setDistrictReport(res.report || []);
      setAgList(res.ag_list || []);
    } catch (error) {
      console.error('Error fetching district report:', error);
    } finally {
      setDistrictLoading(false);
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

        {!isViewer && summary && (
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
              {!isViewer && (
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
              )}
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
                onClick={() => setActiveTab('designation')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'designation'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Designation Report
              </button>
              <button
                onClick={() => { setActiveTab('district'); fetchDistrictReport(); }}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'district'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                District Report
              </button>
            </nav>
          </div>

          <div className="p-6">
            {!isViewer && activeTab === 'overview' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Recent Transactions</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                      Refresh in {String(Math.floor(countdown / 60)).padStart(2, '0')}:{String(countdown % 60).padStart(2, '0')}
                    </span>
                    {!isViewer && <button
                      onClick={handleReconcile}
                      disabled={reconciling}
                      className="flex items-center gap-2 bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-orange-600 disabled:opacity-50"
                    >
                      {reconciling ? (
                        <><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full"></span> Syncing…</>
                      ) : '🔄 Sync PG'}
                    </button>}
                  </div>
                </div>
                {reconcileResult && (
                  <div className={`mb-4 p-3 rounded-lg text-xs border ${reconcileResult.reconciled.length > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    {reconcileResult.reconciled.length > 0 ? (
                      <>
                        <p className="font-semibold text-green-800 mb-1">✅ {reconcileResult.reconciled.length} payment(s) reconciled:</p>
                        {reconcileResult.reconciled.map((r, i) => (
                          <p key={i} className="text-green-700">{r.name} → {r.receipt_no}</p>
                        ))}
                      </>
                    ) : (
                      <p className="text-gray-500">✓ Checked {reconcileResult.total_checked ?? 0} pending order(s) — no new captures found.</p>
                    )}
                  </div>
                )}
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
                            <p><span className="font-medium">Date:</span> {formatISTDateTime(transaction.created_at)}</p>
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
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{formatISTDateTime(transaction.created_at)}</td>
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

            {activeTab === 'district' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">District Report</h2>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={districtFilter}
                      onChange={(e) => setDistrictFilter(e.target.value)}
                      placeholder="🔍 Filter by club or AG..."
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => {
                        const rows = [['Zone', 'District Director', 'Assistant Governor', 'GGR', 'Club', 'Status', 'Designations Present', 'Designations Missing']];
                        districtReport.forEach(z => z.district_directors.forEach(dd => dd.assistant_governors.forEach(ag => ag.clubs.forEach(c => {
                          rows.push([String(z.zone), dd.name, ag.name, c.ggr || '', c.name, c.status, c.required_present.join('; '), c.required_missing.join('; ')]);
                        }))));
                        const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url;
                        a.download = `district-report-${new Date().toISOString().slice(0,10)}.csv`;
                        a.click();
                      }}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700"
                    >
                      📥 Export CSV
                    </button>
                  </div>
                </div>

                {!isViewer && (
                  <div className="mb-4">
                    <button
                      onClick={() => setManualEntryModalOpen(true)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700"
                    >
                      + Manual Entry
                    </button>
                  </div>
                )}

                {districtLoading ? (
                  <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>
                ) : districtReport.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No district data available.</p>
                ) : (
                  <div className="space-y-6">
                    {districtReport.map(zone => (
                      <div key={zone.zone}>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">Zone {zone.zone}</h3>
                        <div className="space-y-4">
                          {zone.district_directors.map(dd => {
                            const ddKey = `${zone.zone}-${dd.name}`;
                            const ddOpen = expandedDDs[ddKey] !== false;
                            const ddTotal = dd.assistant_governors.reduce((s, ag) => s + ag.total, 0);
                            const ddCompleted = dd.assistant_governors.reduce((s, ag) => s + ag.completed, 0);
                            const ddNot = dd.assistant_governors.reduce((s, ag) => s + ag.not_registered + ag.partial, 0);
                            return (
                              <div key={dd.name} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                <button
                                  onClick={() => setExpandedDDs(prev => ({ ...prev, [ddKey]: !ddOpen }))}
                                  className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 text-left"
                                >
                                  <div>
                                    <span className="font-semibold text-gray-900 text-base">District Director: {dd.name}</span>
                                    <div className="flex gap-3 mt-1">
                                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{ddCompleted} Completed</span>
                                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{ddNot} Pending</span>
                                      <span className="text-xs text-gray-500">{ddTotal} clubs total</span>
                                    </div>
                                  </div>
                                  <span className="text-gray-400 text-lg">{ddOpen ? '▲' : '▼'}</span>
                                </button>

                                {ddOpen && (
                                  <div className="divide-y divide-gray-100">
                                    {dd.assistant_governors.map(ag => {
                                      const agKey = `${zone.zone}-${dd.name}-${ag.name}`;
                                      const agOpen = expandedAGs[agKey] !== false;
                                      const filterLower = districtFilter.toLowerCase();
                                      const visibleClubs = ag.clubs.filter(c =>
                                        !filterLower ||
                                        c.name.toLowerCase().includes(filterLower) ||
                                        ag.name.toLowerCase().includes(filterLower)
                                      );
                                      if (filterLower && visibleClubs.length === 0) return null;
                                      return (
                                        <div key={ag.name} className="bg-white">
                                          <div className="flex items-center justify-between px-5 py-3 hover:bg-blue-50">
                                            <button
                                              onClick={() => setExpandedAGs(prev => ({ ...prev, [agKey]: !agOpen }))}
                                              className="flex items-center gap-3 flex-1 text-left"
                                            >
                                              <span className="text-sm font-medium text-gray-800">AG: {ag.name}</span>
                                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{ag.completed}/{ag.total}</span>
                                              {ag.not_registered + ag.partial > 0 && (
                                                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                                  {ag.not_registered + ag.partial} not done
                                                </span>
                                              )}
                                            </button>
                                            <div className="flex items-center gap-2">
                                              {(() => {
                                                const rs = reminderStatus[ag.name] || (ag.reminder_sent_today ? 'cooldown' : 'idle');
                                                if (rs === 'sent' || rs === 'cooldown') {
                                                  return <span className="text-xs text-gray-400 italic">Reminder sent today</span>;
                                                }
                                                return isViewer ? null : (
                                                  <button
                                                    onClick={() => sendAgReminder(ag.name)}
                                                    disabled={rs === 'sending' || ag.not_registered + ag.partial === 0}
                                                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-40"
                                                  >
                                                    {rs === 'sending' ? 'Sending…' : '📲 Send Reminder'}
                                                  </button>
                                                );
                                              })()}
                                              <span className="text-gray-400 text-sm ml-1">{agOpen ? '▲' : '▼'}</span>
                                            </div>
                                          </div>

                                          {agOpen && (
                                            <ul className="px-5 pb-3 space-y-1">
                                              {visibleClubs.map(club => (
                                                <li key={club.name} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                                                  <div className="flex items-center gap-2">
                                                    {club.status === 'completed' && <span className="text-green-500 font-bold">✓</span>}
                                                    {club.status === 'partial'   && <span className="text-orange-500 font-bold">⚠</span>}
                                                    {club.status === 'not_registered' && <span className="text-red-500 font-bold">✗</span>}
                                                    <span className={club.status === 'not_registered' ? 'text-red-700' : club.status === 'partial' ? 'text-orange-700' : 'text-green-800 font-medium'}>
                                                      {club.name}
                                                    </span>
                                                    {club.ggr && <span className="text-xs text-gray-400">(GGR: {club.ggr})</span>}
                                                  </div>
                                                  <span className="text-xs">
                                                    {club.status === 'not_registered' ? (
                                                      <span className="text-gray-400">Not registered</span>
                                                    ) : (
                                                      <span className="flex flex-wrap gap-1">
                                                        {club.required_present.map(d => (
                                                          <span key={d} className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs">{DESIGNATION_SHORT[d] || d}</span>
                                                        ))}
                                                        {club.required_missing.map(d => (
                                                          <span key={d} className="bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded text-xs">{DESIGNATION_SHORT[d] || d}</span>
                                                        ))}
                                                      </span>
                                                    )}
                                                  </span>
                                                </li>
                                              ))}
                                            </ul>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'designation' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Designation Report</h2>
                  <button
                    onClick={() => handleExportDesignationExcel(designationView)}
                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Export Excel</span>
                  </button>
                </div>
                <div className="mb-4 border-b border-gray-200">
                  <nav className="flex -mb-px">
                    <button
                      onClick={() => setDesignationView('designation')}
                      className={`px-4 py-2 text-sm font-medium ${designationView === 'designation' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      By Designation
                    </button>
                    <button
                      onClick={() => setDesignationView('club')}
                      className={`px-4 py-2 text-sm font-medium ${designationView === 'club' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      By Club
                    </button>
                  </nav>
                </div>

                {designationView === 'designation' ? (
                  designationReport.length === 0 ? (
                    <p className="text-sm text-gray-500">No successful registrations found.</p>
                  ) : (
                    <div className="space-y-3">
                      {designationReport.map((item) => (
                        <div key={item.designation} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold text-gray-900">{item.designation}</p>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">
                              Total: {item.total_registered}
                            </span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr className="text-left text-gray-500 border-b">
                                  <th className="py-1 pr-3">Person Name</th>
                                  <th className="py-1">Club Name</th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.registrations.map((reg, idx) => (
                                  <tr key={`${item.designation}-${idx}`} className="border-b last:border-0">
                                    <td className="py-1 pr-3 text-gray-800">{reg.person_name}</td>
                                    <td className="py-1 text-gray-700">{reg.club_name}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : clubDesignationReport.length === 0 ? (
                  <p className="text-sm text-gray-500">No successful registrations found.</p>
                ) : (
                  <div className="space-y-3">
                    {clubDesignationReport.map((item) => (
                      <div key={item.club_name} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-gray-900">{item.club_name}</p>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">
                            Total: {item.total_registered}
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="text-left text-gray-500 border-b">
                                <th className="py-1 pr-3">Person Name</th>
                                <th className="py-1">Designation</th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.registrations.map((reg, idx) => (
                                <tr key={`${item.club_name}-${idx}`} className="border-b last:border-0">
                                  <td className="py-1 pr-3 text-gray-800">{reg.person_name}</td>
                                  <td className="py-1 text-gray-700">{reg.designation}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
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
                            {formatISTDateTime(registration.created_at)}
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

      {/* Manual Entry Modal */}
      {manualEntryModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Mark Club Designation as Paid</h3>
                <button
                  onClick={() => setManualEntryModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  value={manualPayForm.club_name}
                  onChange={(e) => setManualPayForm(prev => ({ ...prev, club_name: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select Club</option>
                  {districtClubNames.map(club => (
                    <option key={club} value={club}>{club}</option>
                  ))}
                </select>
                <select
                  value={manualPayForm.delegate_designation}
                  onChange={(e) => setManualPayForm(prev => ({ ...prev, delegate_designation: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {Object.keys(DESIGNATION_SHORT).map(designation => (
                    <option key={designation} value={designation}>{designation}</option>
                  ))}
                </select>
                <select
                  value={manualPayForm.payment_mode}
                  onChange={(e) => setManualPayForm(prev => ({ ...prev, payment_mode: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="NEFT">NEFT</option>
                  <option value="CASH">CASH</option>
                  <option value="QR">QR</option>
                </select>
                <input
                  type="text"
                  value={manualPayForm.delegate_name}
                  onChange={(e) => setManualPayForm(prev => ({ ...prev, delegate_name: e.target.value }))}
                  placeholder="Person Name"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <input
                  type="email"
                  value={manualPayForm.email}
                  onChange={(e) => setManualPayForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Email"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <input
                  type="text"
                  value={manualPayForm.payment_reference}
                  onChange={(e) => setManualPayForm(prev => ({ ...prev, payment_reference: e.target.value }))}
                  placeholder="Payment Reference (mandatory)"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <input
                  type="tel"
                  value={manualPayForm.phone}
                  onChange={(e) => setManualPayForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Phone"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setManualEntryModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!manualPayForm.club_name || !manualPayForm.delegate_name || !manualPayForm.email || !manualPayForm.phone || !manualPayForm.payment_reference) {
                      alert('Please fill all fields');
                      return;
                    }
                    try {
                      setMarkingPaid(true);
                      const res = await fetch(`${API_URL}/admin/manual-designation-payment`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(manualPayForm),
                      });
                      const data = await res.json();
                      if (!res.ok) {
                        alert(data.error || 'Failed to mark as paid');
                        return;
                      }
                      alert(`Marked paid. Receipt: ${data.receipt_no} | Email: ${data.email_status} | WhatsApp: ${data.whatsapp_status}`);
                      setManualPayForm(prev => ({ ...prev, delegate_name: '', email: '', phone: '', payment_reference: '' }));
                      setManualEntryModalOpen(false);
                      fetchDashboardData();
                      fetchDistrictReport();
                      fetchTransactions(1);
                    } catch (error) {
                      console.error('Manual designation payment failed:', error);
                      alert('Failed to mark as paid');
                    } finally {
                      setMarkingPaid(false);
                    }
                  }}
                  disabled={markingPaid}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {markingPaid ? 'Saving…' : 'Mark Paid'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
