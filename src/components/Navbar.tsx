import React, { useState } from 'react';
import { 
  Ticket, 
  Search, 
  Clock, 
  LayoutDashboard, 
  ShieldCheck, 
  User as UserIcon, 
  ChevronDown, 
  Sparkles,
  Zap,
  Menu,
  X
} from 'lucide-react';
import { useAuth, PREDEFINED_PERSONAS } from '../context/AuthContext.tsx';

interface NavbarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  onOpenHoldCheckout?: () => void;
  onOpenConcurrencyTester?: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  onOpenHoldCheckout,
  onOpenConcurrencyTester,
  searchQuery,
  setSearchQuery
}) => {
  const { user, switchPersona, activeHold } = useAuth();
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Calculate remaining hold time
  const [remainingSecs, setRemainingSecs] = useState<number>(0);

  React.useEffect(() => {
    if (!activeHold) {
      setRemainingSecs(0);
      return;
    }

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((new Date(activeHold.expiresAt).getTime() - Date.now()) / 1000));
      setRemainingSecs(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeHold]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#D8CBE8]/60 transition-all shadow-xs">
      {/* Top simulated mode announcement bar */}
      <div className="bg-[#EDE7F6] text-[#5D4634] text-xs py-1.5 px-4 font-medium flex items-center justify-between border-b border-[#D8CBE8]/40">
        <div className="flex items-center gap-2 mx-auto sm:mx-0">
          <span className="inline-block w-2 h-2 rounded-full bg-[#388E65] animate-pulse"></span>
          <span>
            <strong>Eventique Live:</strong> Multi-Tenant Ticketing Engine • 10-Minute Atomic Hold Active • INR (₹)
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <button
            onClick={onOpenConcurrencyTester}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white text-[#5D4634] text-[11px] font-semibold border border-[#D8CBE8] hover:border-[#C4A484] hover:bg-[#F5EFE7] transition shadow-xs"
          >
            <Zap className="w-3 h-3 text-[#D99A36]" />
            Test Atomic Concurrency Lock
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 gap-4">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => setCurrentView('home')}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EDE7F6] to-[#F5EFE7] border border-[#D8CBE8] flex items-center justify-center text-[#5D4634] shadow-xs group-hover:border-[#C4A484] transition">
                <Ticket className="w-5 h-5 text-[#5D4634]" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-[#5D4634]">Eventique</span>
                <span className="hidden sm:inline-block ml-1.5 text-[10px] font-semibold tracking-wider text-[#C4A484] uppercase bg-[#EDE7F6] px-1.5 py-0.5 rounded">
                  Reservations
                </span>
              </div>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <button
                onClick={() => setCurrentView('home')}
                className={`transition-colors ${currentView === 'home' ? 'text-[#5D4634] font-semibold' : 'text-[#5F5A64] hover:text-[#5D4634]'}`}
              >
                Home
              </button>
              <button
                onClick={() => setCurrentView('explore')}
                className={`transition-colors ${currentView === 'explore' ? 'text-[#5D4634] font-semibold' : 'text-[#5F5A64] hover:text-[#5D4634]'}`}
              >
                Explore Events
              </button>
              <button
                onClick={() => {
                  setCurrentView('explore');
                }}
                className="text-[#5F5A64] hover:text-[#5D4634] transition-colors"
              >
                Categories
              </button>
              {user.role === 'ATTENDEE' && (
                <button
                  onClick={() => setCurrentView('my-bookings')}
                  className={`transition-colors ${currentView === 'my-bookings' ? 'text-[#5D4634] font-semibold' : 'text-[#5F5A64] hover:text-[#5D4634]'}`}
                >
                  My Tickets
                </button>
              )}
            </nav>
          </div>

          {/* Search bar */}
          <div className="hidden lg:flex flex-1 max-w-xs xl:max-w-sm relative">
            <Search className="w-4 h-4 text-[#5F5A64] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Find your next experience..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (currentView !== 'explore') setCurrentView('explore');
              }}
              className="w-full bg-[#F5EFE7]/60 hover:bg-[#F5EFE7] focus:bg-white text-sm text-[#5D4634] placeholder-[#5F5A64]/70 pl-9 pr-4 py-2 rounded-xl border border-[#D8CBE8]/70 focus:border-[#C4A484] focus:outline-none transition-all shadow-inner/10"
            />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Active 10-Minute Hold Pill */}
            {activeHold && remainingSecs > 0 && (
              <button
                onClick={onOpenHoldCheckout}
                className="flex items-center gap-2 bg-[#F5EFE7] border border-[#D99A36]/50 hover:border-[#D99A36] text-[#5D4634] px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-xs animate-pulse-subtle transition"
                title="You have tickets reserved for 10 minutes. Click to complete checkout."
              >
                <Clock className="w-3.5 h-3.5 text-[#D99A36] animate-spin" style={{ animationDuration: '6s' }} />
                <span>Hold expires in:</span>
                <span className="font-mono text-[#D99A36] font-bold text-sm">{formatTimer(remainingSecs)}</span>
              </button>
            )}

            {/* Quick Portal Access */}
            {user.role === 'ORGANIZER' && (
              <button
                onClick={() => setCurrentView('organizer-dashboard')}
                className={`hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition border ${
                  currentView === 'organizer-dashboard'
                    ? 'bg-[#5D4634] text-white border-[#5D4634]'
                    : 'bg-[#EDE7F6] text-[#5D4634] border-[#D8CBE8] hover:bg-[#D8CBE8]/60'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Organizer Dashboard</span>
              </button>
            )}

            {user.role === 'ADMIN' && (
              <button
                onClick={() => setCurrentView('admin-dashboard')}
                className={`hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition border ${
                  currentView === 'admin-dashboard'
                    ? 'bg-[#5D4634] text-white border-[#5D4634]'
                    : 'bg-[#EDE7F6] text-[#5D4634] border-[#D8CBE8] hover:bg-[#D8CBE8]/60'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Admin Portal</span>
              </button>
            )}

            {/* Persona Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl border border-[#D8CBE8] hover:border-[#C4A484] bg-white transition shadow-xs text-left"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-7 h-7 rounded-lg object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-[#EDE7F6] text-[#5D4634] flex items-center justify-center font-bold text-xs">
                    {user.name.charAt(0)}
                  </div>
                )}
                <div className="hidden xl:block">
                  <div className="text-xs font-bold text-[#5D4634] leading-tight flex items-center gap-1">
                    {user.name.split(' ')[0]}
                    <span className="text-[10px] font-normal text-[#C4A484]">
                      ({user.role === 'ADMIN' ? 'Admin' : user.role === 'ORGANIZER' ? 'Organizer' : 'Attendee'})
                    </span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#5F5A64]" />
              </button>

              {/* Persona Dropdown Menu */}
              {showPersonaMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-[#D8CBE8] p-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-2 border-b border-[#D8CBE8]/60">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#C4A484]">
                      Role Persona Switcher
                    </p>
                    <p className="text-xs text-[#5F5A64] mt-0.5">
                      Switch instantly between platform user roles
                    </p>
                  </div>

                  <div className="py-1">
                    {PREDEFINED_PERSONAS.map((p) => {
                      const isSelected = p.id === user.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            switchPersona(p.id);
                            setShowPersonaMenu(false);
                            if (p.role === 'ORGANIZER') {
                              setCurrentView('organizer-dashboard');
                            } else if (p.role === 'ADMIN') {
                              setCurrentView('admin-dashboard');
                            } else {
                              setCurrentView('explore');
                            }
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                            isSelected ? 'bg-[#EDE7F6] text-[#5D4634] font-medium' : 'hover:bg-[#F5EFE7] text-[#5F5A64]'
                          }`}
                        >
                          {p.avatarUrl ? (
                            <img src={p.avatarUrl} alt={p.name} className="w-8 h-8 rounded-lg object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-[#EDE7F6] text-[#5D4634] flex items-center justify-center font-bold text-xs">
                              {p.name.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-[#5D4634] truncate">{p.name}</div>
                            <div className="text-[11px] text-[#5F5A64] truncate">{p.badge}</div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase ${
                            p.role === 'ADMIN' ? 'bg-[#5D4634] text-white' :
                            p.role === 'ORGANIZER' ? 'bg-[#C4A484] text-white' :
                            'bg-[#D8CBE8] text-[#5D4634]'
                          }`}>
                            {p.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-[#5D4634] hover:bg-[#F5EFE7]"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#D8CBE8] bg-white px-4 pt-3 pb-5 space-y-3">
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F5EFE7] text-sm text-[#5D4634] px-4 py-2.5 rounded-xl border border-[#D8CBE8]"
          />
          <div className="flex flex-col gap-1">
            <button
              onClick={() => { setCurrentView('home'); setMobileMenuOpen(false); }}
              className="text-left px-3 py-2 rounded-lg text-sm font-medium text-[#5D4634] hover:bg-[#EDE7F6]"
            >
              Home
            </button>
            <button
              onClick={() => { setCurrentView('explore'); setMobileMenuOpen(false); }}
              className="text-left px-3 py-2 rounded-lg text-sm font-medium text-[#5D4634] hover:bg-[#EDE7F6]"
            >
              Explore Events
            </button>
            {user.role === 'ORGANIZER' && (
              <button
                onClick={() => { setCurrentView('organizer-dashboard'); setMobileMenuOpen(false); }}
                className="text-left px-3 py-2 rounded-lg text-sm font-medium text-[#5D4634] hover:bg-[#EDE7F6]"
              >
                Organizer Dashboard
              </button>
            )}
            {user.role === 'ADMIN' && (
              <button
                onClick={() => { setCurrentView('admin-dashboard'); setMobileMenuOpen(false); }}
                className="text-left px-3 py-2 rounded-lg text-sm font-medium text-[#5D4634] hover:bg-[#EDE7F6]"
              >
                Admin Dashboard
              </button>
            )}
            {user.role === 'ATTENDEE' && (
              <button
                onClick={() => { setCurrentView('my-bookings'); setMobileMenuOpen(false); }}
                className="text-left px-3 py-2 rounded-lg text-sm font-medium text-[#5D4634] hover:bg-[#EDE7F6]"
              >
                My Bookings & Tickets
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
