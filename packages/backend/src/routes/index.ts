import { Router } from 'express';
import authRoutes from './authRoutes';
import auctionRoutes from './auctionRoutes';
import teamRoutes from './teamRoutes';
import playerRoutes from './playerRoutes';
import bidRoutes from './bidRoutes';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Bidzr API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/auctions', auctionRoutes);
router.use('/teams', teamRoutes);
router.use('/players', playerRoutes);
router.use('/bids', bidRoutes);

export default router;
