# NXT_RAIL Management API

Node.js and Express REST API for the NXT_RAIL railway reservation and operations platform. It manages authentication, trains, journeys, bookings, PNR lookup, cancellations, inventory, travel add-ons, and authenticated AI-assisted travel requests.

**Related service:** [NXT_RAIL Frontend](https://github.com/amanfoundongithub/Railway-Management-Frontend)

## Features

- JWT authentication and role-based authorization
- Train search, schedules, live status, and station lookup
- Booking creation, PNR lookup, history, cancellation, and payment webhook handling
- Admin train and journey inventory management
- Station E-catering, cab, hotel, and retiring-room services
- MongoDB-backed domain models
- Redis and BullMQ background-job support
- Authenticated Gemini-powered NXT_RAIL AI Concierge
- Confirmed-only booking actions for cabs, hotels, and catering
- Helmet, CORS allowlisting, request limits, and structured logging

## Technology

| Category | Technology |
| --- | --- |
| Runtime | Node.js 18+, ES modules |
| API | Express 5 |
| Database | MongoDB, Mongoose |
| Authentication | JSON Web Tokens, bcrypt |
| Validation | Zod |
| Queue | Redis, BullMQ |
| AI | Google Gemini through `@google/genai` |
| Email | Nodemailer |
| Security | Helmet, CORS |
| Logging | Pino, Morgan |

## Prerequisites

- Node.js 18 or newer
- npm
- MongoDB or a MongoDB Atlas connection
- Redis, for background catering job processing
- Optional: Google Gemini API credentials
- Optional: SMTP credentials for email delivery

## Quick Start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the local environment file:

   ```bash
   cp .env.example .env
   ```

3. Configure the required values:

   ```env
   MONGODB_URL=mongodb://127.0.0.1:27017/nxt_rail
   JWT_SECRET=<use-a-long-random-secret>
   REDIS_URI=redis://127.0.0.1:6379
   CORS_ORIGIN=http://localhost:3000
   ```

   `MONGODB_URL` and `JWT_SECRET` are required. Redis is needed for the BullMQ catering worker. One or more comma-separated origins may be supplied in `CORS_ORIGIN`.

4. Start Redis and MongoDB locally, or point the variables at hosted services.

5. Start the API:

   ```bash
   npm run dev
   ```

The API listens on `http://localhost:5001` by default. Change `PORT` in `.env` if needed.

## Environment Variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `MONGODB_URL` | Yes | None | MongoDB connection string |
| `JWT_SECRET` | Yes | None | JWT signing and verification secret |
| `NODE_ENV` | No | `development` | Runtime mode and request logging |
| `PORT` | No | `5000` | HTTP server port |
| `LOG_LEVEL` | No | Environment-dependent | Pino log level |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Comma-separated allowed browser origins |
| `REDIS_URI` | Worker only | None | Redis connection string for BullMQ |
| `GEMINI_API_KEY` | AI only | None | Google Gemini API key |
| `GEMINI_MODEL` | AI only | None | Gemini model identifier |
| `SMTP_HOST` | Email only | None | SMTP server |
| `SMTP_PORT` | Email only | None | SMTP port |
| `SMTP_USER` | Email only | None | SMTP username |
| `SMTP_PASS` | Email only | None | SMTP password |
| `EMAIL_FROM` | Email only | None | Sender address and display name |

Use a strong, unique `JWT_SECRET` in production. Never commit populated `.env` files or credentials.

## API Areas

| Base path | Responsibility |
| --- | --- |
| `/api/auth` | Registration, login, current user, and account updates |
| `/api/trains` | Search, live status, schedules, and train operations |
| `/api/bookings` | Booking, PNR lookup, history, cancellation, and payments |
| `/api/stations` | Station search and station management |
| `/api/journeys` | Journey and seat availability |
| `/api/admin` | Dashboard, inventory, and bulk train status |
| `/api/catering` | Catering vendors, menus, orders, and delays |
| `/api/cabs` | Cab vendors and cab bookings |
| `/api/hotels` | Hotel and retiring-room listings and bookings |
| `/api/ai-concierge` | Authenticated Gemini travel assistance |

## Health Checks

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health/live` | Process liveness |
| `GET /api/health/ready` | Database readiness |
| `GET /api/health` | General service status |

## AI Concierge

Send an authenticated request to the concierge:

```text
POST /api/ai-concierge/chat
Authorization: Bearer <JWT>
Content-Type: application/json
```

```json
{
  "pnr": "4534220799",
  "messages": [
    {
      "role": "user",
      "content": "Show E-catering options at my next station"
    }
  ]
}
```

The concierge uses bounded function tools for PNR context, station catering, cab estimates, hotel lookup, and confirmed bookings. Cab estimates use railway-station coordinates and OpenStreetMap/Nominatim geocoding. If geocoding is unavailable, the existing fallback estimate is used.

Booking tools must not execute until the response identifies the exact service and total and the user explicitly confirms it. Model and tool calls are capped per request.

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Start the API with Node.js |
| `npm run dev` | Start the API with Nodemon |

There is currently no automated test script. `npm test` should not be used as a CI check until test coverage is implemented.

## Database Seeding

The [`scripts/`](./scripts) directory contains Python utilities for importing stations and trains. Review [scripts/README.md](./scripts/README.md) before running them.

## Production Considerations

- Set `NODE_ENV=production`, `PORT`, and `CORS_ORIGIN` for the deployment environment.
- Use a managed MongoDB deployment and Redis instance.
- Store secrets in a secret manager rather than a repository or deployment configuration file.
- Terminate TLS at the reverse proxy or platform load balancer.
- Restrict CORS origins to the deployed frontend origin.
- Configure SMTP only when email is enabled.
