import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

interface Contact {
  id: number;
  name: string;
  club_name: string;
  phone: string | null;
  email: string | null;
  role: string;
  zone: string;
}

interface MessageCosts {
  whatsapp: { count: number; cost: number };
  email: { count: number; cost: number };
  total: { count: number; cost: number };
}

interface DistrictContactsProps {
  userRole?: string;
}

const WHATSAPP_TEMPLATES = [
  {
    id: 'dla_reminder',
    label: 'Registration Reminder',
    preview: `Dear {name},

This is a reminder to register your clubs for the District Learning Assembly 2026.

Event Details:
Date: 24 May 2026
Venue: KPR College of Arts Science and Research, Coimbatore

Please complete your registration at the earliest.

Regards,
RCC Heritage - Rotary District 3206`,
  },
  {
    id: 'dla_event',
    label: 'Event Details',
    preview: `Dear {name},

District Learning Assembly 2026 registrations are now open.

Date: 24 May 2026
Venue: KPR College of Arts Science and Research, Coimbatore
Location Map: https://share.google/bOskrewX72xznhLSc
Registration Link: dla.feequick.com

Kindly share this information with your club delegates and encourage them to complete registration at the earliest.

RCC Heritage - Rotary District 3206`,
  },
];

const EMAIL_TEMPLATES = [
  {
    id: 'registration_reminder',
    label: 'Registration Reminder',
    subject: 'Register Now - District Learning Assembly 2026',
    body: `Dear {name},

This is a reminder to register your club delegates for the District Learning Assembly 2026.

Event Details:
Date: 24 May 2026
Venue: KPR College of Arts Science and Research, Coimbatore

Please complete your registration at the earliest.

Regards,
Rotary District 3206`,
    isHtml: false,
  },
  {
    id: 'event_details',
    label: 'Event Details',
    subject: 'District Learning Assembly 2026 - Event Details',
    body: `Dear {name},

District Learning Assembly 2026 registrations are now open.

Date: 24 May 2026
Venue: KPR College of Arts Science and Research, Coimbatore
Map: https://share.google/bOskrewX72xznhLSc
Registration: https://dla.feequick.com

Please ensure all your club delegates are informed.

Regards,
Rotary District 3206`,
    isHtml: false,
  },
  {
    id: 'custom',
    label: 'Custom Message',
    subject: '',
    body: '',
    isHtml: false,
  },
];

