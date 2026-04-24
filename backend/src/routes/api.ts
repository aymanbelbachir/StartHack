import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'starthack-dev-secret';

function authenticate(req: Request, res: Response, next: Function) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
}

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/hackathons', authenticate, (_req: Request, res: Response) => {
  res.json([
    { id: 1, name: 'StartHack 2026', location: 'St. Gallen', date: '2026-03-18', participants: 600 },
    { id: 2, name: 'ETH Zurich Hack', location: 'Zurich', date: '2026-04-05', participants: 400 },
  ]);
});

export default router;
