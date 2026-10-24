import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Reservation } from '../types/index.ts';

export interface PredefinedPersona {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'ORGANIZER' | 'ATTENDEE';
  tenantId?: string;
  label: string;
  badge: string;
  avatarUrl?: string;
}

export const PREDEFINED_PERSONAS: PredefinedPersona[] = [
  {
    id: 'USR-ATTENDEE-01',
    name: 'Kaviya Sharma',
    email: 'kaviyas042007@gmail.com',
    role: 'ATTENDEE',
    label: 'Attendee',
    badge: 'Ticket Buyer',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80'
  },
  {
    id: 'USR-ORG-TECH',
    name: 'Vikramaditya Sengupta',
    email: 'organizer@techsummit.io',
    role: 'ORGANIZER',
    tenantId: 'TENANT-TECH-01',
    label: 'Tech Organizer',
    badge: 'Apex Horizons',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80'
  },
  {
    id: 'USR-ORG-AURA',
    name: 'Ananya Deshmukh',
    email: 'curator@aurasound.in',
    role: 'ORGANIZER',
    tenantId: 'TENANT-AURA-02',
    label: 'Arts Organizer',
    badge: 'Aura Sound',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80'
  },
  {
    id: 'USR-ADMIN-01',
    name: 'Elena Rostova',
    email: 'admin@eventique.com',
    role: 'ADMIN',
    label: 'Platform Admin',
    badge: 'Super Admin',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'
  }
];

interface AuthContextType {
  user: User;
  token: string;
  switchPersona: (personaId: string) => void;
  activeHold: Reservation | null;
  setActiveHold: (hold: Reservation | null) => void;
  refreshActiveHolds: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPersona, setCurrentPersona] = useState<PredefinedPersona>(PREDEFINED_PERSONAS[0]);
  const [activeHold, setActiveHold] = useState<Reservation | null>(null);

  const user: User = {
    id: currentPersona.id,
    email: currentPersona.email,
    name: currentPersona.name,
    role: currentPersona.role,
    tenantId: currentPersona.tenantId,
    avatarUrl: currentPersona.avatarUrl,
    createdAt: '2026-01-01T00:00:00Z'
  };

  const token = currentPersona.id;

  const refreshActiveHolds = async () => {
    try {
      const res = await fetch('/api/bookings/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.activeHolds && data.activeHolds.length > 0) {
          // Select newest active hold
          const newest = data.activeHolds[data.activeHolds.length - 1];
          setActiveHold(newest);
        } else {
          setActiveHold(null);
        }
      }
    } catch (err) {
      console.warn('Could not refresh active holds', err);
    }
  };

  useEffect(() => {
    refreshActiveHolds();
  }, [currentPersona.id]);

  const switchPersona = (personaId: string) => {
    const found = PREDEFINED_PERSONAS.find((p) => p.id === personaId);
    if (found) {
      setCurrentPersona(found);
      setActiveHold(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        switchPersona,
        activeHold,
        setActiveHold,
        refreshActiveHolds
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
