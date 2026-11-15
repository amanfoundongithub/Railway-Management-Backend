import requests
import time

# --- CONFIGURATION ---
API_URL = "your_admin_jwt_token_here"
AUTH_TOKEN = "<Add your admin auth token>"  # Replace with your real token

HEADERS = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type": "application/json"
}

# --- STATION DICTIONARY (From previous list) ---
stations_map = {
    "NDLS": "New Delhi", "CSMT": "Chhatrapati Shivaji Maharaj Terminus", "HWH": "Howrah Junction",
    "MAS": "Chennai Central", "SC": "Secunderabad Junction", "BCT": "Mumbai Central",
    "SBC": "KSR Bengaluru", "PNBE": "Patna Junction", "LKO": "Lucknow NR",
    "ADI": "Ahmedabad Junction", "CNB": "Kanpur Central", "BPL": "Bhopal Junction",
    "JP": "Jaipur Junction", "NGP": "Nagpur Junction", "GHY": "Guwahati",
    "BBS": "Bhubaneswar", "CBE": "Coimbatore Junction", "TVC": "Thiruvananthapuram Central",
    "VSKP": "Visakhapatnam Junction", "BSB": "Varanasi Junction", "PRYJ": "Prayagraj Junction",
    "CDG": "Chandigarh Junction", "DNR": "Danapur", "GKP": "Gorakhpur Junction",
    "AGC": "Agra Cantt", "YPR": "Yesvantpur Junction", "ERS": "Ernakulam Junction",
    "BZA": "Vijayawada Junction", "UBL": "SSS Hubballi Junction", "MYS": "Mysuru Junction",
    "PUNE": "Pune Junction", "ST": "Surat", "BRC": "Vadodara Junction", "RTM": "Ratlam Junction",
    "JBP": "Jabalpur Junction", "KGP": "Kharagpur Junction", "ASN": "Asansol Junction",
    "TATA": "Tatanagar Junction", "BSP": "Bilaspur Junction", "R": "Raipur Junction",
    "JU": "Jodhpur", "AII": "Ajmer Junction"
}

# --- CLASS CONFIGURATIONS ---
rajdhani_classes = [
    {"classType": "1A", "totalSeats": 24, "baseFare": 4500},
    {"classType": "2A", "totalSeats": 100, "baseFare": 3000},
    {"classType": "3A", "totalSeats": 144, "baseFare": 2000}
]

shatabdi_classes = [
    {"classType": "CC", "totalSeats": 300, "baseFare": 1200},
    {"classType": "2S", "totalSeats": 108, "baseFare": 800}
]

express_classes = [
    {"classType": "2A", "totalSeats": 50, "baseFare": 2500},
    {"classType": "3A", "totalSeats": 144, "baseFare": 1500},
    {"classType": "SL", "totalSeats": 360, "baseFare": 600},
    {"classType": "UR", "totalSeats": 200, "baseFare": 200}
]

