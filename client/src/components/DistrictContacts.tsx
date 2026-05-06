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

  useEffect(() => {
    fetchContacts();
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
