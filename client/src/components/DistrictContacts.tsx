import React, { useState, useEffect } from 'react';

interface Contact {
  id: number;
  name: string;
  club_name: string;
  phone: string | null;
  email: string | null;
  role: string;
  zone: string;
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

interface MessageCosts {
  whatsapp: { count: number; cost: number };
  email: { count: number; cost: number };
  total: { count: number; cost: number };
}

const DistrictContacts: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterZone, setFilterZone] = useState('All');
  const [filterRole, setFilterRole] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [messageCosts, setMessageCosts] = useState<MessageCosts | null>(null);

  useEffect(() => {
    fetchContacts();
    fetchMessageCosts();
  }, []);

  useEffect(() => {
    let filtered = contacts;
    
    if (filterZone !== 'All') {
      filtered = filtered.filter(c => c.zone === filterZone);
    }
    
    if (filterRole !== 'All') {
      filtered = filtered.filter(c => c.role === filterRole);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.club_name.toLowerCase().includes(query) ||
        (c.phone && c.phone.includes(query)) ||
        (c.email && c.email.toLowerCase().includes(query))
      );
    }
    
    setFilteredContacts(filtered);
  }, [contacts, filterZone, filterRole, searchQuery]);

  const fetchContacts = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/contacts`);
      const data = await response.json();
      if (data.success) {
        setContacts(data.contacts);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessageCosts = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/contacts/message-costs`);
      const data = await response.json();
      if (data.success) {
        setMessageCosts(data);
      }
    } catch (error) {
      console.error('Error fetching message costs:', error);
    }
  };

  const handleResetCosts = async () => {
    if (!confirm('Are you sure you want to reset all message cost counters?')) return;
    try {
      const response = await fetch(`${API_URL}/admin/contacts/message-costs/reset`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        fetchMessageCosts();
        alert('Message costs reset successfully');
      } else {
        alert('Failed to reset message costs');
      }
    } catch (error) {
      console.error('Error resetting costs:', error);
      alert('Failed to reset message costs');
    }
  };

  const zones = ['All', ...Array.from(new Set(contacts.map(c => c.zone)))].sort();
  const roles = ['All', ...Array.from(new Set(contacts.map(c => c.role)))].sort();

  const handleSendWhatsapp = async () => {
    if (!selectedContact || !whatsappMessage.trim()) return;
    setSending(true);
    try {
      const response = await fetch(`${API_URL}/admin/contacts/${selectedContact.id}/whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: whatsappMessage }),
      });
      const data = await response.json();
      if (data.success) {
        alert('WhatsApp message sent successfully');
        setWhatsappModalOpen(false);
        setWhatsappMessage('');
        setSelectedContact(null);
        fetchMessageCosts();
      } else {
        alert('Failed to send WhatsApp message');
      }
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      alert('Failed to send WhatsApp message');
    } finally {
      setSending(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedContact || !emailMessage.trim()) return;
    setSending(true);
    try {
      const response = await fetch(`${API_URL}/admin/contacts/${selectedContact.id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: emailSubject, message: emailMessage }),
      });
      const data = await response.json();
      if (data.success) {
        alert('Email sent successfully');
        setEmailModalOpen(false);
        setEmailSubject('');
        setEmailMessage('');
        setSelectedContact(null);
        fetchMessageCosts();
      } else {
        alert('Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleImportCSV = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const text = await file.text();
      const lines = text.split('\n').slice(1); // Skip header
      const contactsToImport = [];
      
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split(',');
        if (parts.length < 3) continue;
        
        contactsToImport.push({
          name: parts[0]?.trim() || '',
          club_name: parts[1]?.trim() || '',
          phone: parts[2]?.trim() || '',
          email: parts[3]?.trim() || '',
          role: parts[4]?.trim() || '',
          zone: parts[5]?.trim() || '',
        });
      }
      
      try {
        const response = await fetch(`${API_URL}/admin/contacts/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contacts: contactsToImport }),
        });
        const data = await response.json();
        if (data.success) {
          alert(`Imported ${data.imported} contacts. Skipped ${data.skipped}.`);
          fetchContacts();
        } else {
          alert('Failed to import contacts');
        }
      } catch (error) {
        console.error('Error importing contacts:', error);
        alert('Failed to import contacts');
      }
    };
    input.click();
  };

  if (loading) {
    return <div className="p-6 text-center">Loading contacts...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">District Contacts</h2>
        <button
          onClick={handleImportCSV}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Import CSV
        </button>
      </div>

      {/* Message Cost Counter */}
      {messageCosts && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex gap-6 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600">WhatsApp</p>
                  <p className="font-semibold text-gray-900">{messageCosts.whatsapp.count} msgs</p>
                  <p className="text-xs text-gray-500">Rs.{messageCosts.whatsapp.cost.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold text-gray-900">{messageCosts.email.count} msgs</p>
                  <p className="text-xs text-gray-500">Rs.{messageCosts.email.cost.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-full">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Cost</p>
                  <p className="font-bold text-lg text-gray-900">Rs.{messageCosts.total.cost.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{messageCosts.total.count} messages</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleResetCosts}
              className="text-sm text-red-600 hover:text-red-800 underline"
            >
              Reset Counter
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
          <input
            type="text"
            placeholder="Name, club, phone, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Zone</label>
          <select
            value={filterZone}
            onChange={(e) => setFilterZone(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {zones.map(zone => (
              <option key={zone} value={zone}>{zone}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {roles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Club</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredContacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{contact.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.club_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.phone || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.email || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.zone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    {contact.phone && (
                      <button
                        onClick={() => {
                          setSelectedContact(contact);
                          setWhatsappModalOpen(true);
                        }}
                        className="text-green-600 hover:text-green-900"
                      >
                        WhatsApp
                      </button>
                    )}
                    {contact.email && (
                      <button
                        onClick={() => {
                          setSelectedContact(contact);
                          setEmailModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Email
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredContacts.length === 0 && (
          <div className="text-center py-8 text-gray-500">No contacts found</div>
        )}
      </div>

      {/* WhatsApp Modal */}
      {whatsappModalOpen && selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Send WhatsApp to {selectedContact.name}</h3>
            <textarea
              value={whatsappMessage}
              onChange={(e) => setWhatsappMessage(e.target.value)}
              placeholder="Enter your message..."
              rows={5}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent mb-4"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setWhatsappModalOpen(false);
                  setWhatsappMessage('');
                  setSelectedContact(null);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSendWhatsapp}
                disabled={sending || !whatsappMessage.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {emailModalOpen && selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Send Email to {selectedContact.name}</h3>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Subject"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
            />
            <textarea
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              placeholder="Enter your message..."
              rows={5}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setEmailModalOpen(false);
                  setEmailSubject('');
                  setEmailMessage('');
                  setSelectedContact(null);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sending || !emailMessage.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DistrictContacts;
