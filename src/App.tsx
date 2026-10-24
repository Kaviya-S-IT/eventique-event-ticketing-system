import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { ExplorePage } from './pages/ExplorePage.tsx';
import { EventDetailPage } from './pages/EventDetailPage.tsx';
import { MyBookingsPage } from './pages/MyBookingsPage.tsx';
import { OrganizerDashboardPage } from './pages/OrganizerDashboardPage.tsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.tsx';
import { CheckoutModal } from './components/CheckoutModal.tsx';
import { TicketPassModal } from './components/TicketPassModal.tsx';
import { ConcurrencySimulatorModal } from './components/ConcurrencySimulatorModal.tsx';
import { Event, Booking, Reservation } from './types/index.ts';

const AppContent: React.FC = () => {
  const { user, activeHold, setActiveHold, refreshActiveHolds } = useAuth();

  // Navigation View State
  const [currentView, setCurrentView] = useState<string>('home');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [currentReservation, setCurrentReservation] = useState<Reservation | null>(null);
  const [isTicketPassOpen, setIsTicketPassOpen] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [isConcurrencyTesterOpen, setIsConcurrencyTesterOpen] = useState(false);

  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event);
    setCurrentView('event-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleHoldCreated = (reservation: Reservation) => {
    setCurrentReservation(reservation);
    setIsCheckoutOpen(true);
  };

  const handleOpenActiveHoldCheckout = () => {
    if (activeHold) {
      setCurrentReservation(activeHold);
      setIsCheckoutOpen(true);
    }
  };

  const handleBookingConfirmed = (booking: Booking) => {
    setConfirmedBooking(booking);
    setIsTicketPassOpen(true);
    refreshActiveHolds();
  };

  const handleHoldReleased = () => {
    refreshActiveHolds();
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#5F5A64]">
      {/* Navigation Header */}
      <Navbar
        currentView={currentView}
        setCurrentView={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenHoldCheckout={handleOpenActiveHoldCheckout}
        onOpenConcurrencyTester={() => setIsConcurrencyTesterOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Main Page Routing */}
      <main className="flex-1">
        {currentView === 'home' && (
          <HomePage
            onNavigate={(view, categoryFilter) => {
              if (categoryFilter) setSearchQuery(categoryFilter);
              setCurrentView(view);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectEvent={handleSelectEvent}
          />
        )}

        {currentView === 'explore' && (
          <ExplorePage
            onSelectEvent={handleSelectEvent}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}

        {currentView === 'event-detail' && selectedEvent && (
          <EventDetailPage
            event={selectedEvent}
            onBack={() => {
              setCurrentView('explore');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onHoldCreated={handleHoldCreated}
          />
        )}

        {currentView === 'my-bookings' && (
          <MyBookingsPage
            onSelectBooking={(booking) => {
              setConfirmedBooking(booking);
              setIsTicketPassOpen(true);
            }}
            onResumeHold={(hold) => {
              setCurrentReservation(hold);
              setIsCheckoutOpen(true);
            }}
            onExploreEvents={() => {
              setCurrentView('explore');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentView === 'organizer-dashboard' && (
          <OrganizerDashboardPage />
        )}

        {currentView === 'admin-dashboard' && (
          <AdminDashboardPage />
        )}
      </main>

      {/* Footer */}
      <Footer
        onNavigate={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* 10-Minute Hold Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        reservation={currentReservation}
        onBookingConfirmed={handleBookingConfirmed}
        onHoldReleased={handleHoldReleased}
      />

      {/* Issued Ticket Pass Modal */}
      <TicketPassModal
        isOpen={isTicketPassOpen}
        onClose={() => setIsTicketPassOpen(false)}
        booking={confirmedBooking}
        onViewMyBookings={() => {
          setCurrentView('my-bookings');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Interactive Concurrency Stress-Tester Modal */}
      <ConcurrencySimulatorModal
        isOpen={isConcurrencyTesterOpen}
        onClose={() => setIsConcurrencyTesterOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
