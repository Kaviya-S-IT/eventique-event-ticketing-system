import React from 'react';
import { 
  X, 
  CheckCircle2, 
  Ticket, 
  Calendar, 
  MapPin, 
  Download, 
  Printer, 
  Share2, 
  ShieldCheck,
  QrCode
} from 'lucide-react';
import { Booking } from '../types/index.ts';

interface TicketPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onViewMyBookings: () => void;
}

export const TicketPassModal: React.FC<TicketPassModalProps> = ({
  isOpen,
  onClose,
  booking,
  onViewMyBookings
}) => {
  if (!isOpen || !booking) return null;

  const eventDate = new Date(booking.eventDate).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl border border-[#D8CBE8] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#EDE7F6] to-[#F5EFE7] p-6 border-b border-[#D8CBE8] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#388E65] text-white flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#5D4634]">Booking Confirmed!</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#388E65]/15 text-[#388E65] px-2 py-0.5 rounded-full">
                  Confirmed
                </span>
              </div>
              <p className="text-xs text-[#5F5A64]">
                Booking Reference: <span className="font-mono font-bold text-[#5D4634]">{booking.bookingReference}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/80 text-[#5F5A64] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Main Digital Ticket Pass (Boarding Pass Style) */}
          <div className="bg-[#F5EFE7] rounded-3xl border-2 border-dashed border-[#D8CBE8] overflow-hidden shadow-xs">
            <div className="p-6 bg-white border-b border-[#D8CBE8]/70">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#C4A484] tracking-wider">
                    Official Event Pass
                  </span>
                  <h4 className="text-lg font-bold text-[#5D4634] mt-1 leading-snug">
                    {booking.eventTitle}
                  </h4>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-[#5F5A64]">Total Paid</div>
                  <div className="text-base font-extrabold text-[#5D4634]">
                    ₹{booking.totalAmount.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 text-xs">
                <div>
                  <span className="text-[#5F5A64] block text-[11px]">Event Date</span>
                  <span className="font-bold text-[#5D4634] flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-[#C4A484]" />
                    {eventDate}
                  </span>
                </div>
                <div>
                  <span className="text-[#5F5A64] block text-[11px]">Attendee</span>
                  <span className="font-bold text-[#5D4634] mt-0.5 block truncate">
                    {booking.attendeeName}
                  </span>
                </div>
                <div>
                  <span className="text-[#5F5A64] block text-[11px]">Venue</span>
                  <span className="font-bold text-[#5D4634] flex items-center gap-1 mt-0.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-[#C4A484] shrink-0" />
                    {booking.eventVenue}
                  </span>
                </div>
              </div>
            </div>

            {/* Issued Individual Ticket Barcodes / QR List */}
            <div className="p-5 space-y-3 bg-[#EDE7F6]/40">
              <div className="text-xs font-bold text-[#5D4634] uppercase tracking-wider">
                Issued Admission Passes ({booking.issuedTickets.length})
              </div>

              <div className="space-y-3">
                {booking.issuedTickets.map((tkt, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-white rounded-2xl border border-[#D8CBE8] flex items-center justify-between gap-4 shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#EDE7F6] text-[#5D4634] text-[10px] font-bold">
                          {tkt.tierName}
                        </span>
                        {tkt.seatInfo && (
                          <span className="text-[11px] font-medium text-[#5F5A64]">
                            Seat: {tkt.seatInfo}
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-xs font-bold text-[#5D4634]">
                        {tkt.ticketNumber}
                      </div>
                      <div className="text-[11px] text-[#5F5A64]">
                        Holder: {tkt.attendeeName}
                      </div>
                    </div>

                    {/* QR Code Graphic Mockup */}
                    <div className="w-16 h-16 bg-[#F5EFE7] border border-[#D8CBE8] rounded-xl flex flex-col items-center justify-center p-1.5 shrink-0">
                      <QrCode className="w-10 h-10 text-[#5D4634]" />
                      <span className="text-[8px] font-mono text-[#5F5A64]">SCAN GATE</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#EDE7F6] p-4 rounded-2xl border border-[#D8CBE8] text-xs text-[#5D4634] flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-[#388E65] shrink-0" />
            <p>
              A confirmation email with PDF passes and scannable Apple Wallet / Google Wallet passlinks was dispatched to <strong>{booking.attendeeEmail}</strong>.
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-5 bg-[#F5EFE7] border-t border-[#D8CBE8] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={() => {
              onClose();
              onViewMyBookings();
            }}
            className="text-xs font-bold text-[#5D4634] hover:text-[#C4A484] transition"
          >
            View in My Bookings & Tickets →
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => window.print()}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#D8CBE8] text-xs font-bold text-[#5D4634] hover:bg-[#EDE7F6] transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Pass</span>
            </button>
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 py-2 rounded-xl bg-[#C4A484] hover:bg-[#b09172] text-white text-xs font-bold shadow-xs transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
