import { Router, Request, Response } from 'express';
import { db } from '../db.ts';
import { requireAuth, requireTenant } from './auth.ts';
import { Event, TicketTier, EventCategory } from '../../types/index.ts';
import { sseManager } from '../sse.ts';

export const eventsRouter = Router();

// Public: Browse & Search Events
eventsRouter.get('/', (req: Request, res: Response) => {
  const { category, search, minPrice, maxPrice, sort, status } = req.query;

  let list = Array.from(db.events.values());

  // Default to published events for public, unless requested specifically
  if (status) {
    list = list.filter(e => e.status === status);
  } else {
    list = list.filter(e => e.status === 'PUBLISHED');
  }

  // Category filter
  if (category && category !== 'All') {
    list = list.filter(e => e.category.toLowerCase() === (category as string).toLowerCase());
  }

  // Search filter
  if (search && typeof search === 'string') {
    const q = search.toLowerCase().trim();
    list = list.filter(e => 
      e.title.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.organizerName.toLowerCase().includes(q) ||
      e.venue.city.toLowerCase().includes(q) ||
      e.venue.name.toLowerCase().includes(q)
    );
  }

  // Price filters (based on lowest ticket tier price)
  if (minPrice) {
    const minP = Number(minPrice);
    list = list.filter(e => {
      const minTier = Math.min(...e.ticketTiers.map(t => t.price));
      return minTier >= minP;
    });
  }

  if (maxPrice) {
    const maxP = Number(maxPrice);
    list = list.filter(e => {
      const minTier = Math.min(...e.ticketTiers.map(t => t.price));
      return minTier <= maxP;
    });
  }

  // Sorting
  if (sort === 'price-asc') {
    list.sort((a, b) => Math.min(...a.ticketTiers.map(t => t.price)) - Math.min(...b.ticketTiers.map(t => t.price)));
  } else if (sort === 'price-desc') {
    list.sort((a, b) => Math.min(...b.ticketTiers.map(t => t.price)) - Math.min(...a.ticketTiers.map(t => t.price)));
  } else if (sort === 'popular') {
    list.sort((a, b) => {
      const soldA = a.ticketTiers.reduce((acc, t) => acc + t.soldQuantity, 0);
      const soldB = b.ticketTiers.reduce((acc, t) => acc + t.soldQuantity, 0);
      return soldB - soldA;
    });
  } else {
    // Default by start date
    list.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }

  return res.json({
    total: list.length,
    events: list
  });
});

// Public: Get Event Details
eventsRouter.get('/:eventId', (req: Request, res: Response) => {
  const { eventId } = req.params;
  const event = db.events.get(eventId) || Array.from(db.events.values()).find(e => e.slug === eventId);

  if (!event) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  return res.json({ event });
});

// Organizer: Get my events (Tenant Scoped)
eventsRouter.get('/organizer/my', requireAuth, requireTenant, (req: Request, res: Response) => {
  const user = (req as any).user;
  const tenantId = user.tenantId;

  const events = Array.from(db.events.values()).filter(e => e.tenantId === tenantId);
  return res.json({ events });
});