# --- 50 REAL ROUTES COMPACT DEFINITION ---
# Format: "StationCode|ArrivalTime|Distance|DayCounter"
raw_trains = [
    # 1. Rajdhani Corridor
    ("12951", "Mumbai Rajdhani Exp", "BCT", "NDLS", "BCT|17:00|0|1, ST|19:43|263|1, BRC|21:06|393|1, RTM|00:25|654|2, NDLS|08:32|1386|2"),
    ("12952", "Mumbai Rajdhani Down", "NDLS", "BCT", "NDLS|16:55|0|1, RTM|00:28|732|2, BRC|03:40|993|2, ST|05:13|1123|2, BCT|08:35|1386|2"),
    ("12301", "Howrah Rajdhani Exp", "HWH", "NDLS", "HWH|16:50|0|1, ASN|18:57|200|1, CNB|04:50|1000|2, NDLS|10:05|1450|2"),
    ("12302", "Howrah Rajdhani Down", "NDLS", "HWH", "NDLS|16:50|0|1, CNB|21:32|450|1, ASN|07:35|1250|2, HWH|09:55|1450|2"),
    
    # 2. Shatabdi Corridor (Short/Day trains)
    ("12002", "Bhopal Shatabdi Exp", "NDLS", "BPL", "NDLS|06:00|0|1, AGC|07:50|195|1, BPL|14:05|700|1"),
    ("12001", "Bhopal Shatabdi Up", "BPL", "NDLS", "BPL|15:00|0|1, AGC|21:10|505|1, NDLS|23:30|700|1"),
    ("12011", "Kalka Shatabdi", "NDLS", "CDG", "NDLS|07:40|0|1, CDG|10:55|266|1"),
    ("12012", "Kalka Shatabdi Up", "CDG", "NDLS", "CDG|18:23|0|1, NDLS|21:30|266|1"),

    # 3. Superfast Long Distance
    ("12841", "Coromandel Express", "HWH", "MAS", "HWH|15:30|0|1, KGP|17:20|115|1, BBS|21:15|437|1, VSKP|02:50|881|2, BZA|08:10|1231|2, MAS|15:00|1662|2"),
    ("12842", "Coromandel Exp Down", "MAS", "HWH", "MAS|07:00|0|1, BZA|13:10|431|1, VSKP|19:40|781|1, BBS|01:15|1225|2, KGP|05:05|1547|2, HWH|07:15|1662|2"),
    ("12627", "Karnataka Express", "SBC", "NDLS", "SBC|19:20|0|1, YPR|19:30|6|1, PUNE|10:45|924|2, BPL|02:15|1823|3, AGC|09:20|2328|3, NDLS|13:30|2523|3"),
    ("12628", "Karnataka Exp Down", "NDLS", "SBC", "NDLS|21:15|0|1, AGC|23:50|195|1, BPL|07:30|700|2, PUNE|20:20|1599|2, YPR|13:00|2517|3, SBC|13:40|2523|3"),
    ("12723", "Telangana Express", "SC", "NDLS", "SC|06:25|0|1, NGP|15:20|575|1, BPL|21:20|965|1, AGC|04:10|1470|2, NDLS|07:40|1665|2"),
    ("12724", "Telangana Exp Down", "NDLS", "SC", "NDLS|16:00|0|1, AGC|18:40|195|1, BPL|01:10|700|2, NGP|07:10|1090|2, SC|15:55|1665|2"),
    ("12615", "Grand Trunk Express", "MAS", "NDLS", "MAS|19:15|0|1, BZA|01:55|431|2, NGP|11:05|1083|2, BPL|17:30|1473|2, AGC|01:15|1978|3, NDLS|06:30|2173|3"),
    ("12616", "Grand Trunk Down", "NDLS", "MAS", "NDLS|16:10|0|1, AGC|18:50|195|1, BPL|02:20|700|2, NGP|08:30|1090|2, BZA|19:00|1742|2, MAS|04:20|2173|3"),
    ("11019", "Konark Express", "CSMT", "BBS", "CSMT|14:00|0|1, PUNE|17:15|190|1, SC|07:40|787|2, BZA|13:55|1136|2, VSKP|20:00|1486|2, BBS|03:15|1930|3"),
    ("11020", "Konark Exp Down", "BBS", "CSMT", "BBS|15:20|0|1, VSKP|22:15|444|1, BZA|04:15|794|2, SC|11:00|1143|2, PUNE|23:40|1740|2, CSMT|03:55|1930|3"),
    
    # 4. High Demand Expresses
    ("12559", "Shiv Ganga Express", "BSB", "NDLS", "BSB|22:15|0|1, PRYJ|00:10|124|2, CNB|03:00|319|2, NDLS|08:30|759|2"),
    ("12560", "Shiv Ganga Down", "NDLS", "BSB", "NDLS|20:05|0|1, CNB|01:45|440|2, PRYJ|04:10|635|2, BSB|07:30|759|2"),
    ("12393", "Sampoorna Kranti", "PNBE", "NDLS", "PNBE|17:35|0|1, DNR|17:45|10|1, CNB|01:45|559|2, NDLS|07:55|999|2"),
    ("12394", "Sampoorna Kranti Down","NDLS", "PNBE", "NDLS|17:30|0|1, CNB|22:36|440|1, DNR|06:25|989|2, PNBE|06:50|999|2"),
    ("12555", "Gorakhdham Express", "GKP", "NDLS", "GKP|16:35|0|1, LKO|21:30|277|1, CNB|23:05|349|1, NDLS|06:05|789|2"),
    ("12556", "Gorakhdham Down", "NDLS", "GKP", "NDLS|21:25|0|1, CNB|04:05|440|2, LKO|05:50|512|2, GKP|11:05|789|2"),
    
    # 5. Intercity & Short Expresses
    ("12607", "Lalbagh Express", "MAS", "SBC", "MAS|15:30|0|1, SBC|21:35|359|1"),
    ("12608", "Lalbagh Exp Down", "SBC", "MAS", "SBC|06:20|0|1, MAS|12:15|359|1"),
    ("12759", "Charminar Express", "MAS", "SC", "MAS|18:10|0|1, SC|08:10|711|2"),
    ("12760", "Charminar Exp Down", "SC", "MAS", "SC|18:25|0|1, MAS|08:00|711|2"),
    ("12933", "Karnavati Express", "BCT", "ADI", "BCT|13:40|0|1, ST|16:55|263|1, BRC|18:40|393|1, ADI|21:15|493|1"),
    ("12934", "Karnavati Exp Down", "ADI", "BCT", "ADI|05:00|0|1, BRC|06:35|100|1, ST|08:15|230|1, BCT|12:20|493|1"),
    ("22995", "Mandore Express", "JU", "NDLS", "JU|20:10|0|1, JP|01:10|311|2, NDLS|07:10|620|2"),
    ("22996", "Mandore Exp Down", "NDLS", "JU", "NDLS|21:20|0|1, JP|02:20|309|2, JU|07:55|620|2"),
    
    # 6. Cross Country Connections
    ("12801", "Purushottam Express", "BBS", "NDLS", "BBS|21:25|0|1, TATA|04:10|442|2, CNB|19:25|1192|2, NDLS|04:00|1632|3"),
    ("12802", "Purushottam Down", "NDLS", "BBS", "NDLS|22:40|0|1, CNB|05:25|440|2, TATA|20:00|1190|2, BBS|02:55|1632|3"),
    ("12859", "Gitanjali Express", "CSMT", "HWH", "CSMT|06:00|0|1, NGP|18:55|833|1, BSP|01:50|1245|2, TATA|08:10|1713|2, HWH|13:05|1962|2"),
    ("12860", "Gitanjali Exp Down", "HWH", "CSMT", "HWH|14:05|0|1, TATA|17:35|249|1, BSP|00:20|717|2, NGP|07:20|1129|2, CSMT|21:20|1962|2"),
    
    # 7. Commuter / Historic
    ("12123", "Deccan Queen", "CSMT", "PUNE", "CSMT|17:10|0|1, PUNE|20:25|190|1"),
    ("12124", "Deccan Queen Up", "PUNE", "CSMT", "PUNE|07:15|0|1, CSMT|10:25|190|1"),
    ("12621", "Tamil Nadu Express", "MAS", "NDLS", "MAS|22:00|0|1, BZA|04:00|431|2, NGP|14:05|1083|2, BPL|20:05|1473|2, AGC|02:50|1978|3, NDLS|06:05|2173|3"),
    ("12622", "Tamil Nadu Exp Down", "NDLS", "MAS", "NDLS|22:30|0|1, AGC|01:05|195|2, BPL|06:40|700|2, NGP|12:45|1090|2, BZA|23:20|1742|2, MAS|07:15|2173|3"),
    
    # 8. Ultra Long Haul
    ("12625", "Kerala Express", "TVC", "NDLS", "TVC|12:20|0|1, ERS|16:45|206|1, CBE|21:20|411|1, BZA|10:20|1210|2, NGP|20:05|1863|2, NDLS|13:30|2953|3"),
    ("12626", "Kerala Exp Down", "NDLS", "TVC", "NDLS|20:10|0|1, NGP|13:10|1090|2, BZA|22:20|1743|2, CBE|11:05|2542|3, ERS|15:40|2747|3, TVC|20:25|2953|3"),
    
    # 9. Medium Range West/South
    ("12656", "Navjeevan Express", "MAS", "ADI", "MAS|10:10|0|1, BZA|16:50|431|1, BRC|16:00|1800|2, ADI|18:00|1900|2"),
    ("12655", "Navjeevan Exp Down", "ADI", "MAS", "ADI|06:20|0|1, BRC|08:15|100|1, BZA|06:30|1469|2, MAS|14:15|1900|2"),
    ("12711", "Pinakini Express", "BZA", "MAS", "BZA|06:00|0|1, MAS|13:00|431|1"),
    ("12712", "Pinakini Exp Down", "MAS", "BZA", "MAS|14:05|0|1, BZA|21:10|431|1"),
    
    # 10. Short Express
    ("22387", "Black Diamond Exp", "HWH", "ASN", "HWH|06:15|0|1, ASN|10:15|200|1"),
    ("22388", "Black Diamond Down", "ASN", "HWH", "ASN|16:20|0|1, HWH|21:20|200|1"),
    ("12279", "Taj Express", "AGC", "NDLS", "AGC|17:30|0|1, NDLS|21:40|195|1"),
    ("12280", "Taj Exp Down", "NDLS", "AGC", "NDLS|07:05|0|1, AGC|09:40|195|1")
]

