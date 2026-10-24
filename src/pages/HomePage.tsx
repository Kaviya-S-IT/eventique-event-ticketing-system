import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Calendar, 
  Users, 
  Ticket, 
  CheckCircle2, 
  Zap, 
  ChevronRight,
  TrendingUp,
  Clock
} from 'lucide-react';
import { Event, EventCategory } from '../types/index.ts';
import { EventCard } from '../components/EventCard.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface HomePageProps {
  onNavigate: (view: string, categoryFilter?: string) => void;
  onSelectEvent: (event: Event) => void;
}

const CATEGORIES: { name: EventCategory | 'All'; icon: string }[] = [
  { name: 'All', icon: '✨' },
  { name: 'Concerts', icon: '🎵' },
  { name: 'Technology Conferences', icon: '💻' },
  { name: 'Workshops', icon: '🛠️' },
  { name: 'Art Exhibitions', icon: '🎨' },
  { name: 'Festivals', icon: '🎪' },
  { name: 'Networking Events', icon: '🤝' }
];

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onSelectEvent }) => {
  const { user, switchPersona } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [selectedCategory]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const url = selectedCategory === 'All' 
        ? '/api/events' 
        : `/api/events?category=${encodeURIComponent(selectedCategory)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-24">
      {/* Hero Section */}
      <section className="relative pt-6 sm:pt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#EDE7F6] rounded-3xl p-8 sm:p-14 lg:p-16 border border-[#D8CBE8]/70 relative overflow-hidden shadow-xs">
            {/* Background ambient accents */}
            <div className="absolute -right-24 -top-24 w-96 h-96 bg-[#D8CBE8]/40 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-[#C4A484]/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Headlines & CTAs */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white text-[#5D4634] text-xs font-bold border border-[#D8CBE8] shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-[#C4A484]" />
                  <span>The Premier Multi-Tenant Ticketing Platform</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#5D4634] leading-[1.12]">
                  Make Every Moment an <span className="text-[#C4A484]">Experience.</span>
                </h1>

                <p className="text-base sm:text-lg text-[#5F5A64] max-w-xl leading-relaxed">
                  Discover extraordinary concerts, tech summits, exhibitions, and workshops. Reserve seats under our guaranteed 10-minute hold engine and checkout with complete peace of mind.
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button
                    onClick={() => onNavigate('explore')}
                    className="flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-[#C4A484] hover:bg-[#b09172] text-white font-bold text-sm shadow-md transition-all group"
                  >
                    <span>Explore Events</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    onClick={() => {
                      if (user.role !== 'ORGANIZER') {
                        switchPersona('USR-ORG-TECH');
                      }
                      onNavigate('organizer-dashboard');
                    }}
                    className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-[#F5EFE7] text-[#5D4634] font-bold text-sm border border-[#D8CBE8] transition shadow-xs"
                  >
                    <span>Host an Event</span>
                  </button>
                </div>

                {/* Event Statistics Indicators (Sample data clearly labeled) */}
                <div className="pt-8 border-t border-[#D8CBE8]/70 grid grid-cols-3 gap-6">
                  <div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-[#5D4634]">140+</div>
                    <div className="text-xs text-[#5F5A64] font-medium mt-0.5">Upcoming Events</div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-[#5D4634]">85+</div>
                    <div className="text-xs text-[#5F5A64] font-medium mt-0.5">Verified Organizers</div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-[#5D4634]">28,000+</div>
                    <div className="text-xs text-[#5F5A64] font-medium mt-0.5">Tickets Booked</div>
                  </div>
                </div>
                <div className="text-[10px] text-[#5F5A64]/80 italic">
                  * Metrics represent platform demo totals and active system milestones.
                </div>
              </div>

              {/* Right Column: Hero Visual Showcase */}
              <div className="lg:col-span-5 relative">
                <div className="relative rounded-3xl overflow-hidden shadow-xl border-4 border-white aspect-[4/3] group">
                  <img
                    src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80"
                    alt="Event Crowd"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  
                  {/* Floating Live Hold Feature Card */}
                  <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-[#D8CBE8] shadow-lg">
                    <div className="flex items-center justify-between text-xs font-bold text-[#5D4634]">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#D99A36]" />
                        10-Min Reservation Hold
                      </span>
                      <span className="text-[#388E65]">Zero-Oversell</span>
                    </div>
                    <p className="text-[11px] text-[#5F5A64] mt-1 leading-snug">
                      Your chosen seats are safely locked in PostgreSQL transactions while you enter payment.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Filter Chips */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#5D4634]">Popular Categories</h2>
            <p className="text-xs text-[#5F5A64] mt-0.5">Explore experiences tailored to your interests</p>
          </div>
          <button
            onClick={() => onNavigate('explore')}
            className="text-xs font-bold text-[#C4A484] hover:text-[#5D4634] flex items-center gap-1 transition"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.name;
            return (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition-all border ${
                  active
                    ? 'bg-[#EDE7F6] text-[#5D4634] border-[#C4A484] shadow-xs'
                    : 'bg-white text-[#5F5A64] border-[#D8CBE8] hover:bg-[#F5EFE7] hover:border-[#C4A484]/50'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Featured Events Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[#5D4634]">
              {selectedCategory === 'All' ? 'Featured Experiences' : `${selectedCategory}`}
            </h2>
            <p className="text-xs text-[#5F5A64] mt-0.5">Top-rated conferences, festivals, and live sessions</p>
          </div>
          <button
            onClick={() => onNavigate('explore')}
            className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-[#5D4634] hover:text-[#C4A484] transition"
          >
            <span>See all {events.length} events</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 bg-[#EDE7F6]/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 bg-[#F5EFE7] rounded-3xl border border-[#D8CBE8]">
            <Ticket className="w-10 h-10 text-[#C4A484] mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#5D4634]">No events found in this category</h3>
            <p className="text-xs text-[#5F5A64] mt-1">Try switching categories or browse all listings.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((evt) => (
              <EventCard key={evt.id} event={evt} onSelect={onSelectEvent} />
            ))}
          </div>
        )}
      </section>

      {/* How Eventique Works in 3 Simple Steps */}
      <section className="bg-[#F5EFE7] py-20 border-y border-[#D8CBE8]/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-16 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#C4A484]">
              Seamless Ticketing
            </span>
            <h2 className="text-3xl font-extrabold text-[#5D4634]">
              How Eventique Works
            </h2>
            <p className="text-xs text-[#5F5A64]">
              Reliable reservation workflow built for high-demand ticket drops.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white p-8 rounded-3xl border border-[#D8CBE8] shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EDE7F6] text-[#5D4634] font-extrabold text-lg flex items-center justify-center border border-[#D8CBE8]">
                01
              </div>
              <h3 className="text-lg font-bold text-[#5D4634]">Choose Tier & Tickets</h3>
              <p className="text-xs text-[#5F5A64] leading-relaxed">
                Filter by date, location, or tier: VIP passes, Early Bird entry, or Student access with real-time seat counts.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-8 rounded-3xl border border-[#D8CBE8] shadow-xs space-y-4 relative">
              <div className="w-12 h-12 rounded-2xl bg-[#EDE7F6] text-[#D99A36] font-extrabold text-lg flex items-center justify-center border border-[#D8CBE8]">
                02
              </div>
              <h3 className="text-lg font-bold text-[#5D4634]">10-Minute Hold Guarantee</h3>
              <p className="text-xs text-[#5F5A64] leading-relaxed">
                Once selected, your tickets are atomically locked for 10 minutes. No one else can snap your seats while you enter payment.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-8 rounded-3xl border border-[#D8CBE8] shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EDE7F6] text-[#388E65] font-extrabold text-lg flex items-center justify-center border border-[#D8CBE8]">
                03
              </div>
              <h3 className="text-lg font-bold text-[#5D4634]">Instant QR Ticket Pass</h3>
              <p className="text-xs text-[#5F5A64] leading-relaxed">
                Upon simulated gateway approval, receive unique scannable QR ticket codes, receipts, and downloadable digital passes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits for Event Organizers */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-[#D8CBE8] p-8 sm:p-12 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-6">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#C4A484]">
              For Event Creators & Organizers
            </span>
            <h2 className="text-3xl font-extrabold text-[#5D4634] leading-snug">
              Every Tool to Scale Ticket Sales and Delight Audiences.
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#388E65] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-[#5D4634]">Multi-Tier Ticketing Engine</h4>
                  <p className="text-xs text-[#5F5A64]">
                    Configure VIP packages, Early Bird discounts, per-person purchase caps, and custom sales windows.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#388E65] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-[#5D4634]">Real-Time Revenue Analytics</h4>
                  <p className="text-xs text-[#5F5A64]">
                    Monitor conversion funnels, daily sales curves, and tier breakdown charts scoped to your tenant.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#388E65] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-[#5D4634]">Zero Inventory Desync</h4>
                  <p className="text-xs text-[#5F5A64]">
                    High-throughput concurrency protection eliminates double-booking chaos on sold-out drops.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  switchPersona('USR-ORG-TECH');
                  onNavigate('organizer-dashboard');
                }}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#5D4634] hover:bg-[#4a3627] text-white font-bold text-xs shadow-md transition"
              >
                <span>Launch Organizer Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 bg-[#F5EFE7] rounded-3xl p-6 border border-[#D8CBE8]/80">
            <div className="bg-white rounded-2xl p-5 shadow-xs border border-[#D8CBE8]/60 space-y-4">
              <div className="flex items-center justify-between border-b border-[#D8CBE8]/40 pb-3">
                <div>
                  <span className="text-[10px] text-[#5F5A64] uppercase font-bold">Tenant Dashboard</span>
                  <div className="text-sm font-bold text-[#5D4634]">Apex Horizons Tech Summit</div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#388E65]/15 text-[#388E65]">
                  Active Tenant
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#EDE7F6] rounded-xl border border-[#D8CBE8]/60">
                  <div className="text-[#5F5A64] text-[11px]">Gross Revenue</div>
                  <div className="text-base font-extrabold text-[#5D4634] mt-0.5">₹19,84,320</div>
                </div>
                <div className="p-3 bg-[#EDE7F6] rounded-xl border border-[#D8CBE8]/60">
                  <div className="text-[#5F5A64] text-[11px]">Hold Conversion</div>
                  <div className="text-base font-extrabold text-[#388E65] mt-0.5">84.2%</div>
                </div>
              </div>
              <div className="text-[11px] text-[#5F5A64] italic">
                * Real-time dashboard view available in one-click via top role selector.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
