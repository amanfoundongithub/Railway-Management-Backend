import requests
import time

# --- CONFIGURATION ---
API_URL = "http://localhost:5001/api/stations"
# Replace with a valid admin JWT token from your login endpoint
AUTH_TOKEN = "your_admin_jwt_token_here"  # Replace with your real token

HEADERS = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type": "application/json"
}

# --- DATA: 50 Real Indian Railway Stations ---
stations = [
    {"stationCode": "NDLS", "stationName": "New Delhi", "zone": "NR", "state": "Delhi", "numberOfPlatforms": 16},
    {"stationCode": "CSMT", "stationName": "Chhatrapati Shivaji Maharaj Terminus", "zone": "CR", "state": "Maharashtra", "numberOfPlatforms": 18},
    {"stationCode": "HWH", "stationName": "Howrah Junction", "zone": "ER", "state": "West Bengal", "numberOfPlatforms": 23},
    {"stationCode": "MAS", "stationName": "Chennai Central", "zone": "SR", "state": "Tamil Nadu", "numberOfPlatforms": 15},
    {"stationCode": "SC", "stationName": "Secunderabad Junction", "zone": "SCR", "state": "Telangana", "numberOfPlatforms": 10},
    {"stationCode": "BCT", "stationName": "Mumbai Central", "zone": "WR", "state": "Maharashtra", "numberOfPlatforms": 9},
    {"stationCode": "SBC", "stationName": "KSR Bengaluru", "zone": "SWR", "state": "Karnataka", "numberOfPlatforms": 10},
    {"stationCode": "PNBE", "stationName": "Patna Junction", "zone": "ECR", "state": "Bihar", "numberOfPlatforms": 10},
    {"stationCode": "LKO", "stationName": "Lucknow NR", "zone": "NR", "state": "Uttar Pradesh", "numberOfPlatforms": 9},
    {"stationCode": "ADI", "stationName": "Ahmedabad Junction", "zone": "WR", "state": "Gujarat", "numberOfPlatforms": 12},
    {"stationCode": "CNB", "stationName": "Kanpur Central", "zone": "NCR", "state": "Uttar Pradesh", "numberOfPlatforms": 9},
    {"stationCode": "BPL", "stationName": "Bhopal Junction", "zone": "WCR", "state": "Madhya Pradesh", "numberOfPlatforms": 6},
    {"stationCode": "JP", "stationName": "Jaipur Junction", "zone": "NWR", "state": "Rajasthan", "numberOfPlatforms": 7},
    {"stationCode": "NGP", "stationName": "Nagpur Junction", "zone": "CR", "state": "Maharashtra", "numberOfPlatforms": 8},
    {"stationCode": "GHY", "stationName": "Guwahati", "zone": "NFR", "state": "Assam", "numberOfPlatforms": 7},
    {"stationCode": "BBS", "stationName": "Bhubaneswar", "zone": "ECoR", "state": "Odisha", "numberOfPlatforms": 6},
    {"stationCode": "CBE", "stationName": "Coimbatore Junction", "zone": "SR", "state": "Tamil Nadu", "numberOfPlatforms": 6},
    {"stationCode": "TVC", "stationName": "Thiruvananthapuram Central", "zone": "SR", "state": "Kerala", "numberOfPlatforms": 5},
    {"stationCode": "VSKP", "stationName": "Visakhapatnam Junction", "zone": "ECoR", "state": "Andhra Pradesh", "numberOfPlatforms": 8},
    {"stationCode": "BSB", "stationName": "Varanasi Junction", "zone": "NR", "state": "Uttar Pradesh", "numberOfPlatforms": 9},
    {"stationCode": "PRYJ", "stationName": "Prayagraj Junction", "zone": "NCR", "state": "Uttar Pradesh", "numberOfPlatforms": 10},
    {"stationCode": "CDG", "stationName": "Chandigarh Junction", "zone": "NR", "state": "Chandigarh", "numberOfPlatforms": 6},
    {"stationCode": "LDH", "stationName": "Ludhiana Junction", "zone": "NR", "state": "Punjab", "numberOfPlatforms": 7},
    {"stationCode": "DNR", "stationName": "Danapur", "zone": "ECR", "state": "Bihar", "numberOfPlatforms": 6},
    {"stationCode": "RNC", "stationName": "Ranchi Junction", "zone": "SER", "state": "Jharkhand", "numberOfPlatforms": 6},
    {"stationCode": "GKP", "stationName": "Gorakhpur Junction", "zone": "NER", "state": "Uttar Pradesh", "numberOfPlatforms": 10},
    {"stationCode": "AGC", "stationName": "Agra Cantt", "zone": "NCR", "state": "Uttar Pradesh", "numberOfPlatforms": 6},
    {"stationCode": "JAT", "stationName": "Jammu Tawi", "zone": "NR", "state": "Jammu and Kashmir", "numberOfPlatforms": 3},
    {"stationCode": "YPR", "stationName": "Yesvantpur Junction", "zone": "SWR", "state": "Karnataka", "numberOfPlatforms": 6},
    {"stationCode": "ERS", "stationName": "Ernakulam Junction", "zone": "SR", "state": "Kerala", "numberOfPlatforms": 6},
    {"stationCode": "BZA", "stationName": "Vijayawada Junction", "zone": "SCR", "state": "Andhra Pradesh", "numberOfPlatforms": 10},
    {"stationCode": "UBL", "stationName": "SSS Hubballi Junction", "zone": "SWR", "state": "Karnataka", "numberOfPlatforms": 8},
    {"stationCode": "MYS", "stationName": "Mysuru Junction", "zone": "SWR", "state": "Karnataka", "numberOfPlatforms": 6},
    {"stationCode": "PUNE", "stationName": "Pune Junction", "zone": "CR", "state": "Maharashtra", "numberOfPlatforms": 6},
    {"stationCode": "ST", "stationName": "Surat", "zone": "WR", "state": "Gujarat", "numberOfPlatforms": 4},
    {"stationCode": "BRC", "stationName": "Vadodara Junction", "zone": "WR", "state": "Gujarat", "numberOfPlatforms": 7},
    {"stationCode": "RTM", "stationName": "Ratlam Junction", "zone": "WR", "state": "Madhya Pradesh", "numberOfPlatforms": 7},
    {"stationCode": "JBP", "stationName": "Jabalpur Junction", "zone": "WCR", "state": "Madhya Pradesh", "numberOfPlatforms": 6},
    {"stationCode": "KGP", "stationName": "Kharagpur Junction", "zone": "SER", "state": "West Bengal", "numberOfPlatforms": 12},
    {"stationCode": "ASN", "stationName": "Asansol Junction", "zone": "ER", "state": "West Bengal", "numberOfPlatforms": 7},
    {"stationCode": "SDAH", "stationName": "Sealdah", "zone": "ER", "state": "West Bengal", "numberOfPlatforms": 21},
    {"stationCode": "TATA", "stationName": "Tatanagar Junction", "zone": "SER", "state": "Jharkhand", "numberOfPlatforms": 5},
    {"stationCode": "BSP", "stationName": "Bilaspur Junction", "zone": "SECR", "state": "Chhattisgarh", "numberOfPlatforms": 8},
    {"stationCode": "RPR", "stationName": "Raipur Junction", "zone": "SECR", "state": "Chhattisgarh", "numberOfPlatforms": 7},
    {"stationCode": "JU", "stationName": "Jodhpur", "zone": "NWR", "state": "Rajasthan", "numberOfPlatforms": 5},
    {"stationCode": "AII", "stationName": "Ajmer Junction", "zone": "NWR", "state": "Rajasthan", "numberOfPlatforms": 6},
    {"stationCode": "MDU", "stationName": "Madurai Junction", "zone": "SR", "state": "Tamil Nadu", "numberOfPlatforms": 6},
    {"stationCode": "TPJ", "stationName": "Tiruchchirappalli Junction", "zone": "SR", "state": "Tamil Nadu", "numberOfPlatforms": 7},
    {"stationCode": "MAQ", "stationName": "Mangaluru Central", "zone": "SR", "state": "Karnataka", "numberOfPlatforms": 4},
    {"stationCode": "GTL", "stationName": "Guntakal Junction", "zone": "SCR", "state": "Andhra Pradesh", "numberOfPlatforms": 6}
]