const DistrictContacts: React.FC<DistrictContactsProps> = ({ userRole }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterZone, setFilterZone] = useState('All');
  const [filterRole, setFilterRole] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [messageCosts, setMessageCosts] = useState<MessageCosts | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkChannel, setBulkChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [selectedWaTemplate, setSelectedWaTemplate] = useState(WHATSAPP_TEMPLATES[0].id);
  const [selectedEmailTemplate, setSelectedEmailTemplate] = useState(EMAIL_TEMPLATES[0].id);
  const [messageSubject, setMessageSubject] = useState(EMAIL_TEMPLATES[0].subject);
  const [messageBody, setMessageBody] = useState(EMAIL_TEMPLATES[0].body);
  const [isHtmlEmail, setIsHtmlEmail] = useState(false);
  const [waImage, setWaImage] = useState<File | null>(null);
  const [waImagePreview, setWaImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState('');

  useEffect(() => { fetchContacts(); fetchMessageCosts(); }, []);

  useEffect(() => {
    let filtered = contacts;
    if (filterZone !== 'All') filtered = filtered.filter(c => c.zone === filterZone);
    if (filterRole !== 'All') filtered = filtered.filter(c => c.role === filterRole);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.club_name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
      );
    }
    setFilteredContacts(filtered);
  }, [contacts, filterZone, filterRole, searchQuery]);

  const fetchContacts = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/contacts`);
      const data = await res.json();
      if (data.success) setContacts(data.contacts);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchMessageCosts = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/contacts/message-costs`);
      const data = await res.json();
      if (data.success) setMessageCosts(data);
    } catch (e) { console.error(e); }
  };

  const handleResetCosts = async () => {
    if (!window.confirm('Reset all message cost counters?')) return;
    await fetch(`${API_URL}/admin/contacts/message-costs/reset`, { method: 'POST' });
    fetchMessageCosts();
  };

  const handleImportCSV = async () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const csvText = await file.text();
      try {
        const res = await fetch(`${API_URL}/admin/contacts/import`, {
          method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: csvText,
        });
        const data = await res.json();
        if (data.success) { alert(`Imported ${data.imported} contacts. Skipped ${data.skipped}.`); fetchContacts(); }
        else alert(data.error || 'Import failed');
      } catch { alert('Import failed'); }
    };
    input.click();
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map(c => c.id)));
    }
  };

  const handleEmailTemplateChange = (templateId: string) => {
    setSelectedEmailTemplate(templateId);
    const t = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (t) { setMessageSubject(t.subject); setMessageBody(t.body); setIsHtmlEmail(t.isHtml); }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setWaImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setWaImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleBulkSend = async () => {
    const targets = filteredContacts.filter(c => selectedIds.has(c.id));
    if (targets.length === 0) return;
    
    if (bulkChannel === 'email' && !messageBody.trim()) { 
      alert('Message body is required'); 
      return; 
    }
    
    if (!window.confirm(`Send ${bulkChannel} to ${targets.length} contacts?`)) return;

    setSending(true);
    let sent = 0; let failed = 0;

    // For WhatsApp, upload image first if provided
    let imageUrl: string | null = null;
    if (bulkChannel === 'whatsapp' && waImage) {
      try {
        const formData = new FormData();
        formData.append('image', waImage);
        const uploadRes = await fetch(`${API_URL}/admin/upload-image`, {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          imageUrl = uploadData.url;
        }
      } catch (e) {
        console.error('Image upload failed:', e);
      }
    }

    for (const contact of targets) {
      try {
        if (bulkChannel === 'whatsapp') {
          const res = await fetch(`${API_URL}/admin/contacts/${contact.id}/whatsapp-template`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              template: selectedWaTemplate,
              imageUrl,
            }),
          });
          const data = await res.json();
          if (data.success) sent++; else failed++;
        } else {
          const personalizedBody = messageBody.replace(/{name}/g, contact.name).replace(/{club}/g, contact.club_name);
          const res = await fetch(`${API_URL}/admin/contacts/${contact.id}/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              subject: messageSubject, 
              message: personalizedBody,
              isHtml: isHtmlEmail,
            }),
          });
          const data = await res.json();
          if (data.success) sent++; else failed++;
        }
      } catch { failed++; }
      setSendProgress(`Sending... ${sent + failed}/${targets.length}`);
    }

    setSending(false);
    setSendProgress('');
    fetchMessageCosts();
    alert(`Done! Sent: ${sent}, Failed: ${failed}`);
    setBulkModalOpen(false);
    setSelectedIds(new Set());
    setWaImage(null);
    setWaImagePreview(null);
  };

  const zones = ['All', ...Array.from(new Set(contacts.map(c => c.zone))).filter(Boolean).sort()];
  const roles = ['All', ...Array.from(new Set(contacts.map(c => c.role))).filter(Boolean).sort()];
  const allFilteredSelected = filteredContacts.length > 0 && selectedIds.size === filteredContacts.length;

  if (loading) return <div className="p-6 text-center text-gray-500">Loading contacts...</div>;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
        <h2 className="text-xl font-bold text-gray-800">District Contacts <span className="text-sm font-normal text-gray-500">({filteredContacts.length} shown)</span></h2>
        <div className="flex gap-2 flex-wrap">
          {selectedIds.size > 0 && (
            <>
              <button
                onClick={() => { setBulkChannel('whatsapp'); setBulkModalOpen(true); }}
                className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 font-medium"
              >
                WhatsApp ({selectedIds.size})
              </button>
              <button
                onClick={() => { setBulkChannel('email'); setBulkModalOpen(true); }}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 font-medium"
              >
                Email ({selectedIds.size})
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="border border-gray-300 text-gray-600 px-3 py-2 rounded-lg text-sm hover:bg-gray-100"
              >
                Clear
              </button>
            </>
          )}
          <button onClick={handleImportCSV} className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-800">
            Import CSV
          </button>
        </div>
      </div>

      {/* Message Cost Counter */}
      {messageCosts && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex flex-wrap gap-6 items-center justify-between">
          <div className="flex gap-6 flex-wrap text-sm">
            <div><span className="text-gray-500">WhatsApp:</span> <strong>{messageCosts.whatsapp.count}</strong> msgs · Rs.{messageCosts.whatsapp.cost.toFixed(2)}</div>
            <div><span className="text-gray-500">Email:</span> <strong>{messageCosts.email.count}</strong> msgs · Rs.{messageCosts.email.cost.toFixed(2)}</div>
            <div><span className="text-gray-500">Total:</span> <strong>Rs.{messageCosts.total.cost.toFixed(2)}</strong></div>
          </div>
          {userRole === 'super_admin' && (
            <button onClick={handleResetCosts} className="text-xs text-red-600 hover:text-red-800 underline">Reset Counter</button>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          type="text" placeholder="Search name, club, phone, email..."
          value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select value={filterZone} onChange={(e) => setFilterZone(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          {zones.map(z => <option key={z}>{z}</option>)}
        </select>
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          {roles.map(r => <option key={r}>{r}</option>)}
        </select>
      </div>

      {/* Contacts Table - all contacts, scrollable */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 380px)', overflowY: 'auto' }}>
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-3 text-left">
                  <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-blue-600" />
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Club</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zone</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredContacts.map((contact) => (
                <tr
                  key={contact.id}
                  onClick={() => toggleSelect(contact.id)}
                  className={`cursor-pointer hover:bg-blue-50 transition-colors ${selectedIds.has(contact.id) ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-3 py-2.5">
                    <input type="checkbox" checked={selectedIds.has(contact.id)} onChange={() => {}}
                      className="rounded border-gray-300 text-blue-600 pointer-events-none" />
                  </td>
                  <td className="px-3 py-2.5 font-medium text-gray-900">{contact.name}</td>
                  <td className="px-3 py-2.5 text-gray-600">{contact.club_name}</td>
                  <td className="px-3 py-2.5 text-gray-600">{contact.phone || '-'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{contact.email || '-'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{contact.role}</td>
                  <td className="px-3 py-2.5 text-gray-600">{contact.zone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredContacts.length === 0 && (
          <div className="text-center py-10 text-gray-500">No contacts found</div>
        )}
      </div>

      {/* Bulk Message Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Send {bulkChannel === 'whatsapp' ? 'WhatsApp' : 'Email'} to {selectedIds.size} contacts
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setBulkChannel('whatsapp')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${bulkChannel === 'whatsapp' ? 'bg-green-600 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                >WhatsApp</button>
                <button
                  onClick={() => setBulkChannel('email')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${bulkChannel === 'email' ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                >Email</button>
              </div>
            </div>

            {/* WhatsApp Templates */}
            {bulkChannel === 'whatsapp' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Template</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {WHATSAPP_TEMPLATES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedWaTemplate(t.id)}
                        className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                          selectedWaTemplate === t.id
                            ? 'border-green-500 bg-green-50 text-green-700 font-medium'
                            : 'border-gray-200 hover:border-gray-400 text-gray-700'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Template Preview */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Preview</label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600 whitespace-pre-wrap font-mono">
                    {WHATSAPP_TEMPLATES.find(t => t.id === selectedWaTemplate)?.preview.replace(/{name}/g, '[Contact Name]')}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Template text cannot be edited. Name will be personalised for each contact.</p>
                </div>

                {/* Image Upload */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload Image (Optional)</label>
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                      />
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG up to 5MB. Image will be sent with the template.</p>
                    </div>
                    {waImagePreview && (
                      <div className="relative">
                        <img src={waImagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg border" />
                        <button
                          onClick={() => { setWaImage(null); setWaImagePreview(null); }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                        >×</button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Email Templates */}
            {bulkChannel === 'email' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Template</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {EMAIL_TEMPLATES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleEmailTemplateChange(t.id)}
                        className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                          selectedEmailTemplate === t.id
                            ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                            : 'border-gray-200 hover:border-gray-400 text-gray-700'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* HTML Toggle */}
                <div className="mb-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="htmlEmail"
                    checked={isHtmlEmail}
                    onChange={(e) => setIsHtmlEmail(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <label htmlFor="htmlEmail" className="text-sm text-gray-700">Send as HTML email</label>
                </div>

                {/* Subject */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input
                    type="text" value={messageSubject} onChange={(e) => setMessageSubject(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="Email subject..."
                  />
                </div>

                {/* Message Body */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isHtmlEmail ? 'HTML Content' : 'Message'} <span className="text-xs text-gray-400">(use {'{name}'} and {'{club}'} for personalisation)</span>
                  </label>
                  <textarea
                    value={messageBody} onChange={(e) => setMessageBody(e.target.value)}
                    rows={8}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 ${isHtmlEmail ? 'font-mono text-xs' : ''}`}
                    placeholder={isHtmlEmail ? '<html>...</html>' : 'Enter your message...'}
                  />
                </div>
              </>
            )}

            {sendProgress && (
              <p className="text-sm text-blue-600 mb-3 font-medium">{sendProgress}</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setBulkModalOpen(false); setSendProgress(''); setWaImage(null); setWaImagePreview(null); }}
                disabled={sending}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50"
              >Cancel</button>
              <button
                onClick={handleBulkSend}
                disabled={sending || (bulkChannel === 'email' && !messageBody.trim())}
                className={`px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 ${
                  bulkChannel === 'whatsapp' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {sending ? sendProgress || 'Sending...' : `Send to ${selectedIds.size} contacts`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DistrictContacts;
