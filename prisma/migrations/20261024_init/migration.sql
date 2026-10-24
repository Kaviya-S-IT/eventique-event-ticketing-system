-- Eventique Initial Migration
-- PostgreSQL schema for Multi-Tenant Event & Ticket Reservation System

CREATE TYPE "Role" AS ENUM ('ADMIN', 'ORGANIZER', 'ATTENDEE');
CREATE TYPE "OrganizerStatus" AS ENUM ('ACTIVE', 'PENDING_REVIEW', 'SUSPENDED');
CREATE TYPE "EventCategory" AS ENUM ('CONCERTS', 'TECHNOLOGY_CONFERENCES', 'WORKSHOPS', 'ART_EXHIBITIONS', 'FESTIVALS', 'NETWORKING_EVENTS');
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'CANCELLED');
CREATE TYPE "ReservationStatus" AS ENUM ('HELD', 'PAYMENT_PENDING', 'CONFIRMED', 'EXPIRED', 'CANCELLED', 'PAYMENT_FAILED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ATTENDEE',
    "phone" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");

CREATE TABLE "OrganizerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "bio" TEXT,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "status" "OrganizerStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "payoutAccount" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrganizerProfile_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "OrganizerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "OrganizerProfile_userId_key" ON "OrganizerProfile"("userId");
CREATE UNIQUE INDEX "OrganizerProfile_slug_key" ON "OrganizerProfile"("slug");
CREATE INDEX "OrganizerProfile_status_idx" ON "OrganizerProfile"("status");

CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "EventCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "bannerImage" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "venueName" TEXT NOT NULL,
    "venueAddress" TEXT NOT NULL,
    "venueCity" TEXT NOT NULL,
    "venueState" TEXT NOT NULL,
    "accessibility" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "salesCutoff" TIMESTAMP(3) NOT NULL,
    "refundPolicy" TEXT NOT NULL,
    "terms" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Event_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Event_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "OrganizerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");
CREATE INDEX "Event_tenantId_idx" ON "Event"("tenantId");
CREATE INDEX "Event_category_idx" ON "Event"("category");
CREATE INDEX "Event_status_idx" ON "Event"("status");
CREATE INDEX "Event_startDate_idx" ON "Event"("startDate");

CREATE TABLE "TicketTier" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pricePaise" INTEGER NOT NULL,
    "totalQuantity" INTEGER NOT NULL,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "soldQuantity" INTEGER NOT NULL DEFAULT 0,
    "maxPerAttendee" INTEGER NOT NULL DEFAULT 5,
    "salesStartDate" TIMESTAMP(3) NOT NULL,
    "salesEndDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TicketTier_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TicketTier_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "TicketTier_eventId_idx" ON "TicketTier"("eventId");

CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "attendeeId" TEXT NOT NULL,
    "attendeeName" TEXT NOT NULL,
    "attendeeEmail" TEXT NOT NULL,
    "totalQuantity" INTEGER NOT NULL,
    "subtotalPaise" INTEGER NOT NULL,
    "serviceFeePaise" INTEGER NOT NULL,
    "totalAmountPaise" INTEGER NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'HELD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paymentId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Reservation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON UPDATE CASCADE,
    CONSTRAINT "Reservation_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "User"("id") ON UPDATE CASCADE
);

CREATE INDEX "Reservation_eventId_idx" ON "Reservation"("eventId");
CREATE INDEX "Reservation_attendeeId_idx" ON "Reservation"("attendeeId");
CREATE INDEX "Reservation_status_idx" ON "Reservation"("status");
CREATE INDEX "Reservation_expiresAt_idx" ON "Reservation"("expiresAt");

CREATE TABLE "ReservationItem" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "ticketTierId" TEXT NOT NULL,
    "tierName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPricePaise" INTEGER NOT NULL,
    "subtotalPaise" INTEGER NOT NULL,
    CONSTRAINT "ReservationItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ReservationItem_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReservationItem_ticketTierId_fkey" FOREIGN KEY ("ticketTierId") REFERENCES "TicketTier"("id") ON UPDATE CASCADE
);

CREATE INDEX "ReservationItem_reservationId_idx" ON "ReservationItem"("reservationId");
CREATE INDEX "ReservationItem_ticketTierId_idx" ON "ReservationItem"("ticketTierId");

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "transactionReference" TEXT NOT NULL,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Payment_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Payment_reservationId_key" ON "Payment"("reservationId");
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
CREATE UNIQUE INDEX "Payment_transactionReference_key" ON "Payment"("transactionReference");

CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "bookingReference" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "attendeeId" TEXT NOT NULL,
    "attendeeName" TEXT NOT NULL,
    "attendeeEmail" TEXT NOT NULL,
    "attendeePhone" TEXT,
    "totalQuantity" INTEGER NOT NULL,
    "totalAmountPaise" INTEGER NOT NULL,
    "paymentReference" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Booking_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON UPDATE CASCADE,
    CONSTRAINT "Booking_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON UPDATE CASCADE,
    CONSTRAINT "Booking_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "User"("id") ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Booking_bookingReference_key" ON "Booking"("bookingReference");
CREATE UNIQUE INDEX "Booking_reservationId_key" ON "Booking"("reservationId");
CREATE INDEX "Booking_eventId_idx" ON "Booking"("eventId");
CREATE INDEX "Booking_attendeeId_idx" ON "Booking"("attendeeId");

CREATE TABLE "BookingTicket" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "ticketTierId" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "tierName" TEXT NOT NULL,
    "attendeeName" TEXT NOT NULL,
    "qrPayload" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookingTicket_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BookingTicket_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BookingTicket_ticketTierId_fkey" FOREIGN KEY ("ticketTierId") REFERENCES "TicketTier"("id") ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "BookingTicket_ticketNumber_key" ON "BookingTicket"("ticketNumber");
CREATE INDEX "BookingTicket_bookingId_idx" ON "BookingTicket"("bookingId");

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userRole" "Role" NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
