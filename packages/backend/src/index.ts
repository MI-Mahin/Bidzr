import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';

import config from './config';
import connectDB from './config/database';
import passport from './config/passport';
import routes from './routes';
import { notFound, errorHandler } from './middleware/errorHandler';
import { AuctionSocketManager } from './socket';

// Create Express app
const app: Application = express();

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
const socketManager = new AuctionSocketManager(httpServer);

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing
app.use(cookieParser());

// Passport initialization
app.use(passport.initialize());

// API routes
app.use('/api', routes);

// Root route
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Welcome to Bidzr API - Sports Auction Management System',
    version: '1.0.0',
    documentation: '/api/docs',
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = config.port;

httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🏏 BIDZR - Sports Auction Management System            ║
║                                                           ║
║   Server running on port ${PORT}                            ║
║   Environment: ${config.env}                         ║
║                                                           ║
║   REST API: http://localhost:${PORT}/api                    ║
║   Socket.IO: ws://localhost:${PORT}                         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
  console.error('Unhandled Rejection:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

export { app, httpServer, socketManager };
