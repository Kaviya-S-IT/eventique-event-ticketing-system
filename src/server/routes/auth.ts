import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db.ts';
import { User, UserRole } from '../../types/index.ts';

export const authRouter = Router();

// Simple auth token decoding simulator for seamless demo session management
export function authenticateToken(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // Token can be user ID directly or mock signed token
    const user = db.users.get(token);
    if (user) {
      (req as any).user = user;
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as User | undefined;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as User | undefined;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: `Forbidden: Requires role ${roles.join(' or ')}.` });
    }
    next();
  };
}

export function requireTenant(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as User | undefined;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (user.role === 'ADMIN') {
    // Admins can inspect any tenant or pass-through
    return next();
  }
  if (user.role !== 'ORGANIZER' || !user.tenantId) {
    return res.status(403).json({ error: 'Tenant access required. User is not an active organizer.' });
  }
  next();
}

// Routes
authRouter.post('/login', (req: Request, res: Response) => {
  const { email, role } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  // Find existing user by email
  let user = Array.from(db.users.values()).find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    // Auto-create attendee if not found
    const newUser: User = {
      id: `USR-${Date.now()}`,
      email: email.toLowerCase(),
      name: email.split('@')[0],
      role: (role as UserRole) || 'ATTENDEE',
      createdAt: new Date().toISOString()
    };
    db.users.set(newUser.id, newUser);
    user = newUser;
  }

  // Generate token (using user.id for high compatibility)
  const token = user.id;

  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      avatarUrl: user.avatarUrl
    }
  });
});

authRouter.post('/register', (req: Request, res: Response) => {
  const { name, email, role, businessName } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const existing = Array.from(db.users.values()).find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'A user with this email already exists.' });
  }

  const userId = `USR-${Date.now()}`;
  const userRole: UserRole = role === 'ORGANIZER' ? 'ORGANIZER' : 'ATTENDEE';
  let tenantId: string | undefined = undefined;

  if (userRole === 'ORGANIZER') {
    tenantId = `TENANT-${Date.now()}`;
    const organizer = {
      id: tenantId,
      userId,
      businessName: businessName || `${name} Productions`,
      slug: (businessName || name).toLowerCase().replace(/[^a-z0-9]/g, '-'),
      contactEmail: email,
      status: 'ACTIVE' as const,
      verified: true,
      commissionRate: 0.05,
      createdAt: new Date().toISOString()
    };
    db.organizers.set(tenantId, organizer);
  }

  const user: User = {
    id: userId,
    email: email.toLowerCase(),
    name,
    role: userRole,
    tenantId,
    createdAt: new Date().toISOString()
  };

  db.users.set(userId, user);

  return res.status(201).json({
    token: user.id,
    user
  });
});

authRouter.get('/me', (req: Request, res: Response) => {
  const user = (req as any).user as User | undefined;
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  let organizer = undefined;
  if (user.tenantId) {
    organizer = db.organizers.get(user.tenantId);
  }

  return res.json({ user, organizer });
});

authRouter.post('/logout', (_req: Request, res: Response) => {
  return res.json({ success: true, message: 'Logged out successfully.' });
});
