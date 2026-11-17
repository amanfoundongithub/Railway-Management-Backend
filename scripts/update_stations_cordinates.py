import requests
import time

# --- CONFIGURATION ---
API_URL = "http://localhost:5001/api/stations"
# Replace with a valid admin JWT token from your login endpoint
AUTH_TOKEN = "your_admin_jwt_token_here"

HEADERS = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type": "application/json"
}

# --- DATA: Coordinates for all 50 Real Indian Railway Stations ---
station_coordinates = [
    {"stationCode": "NDLS", "lat": 28.6415, "lng": 77.2208},
    {"stationCode": "CSMT", "lat": 18.9398, "lng": 72.8355},
    {"stationCode": "HWH", "lat": 22.5839, "lng": 88.3426},
    {"stationCode": "MAS", "lat": 13.0827, "lng": 80.2750},
    {"stationCode": "SC", "lat": 17.4337, "lng": 78.5015},
    {"stationCode": "BCT", "lat": 18.9696, "lng": 72.8193},
    {"stationCode": "SBC", "lat": 12.9781, "lng": 77.5697},
    {"stationCode": "PNBE", "lat": 25.6022, "lng": 85.1376},
    {"stationCode": "LKO", "lat": 26.8318, "lng": 80.9191},
    {"stationCode": "ADI", "lat": 23.0264, "lng": 72.6015},
    {"stationCode": "CNB", "lat": 26.4539, "lng": 80.3512},
    {"stationCode": "BPL", "lat": 23.2675, "lng": 77.4143},
    {"stationCode": "JP", "lat": 26.9196, "lng": 75.7880},
    {"stationCode": "NGP", "lat": 21.1523, "lng": 79.0886},
    {"stationCode": "GHY", "lat": 26.1822, "lng": 91.7510},
    {"stationCode": "BBS", "lat": 20.2665, "lng": 85.8436},
    {"stationCode": "CBE", "lat": 10.9965, "lng": 76.9669},
    {"stationCode": "TVC", "lat": 8.4870, "lng": 76.9525},
    {"stationCode": "VSKP", "lat": 17.7222, "lng": 83.2897},
    {"stationCode": "BSB", "lat": 25.3273, "lng": 82.9860},
    {"stationCode": "PRYJ", "lat": 25.4457, "lng": 81.8290},
    {"stationCode": "CDG", "lat": 30.7016, "lng": 76.8217},
    {"stationCode": "LDH", "lat": 30.9126, "lng": 75.8482},
    {"stationCode": "DNR", "lat": 25.5818, "lng": 85.0436},
    {"stationCode": "RNC", "lat": 23.3496, "lng": 85.3356},
    {"stationCode": "GKP", "lat": 26.7599, "lng": 83.3813},
    {"stationCode": "AGC", "lat": 27.1578, "lng": 77.9899},
    {"stationCode": "JAT", "lat": 32.7064, "lng": 74.8801},
    {"stationCode": "YPR", "lat": 13.0238, "lng": 77.5517},
    {"stationCode": "ERS", "lat": 9.9691, "lng": 76.2909},
    {"stationCode": "BZA", "lat": 16.5186, "lng": 80.6199},
    {"stationCode": "UBL", "lat": 15.3446, "lng": 75.1506},
    {"stationCode": "MYS", "lat": 12.3133, "lng": 76.6457},
    {"stationCode": "PUNE", "lat": 18.5289, "lng": 73.8744},
    {"stationCode": "ST", "lat": 21.2049, "lng": 72.8411},
    {"stationCode": "BRC", "lat": 22.3106, "lng": 73.1812},
    {"stationCode": "RTM", "lat": 23.3374, "lng": 75.0445},
    {"stationCode": "JBP", "lat": 23.1651, "lng": 79.9515},
    {"stationCode": "KGP", "lat": 22.3402, "lng": 87.3249},
    {"stationCode": "ASN", "lat": 23.6934, "lng": 86.9746},
    {"stationCode": "SDAH", "lat": 22.5674, "lng": 88.3708},
    {"stationCode": "TATA", "lat": 22.7712, "lng": 86.1950},
    {"stationCode": "BSP", "lat": 22.0574, "lng": 82.1709},
    {"stationCode": "RPR", "lat": 21.2569, "lng": 81.6295},
    {"stationCode": "JU", "lat": 26.2838, "lng": 73.0227},
    {"stationCode": "AII", "lat": 26.4563, "lng": 74.6393},
    {"stationCode": "MDU", "lat": 9.9209, "lng": 78.1103},
    {"stationCode": "TPJ", "lat": 10.7937, "lng": 78.6852},
    {"stationCode": "MAQ", "lat": 12.8634, "lng": 74.8427},
    {"stationCode": "GTL", "lat": 15.1726, "lng": 77.3670}
]

# --- EXECUTION ---
def update_coordinates():
    success_count = 0
    failure_count = 0

    print(f"Starting coordinate updates for {len(station_coordinates)} stations...\n")

    for idx, item in enumerate(station_coordinates, 1):
        code = item["stationCode"]
        endpoint = f"{API_URL}/{code}/coordinates"
        payload = {
            "lat": item["lat"],
            "lng": item["lng"]
        }

        try:
            response = requests.patch(endpoint, json=payload, headers=HEADERS)
            
            if response.status_code in [200, 201]:
                print(f"[{idx}/{len(station_coordinates)}] SUCCESS: Updated {code} -> ({item['lat']}, {item['lng']})")
                success_count += 1
            else:
                print(f"[{idx}/{len(station_coordinates)}] FAILED: {code} | Status: {response.status_code} | Msg: {response.text}")
                failure_count += 1
                
        except requests.exceptions.RequestException as e:
            print(f"[{idx}/{len(station_coordinates)}] ERROR: Network issue with {code} -> {e}")
            failure_count += 1
        
        time.sleep(0.05)

    print("\n--- SUMMARY ---")
    print(f"Total Attempted: {len(station_coordinates)}")
    print(f"Successfully Updated: {success_count}")
    print(f"Failed: {failure_count}")

if __name__ == "__main__":
    if AUTH_TOKEN == "your_admin_jwt_token_here":
        print("ERROR: Please replace the AUTH_TOKEN in the script with your actual admin JWT.")
    else:
        update_coordinates()