import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  ShieldCheck, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  HelpCircle,
  QrCode,
  Lock,
  ArrowRight
} from 'lucide-react';
import { Reservation, Booking } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import confetti from 'canvas-confetti';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation | null;
  onBookingConfirmed: (booking: Booking) => void;
  onHoldReleased: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  reservation,
  onBookingConfirmed,
  onHoldReleased
}) => {
  const { token, user, setActiveHold } = useAuth();
  const { showToast } = useToast();

  const [remainingSecs, setRemainingSecs] = useState<number>(600);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'NET_BANKING'>('UPI');
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [deterministicOutcome, setDeterministicOutcome] = useState<'SUCCESS' | 'FAILED'>('SUCCESS');

  // Contact form
  const [contactName, setContactName] = useState(reservation?.attendeeName || user.name);
  const [contactEmail, setContactEmail] = useState(reservation?.attendeeEmail || user.email);
  const [contactPhone, setContactPhone] = useState('+91 98450 99882');

  // Sync contact details if reservation changes
  useEffect(() => {
    if (reservation) {
      setContactName(reservation.attendeeName || user.name);
      setContactEmail(reservation.attendeeEmail || user.email);
    }
  }, [reservation, user]);

  // Live 10-Minute Countdown Timer
  useEffect(() => {
    if (!isOpen || !reservation) return;

    const calculateTime = () => {
      const now = Date.now();
      const expires = new Date(reservation.expiresAt).getTime();
      const diff = Math.max(0, Math.floor((expires - now) / 1000));
      setRemainingSecs(diff);

      if (diff <= 0) {
        showToast('Reservation Hold Expired', 'warning', 'Your 10-minute hold window elapsed. Inventory has been released.');
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [isOpen, reservation]);

  if (!isOpen || !reservation) return null;

  const isExpired = remainingSecs <= 0;

  // Format seconds to MM:SS
  const mins = Math.floor(remainingSecs / 60);
  const secs = remainingSecs % 60;
  const timerDisplay = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  // Execute Simulated Payment
  const handlePayment = async (overrideOutcome?: 'SUCCESS' | 'FAILED') => {
    if (isExpired) {
      showToast('Hold Expired', 'error', 'Cannot complete payment on an expired hold.');
      return;
    }

    if (!agreedTerms) {
      showToast('Terms Required', 'warning', 'Please accept the event terms and conditions.');
      return;
    }

    const outcomeToUse = overrideOutcome || deterministicOutcome;
    setIsProcessing(true);

    try {
      // 1. Initiate
      await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          reservationId: reservation.id,
          paymentMethod
        })
      });

      // 2. Simulated asynchronous callback with latency
      const callbackRes = await fetch('/api/payments/mock-callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          reservationId: reservation.id,
          paymentMethod,
          deterministicOutcome: outcomeToUse,
          simulatedDelayMs: 1200
        })
      });

      const data = await callbackRes.json();

      if (!data.success) {
        showToast('Payment Declined', 'error', data.error || 'Simulated bank gateway decline. Inventory released.');
        setActiveHold(null);
        onHoldReleased();
        return;
      }

      // Successful Booking!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });

      showToast('Booking Confirmed!', 'success', `Reference: ${data.booking.bookingReference}`);
      setActiveHold(null);
      onBookingConfirmed(data.booking);
      onClose();
    } catch (err: any) {
      showToast('Payment Processing Error', 'error', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Cancel hold early
  const handleReleaseHold = async () => {
    try {
      await fetch(`/api/reservations/${reservation.id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Hold Released', 'info', 'Your tickets were safely released back into inventory.');
      setActiveHold(null);
      onHoldReleased();
      onClose();
    } catch (err: any) {
      showToast('Error', 'error', err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl border border-[#D8CBE8] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header with Urgency Countdown */}
        <div className={`p-5 border-b border-[#D8CBE8] flex items-center justify-between ${
          isExpired ? 'bg-[#C94C4C]/10' : remainingSecs <= 120 ? 'bg-[#D99A36]/15' : 'bg-[#EDE7F6]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs border ${
              isExpired 
                ? 'bg-white text-[#C94C4C] border-[#C94C4C]/40' 
                : 'bg-white text-[#5D4634] border-[#D8CBE8]'
            }`}>
              <Clock className={`w-5 h-5 ${!isExpired ? 'text-[#D99A36]' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#5D4634]">10-Minute Ticket Reservation Hold</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/80 px-2 py-0.5 rounded-full border border-[#D8CBE8]">
                  Atomic Hold
                </span>
              </div>
              <p className="text-xs text-[#5F5A64]">
                {isExpired ? 'Your hold expired. Please re-select tickets.' : 'Seats reserved exclusively for you. Complete payment before the timer reaches 0.'}
              </p>
            </div>
          </div>

          {/* Countdown Pill */}
          <div className="text-right">
            <div className={`font-mono text-xl font-extrabold ${
              isExpired ? 'text-[#C94C4C]' : remainingSecs <= 120 ? 'text-[#D99A36] animate-pulse' : 'text-[#5D4634]'
            }`}>
              {timerDisplay}
            </div>
            <span className="text-[10px] uppercase font-semibold text-[#5F5A64]">Remaining</span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Event Header Banner */}
          <div className="bg-[#F5EFE7] p-4 rounded-2xl border border-[#D8CBE8]/70">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#C4A484]">Event Summary</div>
            <h4 className="text-base font-bold text-[#5D4634] mt-0.5">{reservation.eventTitle}</h4>
            <div className="text-xs text-[#5F5A64] mt-1">
              Reservation Reference: <span className="font-mono font-semibold text-[#5D4634]">{reservation.id}</span>
            </div>
          </div>

          {/* Selected Tiers Breakdown */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-[#5D4634]">
              Held Ticket Items ({reservation.totalQuantity})
            </h5>
            <div className="space-y-2 border border-[#D8CBE8]/60 rounded-2xl p-4 bg-white">
              {reservation.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b last:border-b-0 border-[#D8CBE8]/40">
                  <div>
                    <span className="font-bold text-[#5D4634]">{item.tierName}</span>
                    <span className="text-[#5F5A64] ml-2">× {item.quantity}</span>
                  </div>
                  <div className="font-bold text-[#5D4634]">
                    ₹{item.subtotal.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}

              <div className="pt-2 text-xs space-y-1">
                <div className="flex justify-between text-[#5F5A64]">
                  <span>Subtotal</span>
                  <span>₹{reservation.subtotalAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-[#5F5A64]">
                  <span className="flex items-center gap-1">
                    Platform & Payment Gateway Fee (3.5%)
                  </span>
                  <span>₹{reservation.serviceFee.toLocaleString('en-IN')}</span>
                </div>
                <div className="pt-2 border-t border-[#D8CBE8] flex justify-between text-sm font-bold text-[#5D4634]">
                  <span>Total Payable</span>
                  <span className="text-[#5D4634] text-base font-extrabold">
                    ₹{reservation.totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Attendee Contact Information */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-[#5D4634]">
              Ticket Delivery & Contact
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[#5F5A64] mb-1 font-semibold">Attendee Name</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full bg-[#F5EFE7]/50 border border-[#D8CBE8] rounded-xl px-3 py-2 text-[#5D4634] focus:outline-none focus:border-[#C4A484]"
                />
              </div>
              <div>
                <label className="block text-[#5F5A64] mb-1 font-semibold">Delivery Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full bg-[#F5EFE7]/50 border border-[#D8CBE8] rounded-xl px-3 py-2 text-[#5D4634] focus:outline-none focus:border-[#C4A484]"
                />
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase tracking-wider text-[#5D4634]">
                Select Simulated Payment Mode
              </h5>
              <span className="text-[10px] text-[#388E65] font-semibold bg-[#388E65]/10 px-2 py-0.5 rounded-full">
                Sandbox Mode Active
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`p-3 rounded-xl border text-xs font-semibold text-center transition flex flex-col items-center gap-1.5 ${
                  paymentMethod === 'UPI' 
                    ? 'border-[#C4A484] bg-[#EDE7F6] text-[#5D4634]' 
                    : 'border-[#D8CBE8] bg-white text-[#5F5A64] hover:bg-[#F5EFE7]'
                }`}
              >
                <QrCode className="w-4 h-4 text-[#C4A484]" />
                <span>UPI / QR</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('CARD')}
                className={`p-3 rounded-xl border text-xs font-semibold text-center transition flex flex-col items-center gap-1.5 ${
                  paymentMethod === 'CARD' 
                    ? 'border-[#C4A484] bg-[#EDE7F6] text-[#5D4634]' 
                    : 'border-[#D8CBE8] bg-white text-[#5F5A64] hover:bg-[#F5EFE7]'
                }`}
              >
                <CreditCard className="w-4 h-4 text-[#C4A484]" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('NET_BANKING')}
                className={`p-3 rounded-xl border text-xs font-semibold text-center transition flex flex-col items-center gap-1.5 ${
                  paymentMethod === 'NET_BANKING' 
                    ? 'border-[#C4A484] bg-[#EDE7F6] text-[#5D4634]' 
                    : 'border-[#D8CBE8] bg-white text-[#5F5A64] hover:bg-[#F5EFE7]'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-[#C4A484]" />
                <span>Net Banking</span>
              </button>
            </div>
          </div>

          {/* Deterministic Outcome Controls (Required for testing as requested in prompt) */}
          <div className="p-3.5 bg-[#EDE7F6]/60 rounded-2xl border border-[#D8CBE8] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#5D4634] flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#C4A484]" />
                Sandbox Payment Outcome Controls:
              </span>
              <span className="text-[10px] text-[#5F5A64]">No real funds charged</span>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setDeterministicOutcome('SUCCESS')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold border transition ${
                  deterministicOutcome === 'SUCCESS'
                    ? 'bg-[#388E65] text-white border-[#388E65]'
                    : 'bg-white text-[#5F5A64] border-[#D8CBE8] hover:bg-[#F5EFE7]'
                }`}
              >
                Force Success (Confirm Booking)
              </button>
              <button
                type="button"
                onClick={() => setDeterministicOutcome('FAILED')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold border transition ${
                  deterministicOutcome === 'FAILED'
                    ? 'bg-[#C94C4C] text-white border-[#C94C4C]'
                    : 'bg-white text-[#5F5A64] border-[#D8CBE8] hover:bg-[#F5EFE7]'
                }`}
              >
                Force Decline (Release Hold)
              </button>
            </div>
          </div>

          {/* Terms checkbox */}
          <div className="flex items-start gap-2.5 text-xs text-[#5F5A64]">
            <input
              type="checkbox"
              id="terms-check"
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              className="mt-0.5 rounded text-[#C4A484] focus:ring-[#C4A484]"
            />
            <label htmlFor="terms-check" className="cursor-pointer">
              I agree to the organizer cancellation policy and acknowledge that tickets are reserved under Eventique’s 10-minute hold protocol.
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 bg-[#F5EFE7] border-t border-[#D8CBE8] flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleReleaseHold}
            disabled={isProcessing}
            className="text-xs font-semibold text-[#5F5A64] hover:text-[#C94C4C] transition underline"
          >
            Release Seats Early
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl bg-white border border-[#D8CBE8] text-xs font-bold text-[#5D4634] hover:bg-[#EDE7F6] transition"
            >
              Keep Hold & Minimize
            </button>
            <button
              type="button"
              onClick={() => handlePayment()}
              disabled={isProcessing || isExpired}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#C4A484] hover:bg-[#b09172] text-white text-xs font-bold shadow-md transition disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Hold & Payment...</span>
                </>
              ) : isExpired ? (
                <span>Hold Expired</span>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Confirm & Pay ₹{reservation.totalAmount.toLocaleString('en-IN')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
