import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Building2, 
  CalendarDays, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  FileText, 
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { AdminOverview, OrganizerProfile, User, Event, AuditLog } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';

export const AdminDashboardPage: React.FC = () => {
  const { token, user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'organizers' | 'events' | 'audit'>('overview');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [organizers, setOrganizers] = useState<OrganizerProfile[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [ovRes, orgRes, evtRes, logRes] = await Promise.all([
        fetch('/api/admin/overview', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/organizers', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/events', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/audit-logs', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (ovRes.ok) {
        const d = await ovRes.json();
        setOverview(d.overview);
      }
      if (orgRes.ok) {
        const d = await orgRes.json();
        setOrganizers(d.organizers || []);
      }
      if (evtRes.ok) {
        const d = await evtRes.json();
        setEvents(d.events || []);
      }
      if (logRes.ok) {
        const d = await logRes.json();
        setAuditLogs(d.logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  const updateOrganizerStatus = async (organizerId: string, status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_REVIEW', verified: boolean) => {
    try {
      const res = await fetch(`/api/admin/organizers/${organizerId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status, verified })
      });
      if (res.ok) {
        showToast('Organizer Updated', 'success', `Tenant status set to ${status}.`);
        fetchAdminData();
      }
    } catch (err: any) {
      showToast('Error', 'error', err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-[#5D4634] text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#C4A484] text-white flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold">Platform Super-Admin</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#388E65] text-white">
                Multi-Tenant Authority
              </span>
            </div>
            <p className="text-xs text-[#EDE7F6] mt-0.5">
              Moderation, tenant approvals, audit compliance, and platform gross transactions.
            </p>
          </div>
        </div>

        <button
          onClick={fetchAdminData}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition self-start sm:self-center"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Admin KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#D8CBE8] shadow-xs">
          <div className="text-[11px] font-bold uppercase text-[#5F5A64]">Gross Platform Sales</div>
          <div className="text-xl font-extrabold text-[#5D4634] mt-1">
            ₹{(overview?.grossSales || 0).toLocaleString('en-IN')}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#D8CBE8] shadow-xs">
          <div className="text-[11px] font-bold uppercase text-[#5F5A64]">Confirmed Tickets</div>
          <div className="text-xl font-extrabold text-[#5D4634] mt-1">
            {overview?.totalConfirmedTickets || 0}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#D8CBE8] shadow-xs">
          <div className="text-[11px] font-bold uppercase text-[#5F5A64]">Active Organizers</div>
          <div className="text-xl font-extrabold text-[#5D4634] mt-1">
            {overview?.totalOrganizers || 0}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#D8CBE8] shadow-xs">
          <div className="text-[11px] font-bold uppercase text-[#5F5A64]">Published Events</div>
          <div className="text-xl font-extrabold text-[#5D4634] mt-1">
            {overview?.totalEvents || 0}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#D8CBE8] shadow-xs">
          <div className="text-[11px] font-bold uppercase text-[#5F5A64]">Registered Users</div>
          <div className="text-xl font-extrabold text-[#5D4634] mt-1">
            {overview?.totalUsers || 0}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#D8CBE8]/70 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'overview'
              ? 'bg-[#5D4634] text-white'
              : 'text-[#5F5A64] hover:bg-[#EDE7F6]'
          }`}
        >
          Platform Overview
        </button>
        <button
          onClick={() => setActiveTab('organizers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'organizers'
              ? 'bg-[#5D4634] text-white'
              : 'text-[#5F5A64] hover:bg-[#EDE7F6]'
          }`}
        >
          Organizers & Tenants ({organizers.length})
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'events'
              ? 'bg-[#5D4634] text-white'
              : 'text-[#5F5A64] hover:bg-[#EDE7F6]'
          }`}
        >
          All Events ({events.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'audit'
              ? 'bg-[#5D4634] text-white'
              : 'text-[#5F5A64] hover:bg-[#EDE7F6]'
          }`}
        >
          Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'organizers' && (
        <div className="bg-white rounded-3xl border border-[#D8CBE8] p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-[#5D4634]">Organizer Profiles & Approval Controls</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#5F5A64]">
              <thead className="bg-[#EDE7F6] text-[#5D4634] uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3.5 rounded-l-xl">Tenant ID</th>
                  <th className="p-3.5">Business Name</th>
                  <th className="p-3.5">Contact</th>
                  <th className="p-3.5">Commission</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 rounded-r-xl text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8CBE8]/50">
                {organizers.map((org) => (
                  <tr key={org.id} className="hover:bg-[#F5EFE7]/50">
                    <td className="p-3.5 font-mono font-bold text-[#5D4634]">{org.id}</td>
                    <td className="p-3.5 font-bold text-[#5D4634]">{org.businessName}</td>
                    <td className="p-3.5">{org.contactEmail}</td>
                    <td className="p-3.5 font-mono">{org.commissionRate * 100}%</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        org.status === 'ACTIVE'
                          ? 'bg-[#388E65]/15 text-[#388E65]'
                          : org.status === 'SUSPENDED'
                          ? 'bg-[#C94C4C]/15 text-[#C94C4C]'
                          : 'bg-[#D99A36]/15 text-[#D99A36]'
                      }`}>
                        {org.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      {org.status !== 'ACTIVE' && (
                        <button
                          onClick={() => updateOrganizerStatus(org.id, 'ACTIVE', true)}
                          className="px-2.5 py-1 rounded-lg bg-[#388E65] text-white font-bold text-[11px] hover:bg-[#2e7453] transition"
                        >
                          Approve
                        </button>
                      )}
                      {org.status === 'ACTIVE' && (
                        <button
                          onClick={() => updateOrganizerStatus(org.id, 'SUSPENDED', false)}
                          className="px-2.5 py-1 rounded-lg bg-[#C94C4C] text-white font-bold text-[11px] hover:bg-[#aa3e3e] transition"
                        >
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="bg-white rounded-3xl border border-[#D8CBE8] p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-[#5D4634]">Platform Events Moderation</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#5F5A64]">
              <thead className="bg-[#EDE7F6] text-[#5D4634] uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3.5 rounded-l-xl">Event Title</th>
                  <th className="p-3.5">Tenant Owner</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 rounded-r-xl text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8CBE8]/50">
                {events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-[#F5EFE7]/50">
                    <td className="p-3.5 font-bold text-[#5D4634]">{evt.title}</td>
                    <td className="p-3.5 font-mono text-[11px]">{evt.tenantId}</td>
                    <td className="p-3.5">{evt.category}</td>
                    <td className="p-3.5">
                      {new Date(evt.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#388E65]/15 text-[#388E65]">
                        {evt.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => showToast('Event Moderated', 'info', `Inspected ${evt.title}`)}
                        className="px-3 py-1 rounded-lg bg-[#EDE7F6] text-[#5D4634] font-semibold hover:bg-[#D8CBE8]"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-[#D8CBE8] p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-[#5D4634]">Immutable System Audit Trail</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#5F5A64]">
              <thead className="bg-[#EDE7F6] text-[#5D4634] uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3.5 rounded-l-xl">Timestamp</th>
                  <th className="p-3.5">Actor Role</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Entity</th>
                  <th className="p-3.5 rounded-r-xl">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8CBE8]/50 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F5EFE7]/50 font-sans">
                    <td className="p-3.5 whitespace-nowrap text-[#5F5A64]">
                      {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="p-3.5 font-bold text-[#5D4634]">{log.userRole}</td>
                    <td className="p-3.5 font-semibold text-[#C4A484]">{log.action}</td>
                    <td className="p-3.5">{log.entityType} ({log.entityId})</td>
                    <td className="p-3.5 text-[#5F5A64]">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="bg-[#F5EFE7] rounded-3xl p-6 border border-[#D8CBE8] space-y-3 text-xs text-[#5F5A64]">
          <h4 className="font-bold text-[#5D4634] text-sm">Platform Health & Compliance Summary</h4>
          <p>
            Eventique platform is operating across 2 primary tenant organizations (Apex Horizons and Aura Sound & Cultural Arts).
            All ticket holds utilize atomic database serialization to ensure zero overselling and exact 10-minute hold lifecycles.
          </p>
        </div>
      )}
    </div>
  );
};