# --- EXECUTION ---
def populate_stations():
    success_count = 0
    failure_count = 0

    print(f"Starting creation of {len(stations)} stations...\n")

    for idx, station in enumerate(stations, 1):
        try:
            response = requests.post(API_URL, json=station, headers=HEADERS)
            
            # Check if creation was successful (Assuming 201 Created or 200 OK)
            if response.status_code in [200, 201]:
                print(f"[{idx}/{len(stations)}] SUCCESS: Created {station['stationCode']} - {station['stationName']}")
                success_count += 1
            else:
                print(f"[{idx}/{len(stations)}] FAILED: {station['stationCode']} - Status: {response.status_code} - Msg: {response.text}")
                failure_count += 1
                
        except requests.exceptions.RequestException as e:
            print(f"[{idx}/{len(stations)}] ERROR: Network issue with {station['stationCode']} - {e}")
            failure_count += 1
        
        # Small delay to prevent overwhelming the local Node server
        time.sleep(0.1)

    print("\n--- SUMMARY ---")
    print(f"Total Attempted: {len(stations)}")
    print(f"Successfully Created: {success_count}")
    print(f"Failed: {failure_count}")

if __name__ == "__main__":
    if AUTH_TOKEN == "your_admin_jwt_token_here":
        print("ERROR: Please replace the AUTH_TOKEN in the script with your actual admin JWT.")
    else:
        populate_stations()