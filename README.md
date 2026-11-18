# Railway Management Backend

This is the backend for Railway Management, a full-stack railway reservation and operations platform. The frontend for this project is available [here](https://github.com/amanfoundongithub/Railway-Management-Frontend).

This project is built with `Express.js`, a lightweight Node.js framework for rapid backend development, and is designed to power the frontend booking, auth, ticketing, and admin workflows.

## Overview

The backend exposes REST APIs for handling railway operations such as user registration, login, train search, booking creation, ticket lookup, cancellations, status checks, and admin management.

## Key Features

- User authentication and JWT-based authorization
- Train search and availability APIs
- Passenger booking and reservation creation
- PNR-based booking lookup and status retrieval
- Booking cancellation and refund-related flows
- Ticket history access for authenticated users
- Admin APIs for train inventory and operational management
- MongoDB-backed persistence for users, bookings, and railway data
- Authenticated NXT_RAIL AI Concierge powered by Google Gemini
- PNR-aware travel assistance for E-catering, cabs, and station hotels
- Agent-style function tools for live vendor lookup and fare estimation
- Confirmed-only cab, hotel, and food booking execution

## AI Concierge

The backend exposes an authenticated Gemini chat endpoint:

```text
POST /api/ai-concierge/chat
Authorization: Bearer <JWT>
Content-Type: application/json
```

Example body:

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

The concierge can use these function tools:

| Tool | Purpose |
| --- | --- |
| `get_pnr_context` | Resolve a PNR, booking, train route, stops, and booking ID |
| `get_station_food_vendors` | List station catering vendors and menus |
| `book_station_food` | Place a catering order after explicit confirmation |
| `get_station_cabs_and_estimate` | List station cab vendors and estimate distance and fare |
| `book_station_cab` | Create a confirmed cab booking |
| `get_station_hotels` | List station hotels and retiring rooms |
| `book_station_hotel` | Create a confirmed hotel or room reservation |

Cab distance estimates use the railway station coordinates and OpenStreetMap/Nominatim geocoding. The current implementation falls back to a 10 km estimate when geocoding is unavailable. Tool execution is limited to five model/tool loops per chat request.

Booking tools create database records only after the Gemini conversation has presented the exact selection and total and the user has explicitly confirmed it.

## How To Run?

To run this project, you need to have Node.js and npm installed. Once available on your local machine, running the project is straightforward.

For a first run, you need to install the project dependencies:

```bash
npm install
```

You also need to configure local environment variables. Create a `.env` file in the project root based on your `.env.example` and add the required values:

```text
MONGODB_URL = the URL for the MongoDB cluster
JWT_SECRET  = the JWT secret used for authentication
GEMINI_API_KEY = your Google Gemini API key
GEMINI_MODEL = the Gemini model identifier, for example gemini-3.1-pro-preview
```

Once dependencies are installed and the environment is configured, start the server with:

```bash
npm run dev
```

This will run the backend in development mode. By default, it listens on port `5001`, though this can be changed in the `.env` file.

## Related Project

- Frontend: [Railway Management Frontend](https://github.com/amanfoundongithub/Railway-Management-Frontend)
