import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  PlusCircle, 
  Clock, 
  CheckCircle, 
  BarChart3, 
  Users, 
  Settings, 
  IndianRupee, 
  Ticket, 
  TrendingUp, 
  ShieldCheck, 
  Eye, 
  Edit3, 
  Archive, 
  Trash2, 
  Plus, 
  ArrowUpRight, 
  Calendar,
  MapPin,
  RefreshCw,
  Sliders,
  DollarSign
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';
import { Event, OrganizerAnalytics, Booking, Reservation, TicketTier, EventCategory } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';

const TIER_COLORS = ['#C4A484', '#5D4634', '#D8CBE8', '#388E65', '#D99A36'];

export const OrganizerDashboardPage: React.FC = () => {
  const { user, token } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'events' | 'create' | 'reservations' | 'bookings' | 'analytics'
  >('overview');

  const [analytics, setAnalytics] = useState<OrganizerAnalytics | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');

  // Create Event Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('Technology Conferences');
  const [description, setDescription] = useState('');
  const [bannerImage, setBannerImage] = useState('https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1400&q=80');
  const [startDate, setStartDate] = useState('2026-11-20');
  const [endDate, setEndDate] = useState('2026-11-21');
  const [startTime, setStartTime] = useState('10:00 AM');
  const [endTime, setEndTime] = useState('06:00 PM');
  const [venueName, setVenueName] = useState('Grand Tech Auditorium');
  const [venueAddress, setVenueAddress] = useState('Outer Ring Road, Marathahalli');
  const [venueCity, setVenueCity] = useState('Bengaluru');
  const [venueState, setVenueState] = useState('Karnataka');
  const [salesCutoff, setSalesCutoff] = useState('2026-11-20');
  const [refundPolicy, setRefundPolicy] = useState('Full refund up to 72 hours before event start.');
  const [terms, setTerms] = useState('Photo ID matching ticket name required at registration desk.');
  const [ticketTiers, setTicketTiers] = useState<Array<{
    name: string;
    description: string;
    price: number;
    totalQuantity: number;
    maxPerAttendee: number;
  }>>([
    { name: 'General Admission', description: 'Access to keynotes and main hall', price: 1999, totalQuantity: 150, maxPerAttendee: 5 },
    { name: 'VIP Executive Pass', description: 'Reserved seating and speaker lounge lunch', price: 4999, totalQuantity: 30, maxPerAttendee: 2 }
  ]);

  const loadOrganizerData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, eventsRes, bookingsRes] = await Promise.all([
        fetch(`/api/organizer/analytics/overview?range=${dateRange}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/events/organizer/my', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/bookings/organizer', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (analyticsRes.ok) {
        const aData = await analyticsRes.json();
        setAnalytics(aData.analytics);
      }
      if (eventsRes.ok) {
        const eData = await eventsRes.json();
        setEvents(eData.events || []);
      }
      if (bookingsRes.ok) {
        const bData = await bookingsRes.json();
        setBookings(bData.bookings || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizerData();

    // Setup Real-time SSE Stream for live tenant updates
    let eventSource: EventSource | null = null;
    if (user.tenantId) {
      eventSource = new EventSource(`/api/realtime/stream?tenantId=${user.tenantId}`);
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'BOOKING_CONFIRMED') {
            showToast('New Booking Received!', 'success', `Booking ${parsed.payload.bookingReference} confirmed.`);
            loadOrganizerData();
          } else if (parsed.type === 'INVENTORY_RESERVED' || parsed.type === 'RESERVATION_EXPIRED') {
            loadOrganizerData();
          }
        } catch (e) {
          // ignore keep-alive
        }
      };
    }

    return () => {
      eventSource?.close();
    };
  }, [user.tenantId, token, dateRange]);

  const addTier = () => {
    setTicketTiers(prev => [
      ...prev,
      { name: 'Special Pass', description: 'Access tier', price: 2499, totalQuantity: 50, maxPerAttendee: 4 }
    ]);
  };

  const removeTier = (index: number) => {
    if (ticketTiers.length <= 1) {
      showToast('Minimum Tiers', 'warning', 'An event must have at least 1 ticket tier.');
      return;
    }
    setTicketTiers(prev => prev.filter((_, i) => i !== index));
  };

  const updateTierField = (index: number, field: string, value: any) => {
    setTicketTiers(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Validation Error', 'warning', 'Please provide an event title.');
      return;
    }

    try {
      const res = await fetch('/api/events/organizer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          category,
          description,
          bannerImage,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          startTime,
          endTime,
          venue: {
            name: venueName,
            address: venueAddress,
            city: venueCity,
            state: venueState,
            accessibilityDetails: 'Wheelchair access available throughout venue.'
          },
          salesCutoff: new Date(salesCutoff).toISOString(),
          refundPolicy,
          terms,
          ticketTiers,
          status: 'PUBLISHED'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('Error Creating Event', 'error', data.error);
        return;
      }

      showToast('Event Published!', 'success', `"${title}" is now accepting live 10-minute hold ticket reservations.`);
      setActiveTab('events');
      loadOrganizerData();
    } catch (err: any) {
      showToast('Error', 'error', err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Organizer Header Profile */}
      <div className="bg-[#EDE7F6] rounded-3xl p-6 sm:p-8 border border-[#D8CBE8] flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white border border-[#D8CBE8] flex items-center justify-center text-[#5D4634] shadow-xs font-bold text-xl">
            {user.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#5D4634]">{user.name}</h1>
              <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#388E65]/15 text-[#388E65]">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Tenant
              </span>
            </div>
            <div className="text-xs text-[#5F5A64] mt-1 flex flex-wrap items-center gap-3">
              <span>Tenant ID: <strong className="font-mono text-[#5D4634]">{user.tenantId || 'TENANT-TECH-01'}</strong></span>
              <span>•</span>
              <span>Default Currency: <strong>INR (₹)</strong></span>
              <span>•</span>
              <span>Timezone: <strong>Asia/Kolkata</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('create')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#C4A484] hover:bg-[#b09172] text-white text-xs font-bold shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Event</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Sidebar + Active Dashboard Tab */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-3 bg-white rounded-3xl border border-[#D8CBE8] p-3 shadow-xs space-y-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition text-left ${
              activeTab === 'overview'
                ? 'bg-[#EDE7F6] text-[#5D4634] border border-[#D8CBE8]'
                : 'text-[#5F5A64] hover:bg-[#F5EFE7] hover:text-[#5D4634]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-[#C4A484]" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition text-left ${
              activeTab === 'events'
                ? 'bg-[#EDE7F6] text-[#5D4634] border border-[#D8CBE8]'
                : 'text-[#5F5A64] hover:bg-[#F5EFE7] hover:text-[#5D4634]'
            }`}
          >
            <div className="flex items-center gap-3">
              <CalendarDays className="w-4 h-4 text-[#C4A484]" />
              <span>My Events</span>
            </div>
            <span className="text-[10px] bg-[#D8CBE8] text-[#5D4634] px-2 py-0.5 rounded-full">
              {events.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition text-left ${
              activeTab === 'create'
                ? 'bg-[#EDE7F6] text-[#5D4634] border border-[#D8CBE8]'
                : 'text-[#5F5A64] hover:bg-[#F5EFE7] hover:text-[#5D4634]'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-[#C4A484]" />
            <span>Create Event</span>
          </button>

          <button
            onClick={() => setActiveTab('bookings')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition text-left ${
              activeTab === 'bookings'
                ? 'bg-[#EDE7F6] text-[#5D4634] border border-[#D8CBE8]'
                : 'text-[#5F5A64] hover:bg-[#F5EFE7] hover:text-[#5D4634]'
            }`}
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-[#388E65]" />
              <span>Confirmed Bookings</span>
            </div>
            <span className="text-[10px] bg-[#D8CBE8] text-[#5D4634] px-2 py-0.5 rounded-full">
              {bookings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition text-left ${
              activeTab === 'analytics'
                ? 'bg-[#EDE7F6] text-[#5D4634] border border-[#D8CBE8]'
                : 'text-[#5F5A64] hover:bg-[#F5EFE7] hover:text-[#5D4634]'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-[#C4A484]" />
            <span>Revenue & Charts</span>
          </button>
        </aside>

        {/* Main Content Area */}
        <main className="lg:col-span-9 space-y-8">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-[#D8CBE8] shadow-xs">
                  <div className="flex justify-between items-center text-[#5F5A64]">
                    <span className="text-xs font-bold uppercase tracking-wider">Gross Revenue</span>
                    <DollarSign className="w-4 h-4 text-[#C4A484]" />
                  </div>
                  <div className="text-2xl font-extrabold text-[#5D4634] mt-2">
                    ₹{(analytics?.totalRevenue || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-[#388E65] font-semibold mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>+18.4% vs last cycle</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-[#D8CBE8] shadow-xs">
                  <div className="flex justify-between items-center text-[#5F5A64]">
                    <span className="text-xs font-bold uppercase tracking-wider">Tickets Sold</span>
                    <Ticket className="w-4 h-4 text-[#C4A484]" />
                  </div>
                  <div className="text-2xl font-extrabold text-[#5D4634] mt-2">
                    {analytics?.ticketsSold || 0}
                  </div>
                  <div className="text-[11px] text-[#5F5A64] mt-1">Across all published tiers</div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-[#D8CBE8] shadow-xs">
                  <div className="flex justify-between items-center text-[#5F5A64]">
                    <span className="text-xs font-bold uppercase tracking-wider">Active 10m Holds</span>
                    <Clock className="w-4 h-4 text-[#D99A36]" />
                  </div>
                  <div className="text-2xl font-extrabold text-[#D99A36] mt-2">
                    {analytics?.pendingReservations || 0}
                  </div>
                  <div className="text-[11px] text-[#5F5A64] mt-1">Currently in checkout</div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-[#D8CBE8] shadow-xs">
                  <div className="flex justify-between items-center text-[#5F5A64]">
                    <span className="text-xs font-bold uppercase tracking-wider">Conversion Rate</span>
                    <TrendingUp className="w-4 h-4 text-[#388E65]" />
                  </div>
                  <div className="text-2xl font-extrabold text-[#388E65] mt-2">
                    {analytics?.conversionRate || 74}%
                  </div>
                  <div className="text-[11px] text-[#5F5A64] mt-1">Hold to confirmed payment</div>
                </div>
              </div>

              {/* Revenue & Ticket Sales Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Line/Area Chart */}
                <div className="bg-white p-6 rounded-3xl border border-[#D8CBE8] shadow-xs space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold text-[#5D4634]">Revenue Over Time (₹)</h3>
                      <p className="text-[11px] text-[#5F5A64]">Daily sales aggregate</p>
                    </div>
                    <select
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value)}
                      className="bg-[#F5EFE7] text-[11px] font-semibold text-[#5D4634] px-2.5 py-1 rounded-xl border border-[#D8CBE8]"
                    >
                      <option value="7d">Last 7 Days</option>
                      <option value="30d">Last 30 Days</option>
                      <option value="90d">Last 90 Days</option>
                    </select>
                  </div>

                  <div className="h-64 w-full">
                    {analytics && (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analytics.revenueOverTime}>
                          <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#C4A484" stopOpacity={0.6}/>
                              <stop offset="95%" stopColor="#C4A484" stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F5EFE7" />
                          <XAxis dataKey="date" stroke="#5F5A64" fontSize={11} />
                          <YAxis stroke="#5F5A64" fontSize={11} tickFormatter={(val) => `₹${val/1000}k`} />
                          <Tooltip formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']} />
                          <Area type="monotone" dataKey="revenue" stroke="#5D4634" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Tier Distribution Donut Chart */}
                <div className="bg-white p-6 rounded-3xl border border-[#D8CBE8] shadow-xs space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#5D4634]">Ticket Tier Breakdown</h3>
                    <p className="text-[11px] text-[#5F5A64]">Sales share by package type</p>
                  </div>

                  <div className="h-64 w-full">
                    {analytics && analytics.tierDistribution && (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.tierDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {analytics.tierDistribution.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={TIER_COLORS[index % TIER_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any, name: any) => [`${value} tickets`, name]} />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              {/* Conversion Funnel */}
              <div className="bg-white p-6 rounded-3xl border border-[#D8CBE8] shadow-xs space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-[#5D4634]">Reservation Conversion Funnel</h3>
                  <p className="text-[11px] text-[#5F5A64]">Page view → 10-Min Hold → Confirmed Payment</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {analytics?.conversionFunnel.map((step, idx) => (
                    <div key={idx} className="p-4 bg-[#F5EFE7] rounded-2xl border border-[#D8CBE8]/70 text-center">
                      <div className="text-[10px] uppercase font-bold text-[#C4A484]">{step.stage}</div>
                      <div className="text-xl font-extrabold text-[#5D4634] mt-1">{step.count.toLocaleString('en-IN')}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MY EVENTS */}
          {activeTab === 'events' && (
            <div className="bg-white rounded-3xl border border-[#D8CBE8] p-6 shadow-xs space-y-6 animate-in fade-in duration-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-[#5D4634]">My Events ({events.length})</h2>
                  <p className="text-xs text-[#5F5A64]">Managed exclusively for tenant {user.tenantId}</p>
                </div>
                <button
                  onClick={() => setActiveTab('create')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C4A484] text-white text-xs font-bold hover:bg-[#b09172] transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Event</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#5F5A64]">
                  <thead className="bg-[#EDE7F6] text-[#5D4634] uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-3.5 rounded-l-xl">Event Title</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Sold / Capacity</th>
                      <th className="p-3.5">Revenue</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 rounded-r-xl text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D8CBE8]/50">
                    {events.map((evt) => {
                      const totalSold = evt.ticketTiers.reduce((acc, t) => acc + t.soldQuantity, 0);
                      const totalCap = evt.ticketTiers.reduce((acc, t) => acc + t.totalQuantity, 0);
                      const rev = evt.ticketTiers.reduce((acc, t) => acc + (t.soldQuantity * t.price), 0);

                      return (
                        <tr key={evt.id} className="hover:bg-[#F5EFE7]/50 transition">
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              <img src={evt.bannerImage} alt={evt.title} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                              <span className="font-bold text-[#5D4634] line-clamp-1">{evt.title}</span>
                            </div>
                          </td>
                          <td className="p-3.5 font-medium">{evt.category}</td>
                          <td className="p-3.5">
                            {new Date(evt.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="p-3.5 font-semibold text-[#5D4634]">
                            {totalSold} / {totalCap}
                          </td>
                          <td className="p-3.5 font-bold text-[#5D4634]">
                            ₹{rev.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#388E65]/15 text-[#388E65]">
                              {evt.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => showToast('Event Details', 'info', `Event ID: ${evt.id}`)}
                              className="p-1.5 hover:bg-[#EDE7F6] rounded-lg text-[#5D4634]"
                              title="Inspect Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: CREATE EVENT */}
          {activeTab === 'create' && (
            <div className="bg-white rounded-3xl border border-[#D8CBE8] p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-[#D8CBE8]/60 pb-4">
                <h2 className="text-xl font-bold text-[#5D4634]">Create New Event</h2>
                <p className="text-xs text-[#5F5A64]">
                  Publish a multi-tiered event with automated 10-minute hold inventory management.
                </p>
              </div>

              <form onSubmit={handleCreateEvent} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block text-[#5D4634] font-bold mb-1">Event Title *</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Asia Next-Gen Web Summit 2026"
                      className="w-full bg-[#F5EFE7]/50 border border-[#D8CBE8] rounded-xl px-3.5 py-2.5 text-[#5D4634] text-xs focus:outline-none focus:border-[#C4A484]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#5D4634] font-bold mb-1">Category *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as EventCategory)}
                      className="w-full bg-[#F5EFE7]/50 border border-[#D8CBE8] rounded-xl px-3.5 py-2.5 text-[#5D4634] text-xs focus:outline-none"
                    >
                      <option value="Technology Conferences">Technology Conferences</option>
                      <option value="Concerts">Concerts</option>
                      <option value="Workshops">Workshops</option>
                      <option value="Art Exhibitions">Art Exhibitions</option>
                      <option value="Festivals">Festivals</option>
                      <option value="Networking Events">Networking Events</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#5D4634] font-bold mb-1">Cover Banner URL</label>
                    <input
                      type="url"
                      value={bannerImage}
                      onChange={(e) => setBannerImage(e.target.value)}
                      className="w-full bg-[#F5EFE7]/50 border border-[#D8CBE8] rounded-xl px-3.5 py-2.5 text-[#5D4634] text-xs focus:outline-none focus:border-[#C4A484]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[#5D4634] font-bold mb-1">Full Description</label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the experience, schedule, and guest speakers..."
                      className="w-full bg-[#F5EFE7]/50 border border-[#D8CBE8] rounded-xl px-3.5 py-2 text-[#5D4634] text-xs focus:outline-none focus:border-[#C4A484]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#5D4634] font-bold mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-[#F5EFE7]/50 border border-[#D8CBE8] rounded-xl px-3.5 py-2 text-[#5D4634] text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[#5D4634] font-bold mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-[#F5EFE7]/50 border border-[#D8CBE8] rounded-xl px-3.5 py-2 text-[#5D4634] text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[#5D4634] font-bold mb-1">Venue Name</label>
                    <input
                      type="text"
                      value={venueName}
                      onChange={(e) => setVenueName(e.target.value)}
                      className="w-full bg-[#F5EFE7]/50 border border-[#D8CBE8] rounded-xl px-3.5 py-2 text-[#5D4634] text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[#5D4634] font-bold mb-1">City</label>
                    <input
                      type="text"
                      value={venueCity}
                      onChange={(e) => setVenueCity(e.target.value)}
                      className="w-full bg-[#F5EFE7]/50 border border-[#D8CBE8] rounded-xl px-3.5 py-2 text-[#5D4634] text-xs"
                    />
                  </div>
                </div>

                {/* Dynamic Ticket Tiers Section */}
                <div className="pt-4 border-t border-[#D8CBE8]/70 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#5D4634]">Ticket Tiers & Capacities</h3>
                      <p className="text-[11px] text-[#5F5A64]">Define price in INR (₹) and inventory limits</p>
                    </div>
                    <button
                      type="button"
                      onClick={addTier}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EDE7F6] border border-[#D8CBE8] text-xs font-bold text-[#5D4634] hover:bg-[#D8CBE8] transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Tier</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {ticketTiers.map((tier, idx) => (
                      <div key={idx} className="p-4 bg-[#F5EFE7] rounded-2xl border border-[#D8CBE8] grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs">
                        <div className="sm:col-span-3">
                          <label className="block font-semibold text-[#5F5A64] mb-0.5">Tier Name</label>
                          <input
                            type="text"
                            value={tier.name}
                            onChange={(e) => updateTierField(idx, 'name', e.target.value)}
                            className="w-full bg-white border border-[#D8CBE8] rounded-lg px-2.5 py-1.5 font-bold text-[#5D4634]"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block font-semibold text-[#5F5A64] mb-0.5">Price (₹)</label>
                          <input
                            type="number"
                            value={tier.price}
                            onChange={(e) => updateTierField(idx, 'price', Number(e.target.value))}
                            className="w-full bg-white border border-[#D8CBE8] rounded-lg px-2.5 py-1.5 font-bold text-[#5D4634]"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block font-semibold text-[#5F5A64] mb-0.5">Capacity</label>
                          <input
                            type="number"
                            value={tier.totalQuantity}
                            onChange={(e) => updateTierField(idx, 'totalQuantity', Number(e.target.value))}
                            className="w-full bg-white border border-[#D8CBE8] rounded-lg px-2.5 py-1.5 font-bold text-[#5D4634]"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block font-semibold text-[#5F5A64] mb-0.5">Max/Person</label>
                          <input
                            type="number"
                            value={tier.maxPerAttendee}
                            onChange={(e) => updateTierField(idx, 'maxPerAttendee', Number(e.target.value))}
                            className="w-full bg-white border border-[#D8CBE8] rounded-lg px-2.5 py-1.5 text-[#5D4634]"
                          />
                        </div>

                        <div className="sm:col-span-1 text-right pt-4 sm:pt-0">
                          <button
                            type="button"
                            onClick={() => removeTier(idx)}
                            className="p-1.5 hover:bg-white text-[#C94C4C] rounded-lg transition"
                            title="Remove tier"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[#D8CBE8]">
                  <button
                    type="button"
                    onClick={() => setActiveTab('events')}
                    className="px-5 py-2.5 rounded-xl bg-white border border-[#D8CBE8] text-xs font-bold text-[#5D4634]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#C4A484] hover:bg-[#b09172] text-white text-xs font-bold shadow-md transition"
                  >
                    Publish Event & Tiers
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: CONFIRMED BOOKINGS */}
          {activeTab === 'bookings' && (
            <div className="bg-white rounded-3xl border border-[#D8CBE8] p-6 shadow-xs space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-lg font-bold text-[#5D4634]">Tenant Bookings & Guest Roster</h2>
                <p className="text-xs text-[#5F5A64]">
                  Exportable attendee admission list for {user.tenantId}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#5F5A64]">
                  <thead className="bg-[#EDE7F6] text-[#5D4634] uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-3.5 rounded-l-xl">Reference</th>
                      <th className="p-3.5">Attendee</th>
                      <th className="p-3.5">Event</th>
                      <th className="p-3.5">Tickets</th>
                      <th className="p-3.5">Amount Paid</th>
                      <th className="p-3.5 rounded-r-xl">Date Confirmed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D8CBE8]/50">
                    {bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-[#F5EFE7]/50">
                        <td className="p-3.5 font-mono font-bold text-[#5D4634]">{b.bookingReference}</td>
                        <td className="p-3.5">
                          <span className="font-bold text-[#5D4634] block">{b.attendeeName}</span>
                          <span className="text-[11px] text-[#5F5A64]">{b.attendeeEmail}</span>
                        </td>
                        <td className="p-3.5 font-medium line-clamp-1">{b.eventTitle}</td>
                        <td className="p-3.5 font-bold text-[#5D4634]">{b.totalQuantity}</td>
                        <td className="p-3.5 font-bold text-[#388E65]">₹{b.totalAmount.toLocaleString('en-IN')}</td>
                        <td className="p-3.5">
                          {new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: ADVANCED ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-white p-6 rounded-3xl border border-[#D8CBE8] shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-[#5D4634]">Tickets Sold by Event</h3>
                <div className="h-64 w-full">
                  {analytics && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.ticketsByEvent}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F5EFE7" />
                        <XAxis dataKey="eventTitle" stroke="#5F5A64" fontSize={11} />
                        <YAxis stroke="#5F5A64" fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="sold" fill="#C4A484" radius={[6, 6, 0, 0]} name="Tickets Sold" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
