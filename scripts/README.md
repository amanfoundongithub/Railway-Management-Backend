# Database Seed Scripts

Utility scripts for populating MongoDB with station and train records through the running NXT_RAIL API.

## Available Scripts

| Script | Purpose |
| --- | --- |
| `make_stations.py` | Creates the station records used by train routes and station services. |
| `update_stations_cordinates.py` | Adds latitude and longitude to the seeded stations for map and cab-distance features. |
| `make_trains.py` | Creates train records, routes, stops, and coach configuration. |
| `make_vendors.py` | Creates E-catering vendors and their menus for supported stations. |
| `make_cabs.py` | Creates cab vendors and vehicle/fare options for supported stations. |
| `make_hotels.py` | Creates station hotels, retiring rooms, and dormitory options. |

These scripts send data to the running API; they do not write directly to MongoDB.

Review and adjust the source data in each script before importing it.

## Prerequisites

- Python 3
- A running NXT_RAIL backend
- An authenticated administrator account
- Dependencies from `requirements.txt`

## Setup

From the backend project root:

```bash
cd scripts
python3 -m venv .venv

# macOS/Linux
source .venv/bin/activate

# Windows
.venv\Scripts\activate

python -m pip install -r requirements.txt
```

## Create an Administrator Token

Log in through the API:

```text
POST http://localhost:5001/api/auth/login
Content-Type: application/json
```

```json
{
  "email": "<administrator-email>",
  "password": "<administrator-password>"
}
```

The response contains a JWT:

```json
{
  "status": "success",
  "token": "<jwt-token>",
  "data": {
    "user": {}
  }
}
```

Set the returned token as `AUTH_TOKEN` in each script before running it. Do not commit a real token.

## Run All Scripts

From the `scripts` directory, run the scripts in this order. The station records must exist before coordinates and station-based services are added; seed stations before trains so routes can refer to them.

```bash
# Create the stations
python make_stations.py

# Add station coordinates
python update_stations_cordinates.py

# Create train routes and coach data
python make_trains.py

# Add station-based services
python make_vendors.py
python make_cabs.py
python make_hotels.py
```

Each script reports successful and failed API requests. Review the output before proceeding to the next script. These scripts create records, so avoid rerunning them against a database that already contains the same seed data unless duplicate behavior is understood.

## Safety

- The scripts make live API requests; verify each `API_URL` points to the intended environment.
- Start with a development database.
- Do not store real JWTs or credentials in committed source files.
- Existing or duplicate records may be rejected or updated depending on the API implementation.
