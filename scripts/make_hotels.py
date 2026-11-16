import requests
import time
import random

# --- CONFIGURATION ---
API_URL = "http://localhost:5001/api/hotels"
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

# Comprehensive variations of retiring rooms, dormitories, and station hotels
HOTEL_TEMPLATES = [
    {
        "name": "Official Station Retiring Room (AC)",
        "type": "RETIRING_ROOM",
        "pricePerNight": 750,
        "totalRooms": 15,
        "amenities": ["Air Conditioning", "Attached Bathroom", "Free Wi-Fi", "Room Service", "Hot Water"]
    },
    {
        "name": "Rail Yatri Multi-Bed Dormitory",
        "type": "DORMITORY",
        "pricePerNight": 250,
        "totalRooms": 50,
        "amenities": ["Locker Facility", "Common Washroom", "Charging Station", "Drinking Water"]
    },
    {
        "name": "Platform Executive AC Suite",
        "type": "AC_ROOM",
        "pricePerNight": 1400,
        "totalRooms": 10,
        "amenities": ["King Size Bed", "AC", "LED TV", "Free Wi-Fi", "Complimentary Breakfast", "Attached Bathroom"]
    },
    {
        "name": "Station Deluxe Lodge & Hotel",
        "type": "DELUXE_HOTEL",
        "pricePerNight": 2200,
        "totalRooms": 20,
        "amenities": ["24/7 Front Desk", "AC", "Restaurant Access", "Laundry Service", "CCTV Security"]
    }
]

def seed_hotels():
    success_count = 0
    failure_count = 0
    
    print(f"=== Starting Full Database Population: Station Hotels & Rooms ({len(STATION_CODES)} Stations) ===\n")

    for idx, station in enumerate(STATION_CODES, 1):
        # Fully populate all 4 inventory tiers for every single station in the database
        for template in HOTEL_TEMPLATES:
            payload = {
                "name": f"{station} - {template['name']}",
                "stationCode": station,
                "type": template["type"],
                "pricePerNight": template["pricePerNight"],
                "totalRooms": template["totalRooms"],
                "availableRooms": template["totalRooms"], # Reset available rooms to match total on creation
                "amenities": template["amenities"],
                "rating": round(random.uniform(3.8, 4.8), 1)
            }
            
            try:
                res = requests.post(API_URL, json=payload, headers=HEADERS)
                if res.status_code in [200, 201]:
                    success_count += 1
                    print(f"[{success_count}] SUCCESS: Created '{payload['name']}'")
                else:
                    failure_count += 1
                    print(f"[FAILED] Station {station} ({template['type']}) | Status: {res.status_code} | Msg: {res.text}")
            except requests.exceptions.RequestException as e:
                failure_count += 1
                print(f"[ERROR] Network exception for station {station}: {e}")
            
            time.sleep(0.05)

    print("\n=== HOTEL SEEDING SUMMARY ===")
    print(f"Successfully Created: {success_count}")
    print(f"Failures / Errors: {failure_count}")

if __name__ == "__main__":
    if AUTH_TOKEN == "your_admin_jwt_token_here":
        print("ERROR: Please replace 'your_admin_jwt_token_here' with a valid admin JWT token.")
    else:
        seed_hotels()