# --- HELPER PARSER ---
def parse_route_string(route_str):
    """Converts the compact string into the exact JSON array expected by your Node backend."""
    stops = route_str.split(',')
    parsed_route = []
    
    for i, stop in enumerate(stops):
        parts = stop.strip().split('|')
        code, arr_time, distance, day = parts[0], parts[1], int(parts[2]), int(parts[3])
        
        # Calculate departure time (Arrival + 10 mins for intermediate stops)
        dep_time = arr_time
        if i != 0 and i != len(stops) - 1:
            h, m = map(int, arr_time.split(':'))
            m += 10
            if m >= 60:
                h = (h + 1) % 24
                m -= 60
            dep_time = f"{h:02d}:{m:02d}"

        parsed_route.append({
            "stationCode": code,
            "stationName": stations_map[code],
            "arrivalTime": arr_time,
            "departureTime": dep_time,
            "distanceFromSource": distance,
            "dayCounter": day
        })
    return parsed_route

# --- EXECUTION SCRIPT ---
def populate_trains():
    success = 0
    failed = 0

    print(f"Provisioning {len(raw_trains)} trains to NXT_RAIL Backend...\n")

    for idx, (t_num, t_name, src, dst, route_str) in enumerate(raw_trains, 1):
        
        # Assign classes based on Train type
        if "Rajdhani" in t_name:
            coaches = rajdhani_classes
        elif "Shatabdi" in t_name or "Queen" in t_name:
            coaches = shatabdi_classes
        else:
            coaches = express_classes

        # Build payload
        payload = {
            "trainNumber": t_num,
            "trainName": t_name,
            "source": src,
            "destination": dst,
            "route": parse_route_string(route_str),
            "coachClasses": coaches,
            "runningDays": [0, 1, 2, 3, 4, 5, 6] # Runs daily for testing ease
        }

        try:
            response = requests.post(API_URL, json=payload, headers=HEADERS)
            
            if response.status_code in [200, 201]:
                print(f"[{idx}/50] SUCCESS: {t_num} - {t_name}")
                success += 1
            else:
                print(f"[{idx}/50] FAILED: {t_num} - {response.text}")
                failed += 1
        except Exception as e:
            print(f"[{idx}/50] ERROR on {t_num}: {e}")
            failed += 1
            
        time.sleep(0.1) # Small delay to be gentle on the local node server

    print("\n--- PROVISIONING SUMMARY ---")
    print(f"Total Trains: 50")
    print(f"Successfully Created: {success}")
    print(f"Failed: {failed}")

if __name__ == "__main__":
    if AUTH_TOKEN == "your_admin_jwt_token_here":
        print("ERROR: Replace the AUTH_TOKEN at the top of the file before running.")
    else:
        populate_trains()