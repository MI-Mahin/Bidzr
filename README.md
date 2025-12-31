# Bidzr - Sports Auction Management System

A comprehensive real-time sports auction management platform built with Next.js, Node.js, Express, MongoDB, and Socket.IO. Starting with Cricket, the platform is designed to support multiple sports.

## 🏏 Features

### User Roles
- **Admin**: Create and manage auctions, control bidding flow, set rules
- **Team Owner**: Register teams, participate in live bidding, manage squad
- **Player**: Register for auctions, view status, track sold value

### Core Features
- 🔴 **Real-time Bidding**: Live auction room with Socket.IO
- ⏱️ **30-Second Timer**: Auto-countdown with reset on new bids
- 💰 **Budget Management**: Track team budgets and spending
- 🎯 **Role-based Access**: Secure authentication with JWT
- 📊 **Live Stats**: Real-time auction analytics
- 🔐 **Secure Auctions**: Password-protected auction rooms

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express.js, TypeScript, Socket.IO
- **Database**: MongoDB with Mongoose ODM
- **Auth**: JWT with refresh tokens, Google OAuth (optional)
- **State**: Zustand for client-side state management

## 📁 Project Structure

```
bidzr/
├── packages/
│   ├── backend/          # Express.js API server
│   │   ├── src/
│   │   │   ├── config/   # Configuration files
│   │   │   ├── controllers/  # Route handlers
│   │   │   ├── middleware/   # Auth, validation, error handling
│   │   │   ├── models/   # Mongoose schemas
│   │   │   ├── routes/   # API routes
│   │   │   ├── socket/   # Socket.IO handlers
│   │   │   └── types/    # TypeScript definitions
│   │   └── package.json
│   │
│   └── frontend/         # Next.js application
│       ├── src/
│       │   ├── app/      # App Router pages
│       │   ├── components/   # UI components
│       │   ├── hooks/    # Custom hooks
│       │   ├── lib/      # Utilities, API client
│       │   └── store/    # Zustand stores
│       └── package.json
│
├── package.json          # Monorepo root
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/bidzr.git
   cd bidzr
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Backend (`packages/backend/.env`):
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/bidzr
   JWT_SECRET=your-super-secret-jwt-key
   JWT_REFRESH_SECRET=your-refresh-token-secret
   CLIENT_URL=http://localhost:3000
   ```

   Frontend (`packages/frontend/.env.local`):
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
   ```

4. **Start development servers**
   ```bash
   # Start both backend and frontend
   npm run dev

   # Or start individually
   npm run dev:backend
   npm run dev:frontend
   ```

5. **Open the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 📖 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user profile |
| POST | `/api/auth/refresh` | Refresh access token |

### Auctions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auctions` | List all auctions |
| POST | `/api/auctions` | Create auction (Admin) |
| GET | `/api/auctions/:id` | Get auction details |
| POST | `/api/auctions/:id/start` | Start auction (Admin) |
| POST | `/api/auctions/:id/end` | End auction (Admin) |

### Teams
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/teams/auction/:id/register` | Register team for auction |
| GET | `/api/teams/auction/:id` | Get auction teams |
| GET | `/api/teams/my-teams` | Get owner's teams |

### Players
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/players/auction/:id/register` | Register for auction |
| GET | `/api/players/auction/:id` | Get auction players |
| GET | `/api/players/my-registrations` | Get player's registrations |

### Bids
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bids` | Place a bid |
| GET | `/api/bids/player/:id` | Get bids for player |

## 🔌 Socket.IO Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `auction:join` | `{ auctionId }` | Join auction room |
| `auction:leave` | `{ auctionId }` | Leave auction room |
| `bid:place` | `{ auctionId, teamId, amount }` | Place a bid |
| `player:next` | `{ auctionId }` | Start next player (Admin) |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `player:up` | `{ player, basePrice }` | New player on block |
| `bid:placed` | `{ team, amount, teamId }` | Bid placed |
| `timer:update` | `{ timeRemaining }` | Timer tick |
| `player:sold` | `{ player, team, amount }` | Player sold |
| `player:unsold` | `{ player }` | Player unsold |
| `auction:ended` | `{}` | Auction completed |

## 🏗️ Building for Production

```bash
# Build all packages
npm run build

# Build individual packages
npm run build:backend
npm run build:frontend
```

## 🐳 Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build images individually
docker build -t bidzr-backend ./packages/backend
docker build -t bidzr-frontend ./packages/frontend
```

## 📝 Environment Variables

### Backend
| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | development |
| `PORT` | Server port | 5000 |
| `MONGODB_URI` | MongoDB connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_REFRESH_SECRET` | Refresh token secret | - |
| `JWT_EXPIRES_IN` | Token expiry | 15m |
| `CLIENT_URL` | Frontend URL for CORS | http://localhost:3000 |

### Frontend
| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | http://localhost:5000/api |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.IO server URL | http://localhost:5000 |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Cricket auction inspired by IPL auction format
- Built with ❤️ for sports enthusiasts

---

**Bidzr** - Experience the thrill of live sports auctions! 🏏⚡
