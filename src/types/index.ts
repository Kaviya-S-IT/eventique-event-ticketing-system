export type UserRole = 'ADMIN' | 'ORGANIZER' | 'ATTENDEE';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId?: string; // Links to OrganizerProfile if role === 'ORGANIZER'
  avatarUrl?: string;
  phone?: string;
  createdAt: string;
}

export type OrganizerStatus = 'ACTIVE' | 'PENDING_REVIEW' | 'SUSPENDED';

export interface OrganizerProfile {
  id: string;
  userId: string;
  businessName: string;
  slug: string;
  logoUrl?: string;
  bio?: string;
  contactEmail: string;
  contactPhone?: string;
  status: OrganizerStatus;
  verified: boolean;
  commissionRate: number; // e.g. 0.05 (5%)
  payoutAccount?: string;
  createdAt: string;
}

export type EventCategory = 
  | 'Concerts' 
  | 'Technology Conferences' 
  | 'Workshops' 
  | 'Art Exhibitions' 
  | 'Festivals' 
  | 'Networking Events';

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'CANCELLED';

export interface TicketTier {
  id: string;
  eventId: string;
  name: string; // e.g., 'VIP', 'General Admission', 'Early Bird', 'Student'
  description: string;
  price: number; // In INR (₹)
  totalQuantity: number;
  reservedQuantity: number; // In active 10-min holds
  soldQuantity: number; // Confirmed bookings
  maxPerAttendee: number;
  salesStartDate: string;
  salesEndDate: string;
  status: 'ACTIVE' | 'SOLD_OUT' | 'EXPIRED' | 'PAUSED';
}

export interface Venue {
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode?: string;
  accessibilityDetails?: string;
  capacity?: number;
}

export interface Event {
  id: string;
  tenantId: string;
  organizerName: string;
  organizerLogo?: string;
  organizerVerified: boolean;
  title: string;
  slug: string;
  category: EventCategory;
  description: string;
  bannerImage: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  startTime: string; // e.g. "18:00"
  endTime: string; // e.g. "22:00"
  venue: Venue;
  status: EventStatus;
  salesCutoff: string;
  refundPolicy: string;
  terms: string;
  featured?: boolean;
  ticketTiers: TicketTier[];
  createdAt: string;
  updatedAt: string;
}

export type ReservationStatus = 
  | 'HELD' 
  | 'PAYMENT_PENDING' 
  | 'CONFIRMED' 
  | 'EXPIRED' 
  | 'CANCELLED' 
  | 'PAYMENT_FAILED';

export interface ReservationItem {
  ticketTierId: string;
  tierName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Reservation {
  id: string;
  eventId: string;
  eventTitle: string;
  tenantId: string;
  attendeeId: string;
  attendeeName: string;
  attendeeEmail: string;
  items: ReservationItem[];
  totalQuantity: number;
  subtotalAmount: number;
  serviceFee: number;
  totalAmount: number;
  status: ReservationStatus;
  createdAt: string;
  expiresAt: string; // Exactly 10 minutes from creation
  paymentId?: string;
  bookingId?: string;
}

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface Payment {
  id: string;
  reservationId: string;
  amount: number;
  currency: 'INR';
  status: PaymentStatus;
  idempotencyKey: string;
  paymentMethod: string;
  transactionReference: string;
  failureReason?: string;
  createdAt: string;
  completedAt?: string;
}

export interface IssuedTicket {
  ticketNumber: string; // e.g. "ETQ-TKT-98324"
  tierName: string;
  attendeeName: string;
  seatInfo?: string;
  qrPayload: string;
}

export interface Booking {
  id: string;
  bookingReference: string; // e.g. "ETQ-2026-A892"
  reservationId: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  tenantId: string;
  attendeeId: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  items: ReservationItem[];
  totalQuantity: number;
  totalAmount: number;
  paymentReference: string;
  status: 'CONFIRMED' | 'CANCELLED';
  issuedTickets: IssuedTicket[];
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userRole: UserRole;
  action: string;
  entityType: 'EVENT' | 'ORGANIZER' | 'RESERVATION' | 'BOOKING' | 'USER' | 'PAYMENT';
  entityId: string;
  details: string;
  ipAddress?: string;
}

export interface OrganizerAnalytics {
  totalRevenue: number;
  ticketsSold: number;
  activeEvents: number;
  pendingReservations: number;
  conversionRate: number; // Percentage
  revenueOverTime: { date: string; revenue: number; tickets: number }[];
  ticketsByEvent: { eventTitle: string; sold: number; total: number; revenue: number }[];
  tierDistribution: { name: string; value: number }[];
  conversionFunnel: { stage: string; count: number }[];
}

export interface AdminOverview {
  totalUsers: number;
  totalOrganizers: number;
  totalEvents: number;
  totalConfirmedTickets: number;
  grossSales: number;
  pendingOrganizerApprovals: number;
  salesTrend: { date: string; amount: number; bookings: number }[];
}
