import requests
import time
import random

# --- CONFIGURATION ---
API_URL = "http://localhost:5001/api/cabs/vendors"
AUTH_TOKEN = "your_admin_jwt_token_here"  # Replace with a valid admin JWT token

HEADERS = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type": "application/json"
}

STATION_CODES = [
    "NDLS", "CSMT", "HWH", "MAS", "SC", "BCT", "SBC", "PNBE", "LKO", "ADI",
    "CNB", "BPL", "JP", "NGP", "GHY", "BBS", "CBE", "TVC", "VSKP", "BSB",
    "PRYJ", "CDG", "LDH", "DNR", "RNC", "GKP", "AGC", "JAT", "YPR", "ERS",
    "BZA", "UBL", "MYS", "PUNE", "ST", "BRC", "RTM", "JBP", "KGP", "ASN",
    "SDAH", "TATA", "BSP", "RPR", "JU", "AII", "MDU", "TPJ", "MAQ", "GTL"
]

# Diverse cab operator profiles to populate realistic choices per station
CAB_OPERATOR_TEMPLATES = [
    {
        "name": "Station Express Cabs",
        "vehicles": [
            {"type": "Hatchback", "pricePerKm": 12, "baseFare": 80, "capacity": 4},
            {"type": "Sedan", "pricePerKm": 15, "baseFare": 120, "capacity": 4},
            {"type": "SUV", "pricePerKm": 22, "baseFare": 200, "capacity": 7},
            {"type": "Auto", "pricePerKm": 9, "baseFare": 50, "capacity": 3}
        ]
    },
    {
        "name": "RailYatri Transit Cabs",
        "vehicles": [
            {"type": "Sedan", "pricePerKm": 14, "baseFare": 110, "capacity": 4},
            {"type": "SUV", "pricePerKm": 20, "baseFare": 180, "capacity": 6},
            {"type": "Auto", "pricePerKm": 10, "baseFare": 60, "capacity": 3}
        ]
    },
    {
        "name": "Platform 1 Auto & Cab Fleet",
        "vehicles": [
            {"type": "Hatchback", "pricePerKm": 11, "baseFare": 75, "capacity": 4},
            {"type": "Auto", "pricePerKm": 8, "baseFare": 45, "capacity": 3}
        ]
    }
]

def seed_cabs():
    success_count = 0
    failure_count = 0
    
    print(f"=== Starting Full Database Population: Cab Vendors ({len(STATION_CODES)} Stations) ===\n")

    for idx, station in enumerate(STATION_CODES, 1):
        # Assign 2 distinct cab vendor fleets to each station to fully saturate the DB
        chosen_templates = random.sample(CAB_OPERATOR_TEMPLATES, 2)
        
        for template in chosen_templates:
            payload = {
                "name": f"{station} - {template['name']}",
                "stationCode": station,
                "rating": round(random.uniform(4.0, 4.9), 1),
                "vehicles": template["vehicles"]
            }
            
            try:
                res = requests.post(API_URL, json=payload, headers=HEADERS)
                if res.status_code in [200, 201]:
                    success_count += 1
                    print(f"[{success_count}] SUCCESS: Created '{payload['name']}'")
                else:
                    failure_count += 1
                    print(f"[FAILED] Station {station} | Status: {res.status_code} | Msg: {res.text}")
            except requests.exceptions.RequestException as e:
                failure_count += 1
                print(f"[ERROR] Network exception for station {station}: {e}")
            
            time.sleep(0.05) # Prevent flooding the local server socket

    print("\n=== CAB SEEDING SUMMARY ===")
    print(f"Successfully Created: {success_count}")
    print(f"Failures / Errors: {failure_count}")

if __name__ == "__main__":
    if AUTH_TOKEN == "your_admin_jwt_token_here":
        print("ERROR: Please replace 'your_admin_jwt_token_here' with a valid admin JWT token.")
    else:
        seed_cabs()