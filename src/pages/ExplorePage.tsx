import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  SlidersHorizontal, 
  X, 
  ArrowUpDown, 
  Ticket, 
  Calendar,
  RotateCcw
} from 'lucide-react';
import { Event, EventCategory } from '../types/index.ts';
import { EventCard } from '../components/EventCard.tsx';

interface ExplorePageProps {
  onSelectEvent: (event: Event) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

const CATEGORIES = [
  'All',
  'Concerts',
  'Technology Conferences',
  'Workshops',
  'Art Exhibitions',
  'Festivals',
  'Networking Events'
];

export const ExplorePage: React.FC<ExplorePageProps> = ({
  onSelectEvent,
  searchQuery,
  setSearchQuery
}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [maxPrice, setMaxPrice] = useState<number>(10000);
  const [sortOption, setSortOption] = useState<string>('date');
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  useEffect(() => {
    fetchFilteredEvents();
  }, [selectedCategory, maxPrice, sortOption, searchQuery]);

  const fetchFilteredEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'All') params.append('category', selectedCategory);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (maxPrice < 10000) params.append('maxPrice', maxPrice.toString());
      if (sortOption) params.append('sort', sortOption);

      const res = await fetch(`/api/events?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        let list: Event[] = data.events || [];
        
        // Client-side city filter if specified
        if (selectedCity !== 'All') {
          list = list.filter(e => e.venue.city.toLowerCase() === selectedCity.toLowerCase());
        }

        setEvents(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSelectedCategory('All');
    setSelectedCity('All');
    setMaxPrice(10000);
    setSortOption('date');
    setSearchQuery('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#D8CBE8]/60 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-[#5D4634]">Explore Experiences</h1>
          <p className="text-xs text-[#5F5A64] mt-1">
            Discover curated live concerts, technical summits, and creative masterclasses.
          </p>
        </div>

        {/* Mobile filter toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFiltersMobile(!showFiltersMobile)}
            className="md:hidden flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EDE7F6] border border-[#D8CBE8] text-xs font-bold text-[#5D4634]"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#C4A484]" />
            <span>Filters</span>
          </button>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 bg-[#F5EFE7] px-3 py-1.5 rounded-xl border border-[#D8CBE8]/70 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#5D4634]" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="bg-transparent text-xs font-semibold text-[#5D4634] focus:outline-none cursor-pointer"
            >
              <option value="date">Sort by: Date (Upcoming)</option>
              <option value="popular">Sort by: Popularity</option>
              <option value="price-asc">Sort by: Price (Low to High)</option>
              <option value="price-desc">Sort by: Price (High to Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Filters Sidebar + Event Results */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Filters Sidebar */}
        <aside className={`md:col-span-3 space-y-6 ${showFiltersMobile ? 'block' : 'hidden md:block'}`}>
          <div className="bg-[#F5EFE7]/80 rounded-2xl p-5 border border-[#D8CBE8]/80 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5D4634] flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#C4A484]" />
                Filters
              </span>
              <button
                onClick={resetFilters}
                className="text-[11px] font-semibold text-[#5F5A64] hover:text-[#5D4634] flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>

            {/* Search Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#5D4634]">Search Keyword</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#5F5A64] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Title, artist, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white text-xs text-[#5D4634] pl-8 pr-3 py-2 rounded-xl border border-[#D8CBE8] focus:outline-none focus:border-[#C4A484]"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#5D4634]">Category</label>
              <div className="space-y-1">
                {CATEGORIES.map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        active 
                          ? 'bg-[#EDE7F6] text-[#5D4634] font-bold border border-[#D8CBE8]' 
                          : 'text-[#5F5A64] hover:bg-white hover:text-[#5D4634]'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* City Filter */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#5D4634]">Location</label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full bg-white text-xs text-[#5D4634] px-3 py-2 rounded-xl border border-[#D8CBE8] focus:outline-none"
              >
                <option value="All">All Cities</option>
                <option value="Bengaluru">Bengaluru</option>
                <option value="Chikkaballapur">Chikkaballapur (Nandi Hills)</option>
              </select>
            </div>

            {/* Price Range Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-[#5D4634]">Max Ticket Price</label>
                <span className="font-mono font-bold text-[#5D4634]">₹{maxPrice.toLocaleString('en-IN')}</span>
              </div>
              <input
                type="range"
                min="500"
                max="10000"
                step="500"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-[#C4A484] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#5F5A64]">
                <span>₹500</span>
                <span>₹10,000+</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Event Cards Grid */}
        <main className="md:col-span-9 space-y-6">
          <div className="flex items-center justify-between text-xs text-[#5F5A64]">
            <span>Showing <strong>{events.length}</strong> available experiences</span>
            {selectedCategory !== 'All' && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#EDE7F6] text-[#5D4634] font-semibold">
                Filter: {selectedCategory}
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-80 bg-[#EDE7F6]/50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-[#D8CBE8] p-8 space-y-3">
              <Ticket className="w-12 h-12 text-[#C4A484] mx-auto opacity-70" />
              <h3 className="text-base font-bold text-[#5D4634]">No matching events found</h3>
              <p className="text-xs text-[#5F5A64] max-w-sm mx-auto">
                No events matched your search or price criteria. Try adjusting your filters.
              </p>
              <button
                onClick={resetFilters}
                className="px-4 py-2 rounded-xl bg-[#EDE7F6] text-xs font-bold text-[#5D4634] hover:bg-[#D8CBE8] transition"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((evt) => (
                <EventCard key={evt.id} event={evt} onSelect={onSelectEvent} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
