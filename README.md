# Eventique – Multi-Tenant Event & Ticket Reservation System

Eventique is an enterprise-grade multi-tenant event ticketing and ticket reservation platform built with React, TypeScript, Tailwind CSS, Express, and PostgreSQL-compatible concurrency primitives.

##  Color Palette & Design System

- **Pure White (`#FFFFFF`):** Base canvas, cards, modal surfaces.
- **Pale Lavender (`#EDE7F6`):** Hero backgrounds, active filter chips, soft accents.
- **Light Brown (`#C4A484`):** Primary buttons, active navigation, badges, and highlights.
- **Dark Brown (`#5D4634`):** Primary headings, strong text, and key icons.
- **Soft Lavender (`#D8CBE8`):** Subtle borders, secondary backgrounds, and outlines.
- **Warm Beige (`#F5EFE7`):** Ticket summary cards, section alternates, and boarding passes.
- **Body Text (`#5F5A64`):** High-readability body copy.
- **Success Green (`#388E65`):** Confirmed status, verified organizer badge, positive trends.
- **Warning Amber (`#D99A36`):** Active 10-minute hold countdown, low inventory warnings.
- **Error Red (`#C94C4C`):** Declines, cancellations, and expired hold alerts.

---

## The 10-Minute Reservation Engine & Concurrency Control

1. **Serialized Atomic Mutex (`SELECT ... FOR UPDATE` equivalent):**
   - When multiple attendees request the last available seat simultaneously, an atomic lock serializes inventory validation.
   - `available = totalQuantity - soldQuantity - reservedQuantity`
   - If `quantity > available`, subsequent requests are rejected immediately with `409 Conflict`. Zero overselling is guaranteed.
2. **Exact 10-Minute Expiration (`expiresAt = Date.now() + 10 * 60 * 1000`):**
   - The hold is tracked by a background reconciler worker.
   - If the timer expires before payment, inventory is automatically reclaimed and returned to the public pool.
3. **Idempotent Payment Confirmation:**
   - Double payment callbacks or browser re-submits cannot double-confirm bookings or duplicate ticket inventory deductions.

---

##  Multi-Tenant Roles & Quick Switcher

Use the top **Role Switcher** dropdown in the header to switch between personas:

1. **Attendee (`Kaviya Sharma`):**
   - Browse events, filter by category and price in ₹ (INR).
   - Place a 10-minute hold on VIP or General Admission tickets.
   - Experience simulated checkout and receive digital passes with unique QR codes (`ETQ-TKT-XXXX`).
2. **Tech Summit Organizer (`Vikramaditya Sengupta`, Tenant: `TENANT-TECH-01`):**
   - Access tenant-scoped dashboard, revenue graphs, and conversion funnel.
   - Create multi-tiered events with custom capacities and pricing.
3. **Arts Organizer (`Ananya Deshmukh`, Tenant: `TENANT-AURA-02`):**
   - Isolated tenant analytics for concerts and exhibitions.
4. **Platform Super-Admin (`Elena Rostova`):**
   - View platform-wide revenue, review organizers, moderate events, and audit logs.

---

## Automated Concurrency & Inventory Test Suite

Run the concurrency stress-test tool directly from the navigation bar ("Test Atomic Concurrency Lock") or run the automated test suite in `/tests/reservation-concurrency.test.ts`.

---

##  Running Locally

```bash
# Install dependencies
npm install

# Start full-stack dev server on port 3000
npm run dev

# Build production bundle
npm run build

# Start production server
npm start
```
