import React from 'react';
import { Calendar, MapPin, Ticket, ShieldCheck, ArrowRight } from 'lucide-react';
import { Event } from '../types/index.ts';

interface EventCardProps {
  event: Event;
  onSelect: (event: Event) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onSelect }) => {
  // Lowest ticket price calculation
  const lowestPrice = Math.min(...event.ticketTiers.map((t) => t.price));
  
  // Total seats left across tiers
  const remainingSeats = event.ticketTiers.reduce((acc, t) => {
    return acc + Math.max(0, t.totalQuantity - t.soldQuantity - t.reservedQuantity);
  }, 0);

  // Formatted date string
  const eventDate = new Date(event.startDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div 
      onClick={() => onSelect(event)}
      className="group bg-white rounded-2xl border border-[#D8CBE8]/70 hover:border-[#C4A484] shadow-xs hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden cursor-pointer"
    >
      {/* Banner Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-[#EDE7F6]">
        <img
          src={event.bannerImage}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
        
        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/95 text-[#5D4634] backdrop-blur-md shadow-xs">
            {event.category}
          </span>
        </div>

        {/* Urgency Badge */}
        {remainingSeats <= 25 && remainingSeats > 0 && (
          <div className="absolute top-3 right-3">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D99A36] text-white shadow-xs">
              Only {remainingSeats} seats left!
            </span>
          </div>
        )}

        {/* Price Tag Overlay */}
        <div className="absolute bottom-3 left-3 text-white">
          <div className="text-[11px] font-medium text-white/80">From</div>
          <div className="text-lg font-bold">
            ₹{lowestPrice.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Organizer Verification */}
        {event.organizerVerified && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] font-medium text-[#5D4634]">
            <ShieldCheck className="w-3 h-3 text-[#388E65]" />
            <span>Verified Host</span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#5F5A64] mb-2 font-medium">
            <Calendar className="w-3.5 h-3.5 text-[#C4A484]" />
            <span>{eventDate} • {event.startTime}</span>
          </div>

          <h3 className="text-base font-bold text-[#5D4634] line-clamp-2 group-hover:text-[#C4A484] transition-colors leading-snug">
            {event.title}
          </h3>

          <div className="flex items-center gap-1.5 text-xs text-[#5F5A64] mt-2 font-medium">
            <MapPin className="w-3.5 h-3.5 text-[#C4A484] shrink-0" />
            <span className="truncate">{event.venue.name}, {event.venue.city}</span>
          </div>
        </div>

        {/* Action bar */}
        <div className="pt-4 mt-4 border-t border-[#D8CBE8]/50 flex items-center justify-between">
          <div className="text-[11px] text-[#5F5A64]">
            <span className="font-semibold text-[#5D4634]">{event.ticketTiers.length}</span> ticket tiers
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-[#5D4634] group-hover:text-[#C4A484] transition-colors">
            <span>View Details</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};