// Organizer: Create new event (Tenant Scoped)
eventsRouter.post('/organizer', requireAuth, requireTenant, (req: Request, res: Response) => {
  const user = (req as any).user;
  const tenantId = user.tenantId;
  const organizer = db.organizers.get(tenantId);

  const {
    title,
    category,
    description,
    bannerImage,
    startDate,
    endDate,
    startTime,
    endTime,
    venue,
    refundPolicy,
    terms,
    salesCutoff,
    ticketTiers,
    status
  } = req.body;

  if (!title || !category || !startDate || !ticketTiers || ticketTiers.length === 0) {
    return res.status(400).json({ error: 'Missing required event fields or ticket tiers.' });
  }

  const eventId = `EVT-${Date.now()}-${Math.floor(Math.random() * 899 + 100)}`;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + `-${Date.now().toString().slice(-4)}`;

  const tiers: TicketTier[] = ticketTiers.map((t: any, index: number) => ({
    id: `TIER-${eventId}-${index + 1}`,
    eventId,
    name: t.name || 'General Admission',
    description: t.description || 'Standard entry pass',
    price: Number(t.price) || 0,
    totalQuantity: Number(t.totalQuantity) || 100,
    reservedQuantity: 0,
    soldQuantity: 0,
    maxPerAttendee: Number(t.maxPerAttendee) || 5,
    salesStartDate: t.salesStartDate || new Date().toISOString(),
    salesEndDate: t.salesEndDate || endDate || startDate,
    status: 'ACTIVE'
  }));

  const newEvent: Event = {
    id: eventId,
    tenantId,
    organizerName: organizer?.businessName || user.name,
    organizerLogo: organizer?.logoUrl,
    organizerVerified: organizer?.verified || false,
    title,
    slug,
    category: category as EventCategory,
    description: description || '',
    bannerImage: bannerImage || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1400&q=80',
    startDate,
    endDate: endDate || startDate,
    startTime: startTime || '10:00 AM',
    endTime: endTime || '06:00 PM',
    venue: venue || {
      name: 'Event Space',
      address: '100 Exhibition Road',
      city: 'Bengaluru',
      state: 'Karnataka'
    },
    status: status || 'PUBLISHED',
    salesCutoff: salesCutoff || startDate,
    refundPolicy: refundPolicy || 'Cancellations permitted up to 48 hours prior.',
    terms: terms || 'Government photo ID required for entry.',
    featured: false,
    ticketTiers: tiers,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.events.set(newEvent.id, newEvent);

  db.logAudit(
    user.id,
    'ORGANIZER',
    'EVENT_CREATED',
    'EVENT',
    newEvent.id,
    `Organizer created event "${newEvent.title}" with ${tiers.length} tiers.`
  );

  sseManager.broadcast({
    type: 'EVENT_CREATED',
    payload: { eventId: newEvent.id, title: newEvent.title },
    tenantId
  });

  return res.status(201).json({ event: newEvent });
});

// Organizer: Update Event (Tenant Isolation Enforced)
eventsRouter.patch('/organizer/:eventId', requireAuth, requireTenant, (req: Request, res: Response) => {
  const user = (req as any).user;
  const tenantId = user.tenantId;
  const { eventId } = req.params;

  const event = db.events.get(eventId);
  if (!event) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  // Tenant check: strictly isolate organizers
  if (user.role !== 'ADMIN' && event.tenantId !== tenantId) {
    return res.status(403).json({ error: 'Access denied: You do not own this event.' });
  }

  const updates = req.body;
  if (updates.title) event.title = updates.title;
  if (updates.category) event.category = updates.category;
  if (updates.description) event.description = updates.description;
  if (updates.bannerImage) event.bannerImage = updates.bannerImage;
  if (updates.startDate) event.startDate = updates.startDate;
  if (updates.endDate) event.endDate = updates.endDate;
  if (updates.startTime) event.startTime = updates.startTime;
  if (updates.endTime) event.endTime = updates.endTime;
  if (updates.venue) event.venue = updates.venue;
  if (updates.status) event.status = updates.status;
  if (updates.salesCutoff) event.salesCutoff = updates.salesCutoff;
  if (updates.refundPolicy) event.refundPolicy = updates.refundPolicy;
  if (updates.terms) event.terms = updates.terms;

  // Update existing tiers or add new
  if (updates.ticketTiers && Array.isArray(updates.ticketTiers)) {
    event.ticketTiers = updates.ticketTiers.map((t: any, index: number) => {
      const existing = event.ticketTiers.find(et => et.id === t.id);
      return {
        id: t.id || `TIER-${event.id}-${index + 1}`,
        eventId: event.id,
        name: t.name,
        description: t.description || '',
        price: Number(t.price) || 0,
        totalQuantity: Number(t.totalQuantity) || 100,
        reservedQuantity: existing ? existing.reservedQuantity : 0,
        soldQuantity: existing ? existing.soldQuantity : 0,
        maxPerAttendee: Number(t.maxPerAttendee) || 5,
        salesStartDate: t.salesStartDate || event.startDate,
        salesEndDate: t.salesEndDate || event.salesCutoff,
        status: t.status || 'ACTIVE'
      };
    });
  }

  event.updatedAt = new Date().toISOString();

  db.logAudit(
    user.id,
    'ORGANIZER',
    'EVENT_UPDATED',
    'EVENT',
    event.id,
    `Updated event details for "${event.title}".`
  );

  return res.json({ event });
});

// Organizer: Publish / Archive Event
eventsRouter.post('/organizer/:eventId/publish', requireAuth, requireTenant, (req: Request, res: Response) => {
  const user = (req as any).user;
  const tenantId = user.tenantId;
  const { eventId } = req.params;

  const event = db.events.get(eventId);
  if (!event) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  if (user.role !== 'ADMIN' && event.tenantId !== tenantId) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  event.status = 'PUBLISHED';
  event.updatedAt = new Date().toISOString();

  return res.json({ event, message: 'Event successfully published.' });
});

eventsRouter.delete('/organizer/:eventId', requireAuth, requireTenant, (req: Request, res: Response) => {
  const user = (req as any).user;
  const tenantId = user.tenantId;
  const { eventId } = req.params;

  const event = db.events.get(eventId);
  if (!event) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  if (user.role !== 'ADMIN' && event.tenantId !== tenantId) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  // Check if active bookings exist before archiving
  const activeBookings = Array.from(db.bookings.values()).filter(b => b.eventId === eventId && b.status === 'CONFIRMED');
  if (activeBookings.length > 0) {
    event.status = 'ARCHIVED';
    return res.json({ message: 'Event archived. Existing confirmed bookings remain preserved.' });
  }

  db.events.delete(eventId);
  return res.json({ message: 'Event deleted successfully.' });
});
