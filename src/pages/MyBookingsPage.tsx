import React, { useState, useEffect } from 'react';
import { 
  Ticket, 
  Calendar, 
  MapPin, 
  Clock, 
  QrCode, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { Booking, Reservation } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';

interface MyBookingsPageProps {
  onSelectBooking: (booking: Booking) => void;
  onResumeHold: (hold: Reservation) => void;
  onExploreEvents: () => void;
}

export const MyBookingsPage: React.FC<MyBookingsPageProps> = ({
  onSelectBooking,
  onResumeHold,
  onExploreEvents
}) => {
  const { token, user } = useAuth();
  const { showToast } = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeHolds, setActiveHolds] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyBookings();
  }, [user.id]);

  const fetchMyBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/bookings/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
        setActiveHolds(data.activeHolds || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking? Tickets will be returned to public inventory.')) {
      return;
    }

    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('Cancellation Failed', 'error', data.error || 'Could not cancel booking.');
        return;
      }
      showToast('Booking Cancelled', 'info', 'Your booking was cancelled and inventory released.');
      fetchMyBookings();
    } catch (err: any) {
      showToast('Error', 'error', err.message);
    }
  };

  const handleCancelHold = async (reservationId: string) => {
    try {
      const res = await fetch(`/api/reservations/${reservationId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Hold Released', 'info', 'Reserved seats were returned to inventory.');
        fetchMyBookings();
      }
    } catch (err: any) {
      showToast('Error', 'error', err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D8CBE8]/60 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-[#5D4634]">My Tickets & Bookings</h1>
          <p className="text-xs text-[#5F5A64] mt-1">
            Access your admission passes, scannable QR codes, and active ticket holds.
          </p>
        </div>
        <button
          onClick={fetchMyBookings}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EDE7F6] border border-[#D8CBE8] text-xs font-semibold text-[#5D4634] hover:bg-[#D8CBE8]/60 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Active 10-Minute Holds Section */}
      {activeHolds.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D99A36] animate-pulse"></span>
            <h2 className="text-base font-bold text-[#5D4634]">
              Active 10-Minute Ticket Holds ({activeHolds.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeHolds.map((hold) => {
              const diffSecs = Math.max(0, Math.floor((new Date(hold.expiresAt).getTime() - Date.now()) / 1000));
              const mins = Math.floor(diffSecs / 60);
              const secs = diffSecs % 60;
              const formattedTime = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

              return (
                <div
                  key={hold.id}
                  className="bg-[#F5EFE7] rounded-2xl p-5 border-2 border-[#D99A36]/50 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-mono font-bold text-[#5D4634]">{hold.id}</span>
                      <div className="flex items-center gap-1 bg-[#D99A36]/15 text-[#D99A36] px-2.5 py-0.5 rounded-full font-mono font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Expires: {formattedTime}</span>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-[#5D4634]">{hold.eventTitle}</h3>
                    
                    <div className="mt-2 space-y-1 text-xs text-[#5F5A64]">
                      {hold.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>{it.tierName} × {it.quantity}</span>
                          <span className="font-bold text-[#5D4634]">₹{it.subtotal.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-[#D8CBE8] flex justify-between font-bold text-[#5D4634]">
                        <span>Total with fees</span>
                        <span>₹{hold.totalAmount.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#D8CBE8] flex items-center justify-between">
                    <button
                      onClick={() => handleCancelHold(hold.id)}
                      className="text-xs text-[#5F5A64] hover:text-[#C94C4C] transition"
                    >
                      Release hold
                    </button>
                    <button
                      onClick={() => onResumeHold(hold)}
                      className="px-5 py-2 rounded-xl bg-[#C4A484] hover:bg-[#b09172] text-white text-xs font-bold shadow-xs transition"
                    >
                      Complete Checkout →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Confirmed Bookings Section */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-[#5D4634]">Confirmed Passes & History</h2>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-44 bg-[#EDE7F6]/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-[#D8CBE8] space-y-4">
            <Ticket className="w-12 h-12 text-[#C4A484] mx-auto opacity-70" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#5D4634]">No ticket bookings yet</h3>
              <p className="text-xs text-[#5F5A64]">
                Explore events, reserve tickets under a 10-minute hold, and complete simulated checkout.
              </p>
            </div>
            <button
              onClick={onExploreEvents}
              className="px-6 py-2.5 rounded-xl bg-[#C4A484] text-white text-xs font-bold hover:bg-[#b09172] transition shadow-xs"
            >
              Explore Experiences
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const isConfirmed = booking.status === 'CONFIRMED';
              const eventDate = new Date(booking.eventDate).toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              });

              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-3xl border border-[#D8CBE8] shadow-xs overflow-hidden transition hover:border-[#C4A484]"
                >
                  <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Event & Booking details */}
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#5D4634] bg-[#EDE7F6] px-2.5 py-0.5 rounded-md">
                          {booking.bookingReference}
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          isConfirmed ? 'bg-[#388E65]/15 text-[#388E65]' : 'bg-[#C94C4C]/15 text-[#C94C4C]'
                        }`}>
                          {booking.status}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-[#5D4634]">{booking.eventTitle}</h3>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-[#5F5A64]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#C4A484]" />
                          {eventDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#C4A484]" />
                          {booking.eventVenue}
                        </span>
                        <span className="font-semibold text-[#5D4634]">
                          {booking.totalQuantity} ticket(s) • ₹{booking.totalAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      {isConfirmed && (
                        <button
                          onClick={() => onSelectBooking(booking)}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#EDE7F6] hover:bg-[#D8CBE8] text-[#5D4634] text-xs font-bold border border-[#D8CBE8] transition"
                        >
                          <QrCode className="w-4 h-4 text-[#5D4634]" />
                          <span>View QR Passes ({booking.issuedTickets.length})</span>
                        </button>
                      )}

                      {isConfirmed && (
                        <button
                          onClick={() => handleCancelBooking(booking.id)}
                          className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#C94C4C]/10 text-[#5F5A64] hover:text-[#C94C4C] text-xs font-semibold border border-[#D8CBE8] transition"
                        >
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
