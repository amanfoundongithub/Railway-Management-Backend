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
```

Once dependencies are installed and the environment is configured, start the server with:

```bash
npm run dev
```

This will run the backend in development mode. By default, it listens on port `5001`, though this can be changed in the `.env` file.

## Related Project

- Frontend: [Railway Management Frontend](https://github.com/amanfoundongithub/Railway-Management-Frontend)
