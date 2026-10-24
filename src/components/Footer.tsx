import React from 'react';
import { Ticket, ShieldCheck, Heart, Sparkles } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#F5EFE7] border-t border-[#D8CBE8] mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#EDE7F6] border border-[#D8CBE8] flex items-center justify-center text-[#5D4634]">
                <Ticket className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-[#5D4634]">Eventique</span>
            </div>
            <p className="text-xs text-[#5F5A64] leading-relaxed">
              Multi-tenant event and ticket reservation platform engineered for zero-oversell concurrency with strict 10-minute inventory holds.
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EDE7F6] border border-[#D8CBE8] rounded-full text-[11px] font-semibold text-[#5D4634]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#388E65]" />
              <span>INR (₹) Simulated Gateway</span>
            </div>
          </div>

          {/* Attendee Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#5D4634]">
              For Attendees
            </h4>
            <ul className="space-y-2 text-xs text-[#5F5A64]">
              <li>
                <button onClick={() => onNavigate('explore')} className="hover:text-[#5D4634] transition">
                  Browse All Events
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('explore')} className="hover:text-[#5D4634] transition">
                  Technology Conferences
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('explore')} className="hover:text-[#5D4634] transition">
                  Acoustic & Indie Concerts
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('my-bookings')} className="hover:text-[#5D4634] transition">
                  My Bookings & QR Tickets
                </button>
              </li>
            </ul>
          </div>

          {/* Organizer Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#5D4634]">
              For Organizers
            </h4>
            <ul className="space-y-2 text-xs text-[#5F5A64]">
              <li>
                <button onClick={() => onNavigate('organizer-dashboard')} className="hover:text-[#5D4634] transition">
                  Organizer Dashboard
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('organizer-dashboard')} className="hover:text-[#5D4634] transition">
                  Create New Event
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('organizer-dashboard')} className="hover:text-[#5D4634] transition">
                  Ticket Tier Analytics
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('organizer-dashboard')} className="hover:text-[#5D4634] transition">
                  Export Guest Lists
                </button>
              </li>
            </ul>
          </div>

          {/* Trust & Architecture */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#5D4634]">
              System Architecture
            </h4>
            <p className="text-xs text-[#5F5A64] leading-relaxed">
              Equipped with atomic row serialization, BullMQ 10-minute hold expiration reconciliation, and tenant-scoped real-time SSE stream.
            </p>
            <div className="pt-1 text-[11px] text-[#5F5A64]">
              Built for commercial-scale ticketing reliability.
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[#D8CBE8]/70 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5F5A64]">
          <p>© 2026 Eventique Technologies. All rights reserved. Demo Environment.</p>
          <div className="flex items-center gap-6">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Security & Compliance</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
