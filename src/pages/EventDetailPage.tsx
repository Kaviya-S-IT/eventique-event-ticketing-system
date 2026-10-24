import React, { useState } from 'react';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Ticket, 
  AlertCircle, 
  Plus, 
  Minus, 
  Lock, 
  ArrowLeft,
  Share2,
  Heart,
  Info,
  CheckCircle2
} from 'lucide-react';
import { Event, TicketTier } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';

interface EventDetailPageProps {
  event: Event;
  onBack: () => void;
  onHoldCreated: (reservation: any) => void;
}

export const EventDetailPage: React.FC<EventDetailPageProps> = ({
  event,
  onBack,
  onHoldCreated
}) => {
  const { token, user, setActiveHold } = useAuth();
  const { showToast } = useToast();

  // Tier quantity selection state: map tierId -> quantity
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [isSubmittingHold, setIsSubmittingHold] = useState(false);

  const eventDate = new Date(event.startDate).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const salesCutoffDate = new Date(event.salesCutoff).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const handleQuantityChange = (tier: TicketTier, delta: number) => {
    const current = selectedQuantities[tier.id] || 0;
    const next = Math.max(0, current + delta);

    const available = tier.totalQuantity - tier.soldQuantity - tier.reservedQuantity;
    if (next > tier.maxPerAttendee) {
      showToast('Limit Reached', 'info', `Maximum ${tier.maxPerAttendee} tickets allowed per attendee for ${tier.name}.`);
      return;
    }
    if (next > available) {
      showToast('Inventory Limit', 'warning', `Only ${available} tickets currently available for ${tier.name}.`);
      return;
    }

    setSelectedQuantities(prev => ({
      ...prev,
      [tier.id]: next
    }));
  };

  // Calculate totals
  let totalSelectedTickets = 0;
  let subtotalAmount = 0;
  const holdItems: { ticketTierId: string; quantity: number }[] = [];

  for (const tier of event.ticketTiers) {
    const qty = selectedQuantities[tier.id] || 0;
    if (qty > 0) {
      totalSelectedTickets += qty;
      subtotalAmount += tier.price * qty;
      holdItems.push({ ticketTierId: tier.id, quantity: qty });
    }
  }

  const estimatedServiceFee = Math.round(subtotalAmount * 0.035);
  const totalAmount = subtotalAmount + estimatedServiceFee;

  // Trigger 10-Minute Hold Reservation
  const handleReserveTickets = async () => {
    if (totalSelectedTickets === 0) {
      showToast('No Tickets Selected', 'warning', 'Please select at least 1 ticket to hold.');
      return;
    }

    setIsSubmittingHold(true);
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          eventId: event.id,
          attendeeName: user.name,
          attendeeEmail: user.email,
          items: holdItems
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showToast('Reservation Error', 'error', data.error || 'Failed to reserve ticket hold.');
        return;
      }

      showToast('10-Minute Hold Active!', 'success', 'Your tickets are held. Please complete checkout before timer expires.');
      setActiveHold(data.reservation);
      onHoldCreated(data.reservation);
    } catch (err: any) {
      showToast('Network Error', 'error', err.message);
    } finally {
      setIsSubmittingHold(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-bold text-[#5D4634] hover:text-[#C4A484] transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to events</span>
      </button>

      {/* Hero Banner Header */}
      <div className="relative rounded-3xl overflow-hidden aspect-[21/9] sm:aspect-[24/9] bg-[#EDE7F6] border border-[#D8CBE8] shadow-md">
        <img
          src={event.bannerImage}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        
        <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white text-[#5D4634] shadow-xs">
              {event.category}
            </span>
            {event.featured && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#C4A484] text-white">
                Featured Experience
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            {event.title}
          </h1>
        </div>
      </div>

      {/* Main Grid: Left Details & Right Reservation Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column (8 cols): Description, Venue, Organizer */}
        <div className="lg:col-span-7 space-y-8">
          {/* Key Event Badges Bar */}
          <div className="bg-[#F5EFE7] rounded-2xl p-5 border border-[#D8CBE8]/70 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-[#C4A484] shrink-0 mt-0.5" />
              <div>
                <span className="text-[#5F5A64] block font-semibold">Date & Time</span>
                <span className="font-bold text-[#5D4634] text-sm block mt-0.5">
                  {eventDate}
                </span>
                <span className="text-[#5F5A64]">{event.startTime} - {event.endTime}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#C4A484] shrink-0 mt-0.5" />
              <div>
                <span className="text-[#5F5A64] block font-semibold">Venue</span>
                <span className="font-bold text-[#5D4634] text-sm block mt-0.5">
                  {event.venue.name}
                </span>
                <span className="text-[#5F5A64]">{event.venue.address}, {event.venue.city}</span>
              </div>
            </div>
          </div>

          {/* Organizer Info */}
          <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#D8CBE8]">
            <div className="flex items-center gap-3">
              {event.organizerLogo ? (
                <img src={event.organizerLogo} alt={event.organizerName} className="w-11 h-11 rounded-xl object-cover border border-[#D8CBE8]" />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-[#EDE7F6] text-[#5D4634] flex items-center justify-center font-bold text-base">
                  {event.organizerName.charAt(0)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-[#5D4634]">{event.organizerName}</span>
                  {event.organizerVerified && (
                    <span title="Verified Organizer Tenant">
                      <ShieldCheck className="w-4 h-4 text-[#388E65]" />
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[#5F5A64]">Event Organizer & Host</span>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-[#5D4634] bg-[#EDE7F6] px-3 py-1 rounded-full">
              Tenant ID: {event.tenantId}
            </span>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-[#5D4634]">About the Event</h3>
            <p className="text-sm text-[#5F5A64] leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>

          {/* Venue & Accessibility Details */}
          <div className="space-y-3 pt-4 border-t border-[#D8CBE8]/60">
            <h3 className="text-lg font-bold text-[#5D4634]">Venue & Accessibility</h3>
            <div className="bg-white p-5 rounded-2xl border border-[#D8CBE8] space-y-2 text-xs text-[#5F5A64]">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#C4A484] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[#5D4634]">{event.venue.name}</span>
                  <p>{event.venue.address}, {event.venue.city}, {event.venue.state} {event.venue.postalCode || ''}</p>
                </div>
              </div>
              {event.venue.accessibilityDetails && (
                <div className="flex items-start gap-2 pt-2 border-t border-[#D8CBE8]/40">
                  <Info className="w-4 h-4 text-[#388E65] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#5D4634]">Accessibility Notes:</span>
                    <p className="mt-0.5">{event.venue.accessibilityDetails}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Policies & Sales Cutoff */}
          <div className="space-y-3 pt-4 border-t border-[#D8CBE8]/60">
            <h3 className="text-lg font-bold text-[#5D4634]">Event Policies</h3>
            <div className="bg-[#F5EFE7]/80 p-5 rounded-2xl border border-[#D8CBE8]/80 space-y-3 text-xs text-[#5F5A64]">
              <div>
                <span className="font-bold text-[#5D4634]">Ticket Sales Cutoff:</span>
                <p className="mt-0.5">{salesCutoffDate}</p>
              </div>
              <div>
                <span className="font-bold text-[#5D4634]">Refund & Cancellation Policy:</span>
                <p className="mt-0.5">{event.refundPolicy}</p>
              </div>
              <div>
                <span className="font-bold text-[#5D4634]">Admission Terms:</span>
                <p className="mt-0.5">{event.terms}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Interactive Ticket Tiers Selection & 10-Minute Hold Trigger */}
        <div className="lg:col-span-5 sticky top-24 space-y-6">
          <div className="bg-white rounded-3xl p-6 border-2 border-[#D8CBE8] shadow-lg space-y-6">
            <div className="flex items-center justify-between border-b border-[#D8CBE8]/60 pb-4">
              <div>
                <h3 className="text-base font-bold text-[#5D4634]">Select Ticket Tiers</h3>
                <span className="text-[11px] text-[#5F5A64]">Prices in Indian Rupee (₹)</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#388E65] bg-[#388E65]/10 px-2.5 py-1 rounded-full">
                <Lock className="w-3 h-3" />
                <span>10-Min Hold</span>
              </div>
            </div>

            {/* List of Ticket Tiers */}
            <div className="space-y-4">
              {event.ticketTiers.map((tier) => {
                const available = Math.max(0, tier.totalQuantity - tier.soldQuantity - tier.reservedQuantity);
                const isSoldOut = available <= 0 || tier.status === 'SOLD_OUT';
                const qty = selectedQuantities[tier.id] || 0;

                return (
                  <div
                    key={tier.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      qty > 0
                        ? 'border-[#C4A484] bg-[#EDE7F6]/40 shadow-xs'
                        : isSoldOut
                        ? 'border-[#D8CBE8]/40 bg-gray-50 opacity-60'
                        : 'border-[#D8CBE8] bg-white hover:border-[#C4A484]/70'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[#5D4634]">{tier.name}</h4>
                          {isSoldOut ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#C94C4C] text-white">
                              Sold Out
                            </span>
                          ) : available <= 5 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#D99A36] text-white">
                              Only {available} left!
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-[#5F5A64] mt-1 line-clamp-2">
                          {tier.description}
                        </p>
                      </div>

                      <div className="text-right shrink-0 ml-3">
                        <div className="text-base font-extrabold text-[#5D4634]">
                          ₹{tier.price.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-[#5F5A64]">per ticket</div>
                      </div>
                    </div>

                    {/* Quantity Selector */}
                    {!isSoldOut && (
                      <div className="mt-4 pt-3 border-t border-[#D8CBE8]/50 flex items-center justify-between">
                        <span className="text-[11px] text-[#5F5A64]">
                          Max {tier.maxPerAttendee} / attendee • <strong>{available}</strong> available
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(tier, -1)}
                            disabled={qty === 0}
                            className="w-7 h-7 rounded-lg border border-[#D8CBE8] bg-white flex items-center justify-center text-[#5D4634] hover:bg-[#EDE7F6] disabled:opacity-30 disabled:pointer-events-none transition"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center font-bold text-xs text-[#5D4634]">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(tier, 1)}
                            disabled={qty >= tier.maxPerAttendee || qty >= available}
                            className="w-7 h-7 rounded-lg border border-[#D8CBE8] bg-white flex items-center justify-center text-[#5D4634] hover:bg-[#EDE7F6] disabled:opacity-30 disabled:pointer-events-none transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Price Calculation Card */}
            {totalSelectedTickets > 0 && (
              <div className="p-4 bg-[#F5EFE7] rounded-2xl border border-[#D8CBE8] space-y-2 text-xs">
                <div className="flex justify-between text-[#5F5A64]">
                  <span>Tickets Subtotal ({totalSelectedTickets})</span>
                  <span>₹{subtotalAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-[#5F5A64]">
                  <span>Est. Platform Service Fee (3.5%)</span>
                  <span>₹{estimatedServiceFee.toLocaleString('en-IN')}</span>
                </div>
                <div className="pt-2 border-t border-[#D8CBE8] flex justify-between font-bold text-sm text-[#5D4634]">
                  <span>Estimated Total</span>
                  <span className="text-base text-[#5D4634]">₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}

            {/* Reserve Tickets Button */}
            <button
              onClick={handleReserveTickets}
              disabled={totalSelectedTickets === 0 || isSubmittingHold}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-[#C4A484] hover:bg-[#b09172] text-white font-bold text-sm shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed group"
            >
              <Lock className="w-4 h-4" />
              <span>
                {isSubmittingHold 
                  ? 'Locking 10-Minute Hold...' 
                  : totalSelectedTickets === 0 
                  ? 'Select Tickets to Reserve' 
                  : `Reserve ${totalSelectedTickets} Ticket(s) (10-Min Hold)`}
              </span>
            </button>

            <div className="text-center text-[11px] text-[#5F5A64] space-y-1">
              <p className="flex items-center justify-center gap-1">
                <Clock className="w-3 h-3 text-[#D99A36]" />
                <span>Seats are guaranteed and held for 10 minutes upon click.</span>
              </p>
              <p className="text-[10px] text-[#5F5A64]/80">
                PostgreSQL transactional locks guarantee zero double-booking.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
