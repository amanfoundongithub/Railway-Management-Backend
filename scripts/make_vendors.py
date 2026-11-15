import requests
import time
import random

# --- CONFIGURATION ---
# Adjust port if your catering routes are on a different port/prefix
API_URL = "http://localhost:5001/api/catering/vendors" 
AUTH_TOKEN = "your_admin_jwt_token_here"  # Replace with your real token

HEADERS = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type": "application/json"
}

# The 50 stations from your previous script
STATION_CODES = [
    "NDLS", "CSMT", "HWH", "MAS", "SC", "BCT", "SBC", "PNBE", "LKO", "ADI",
    "CNB", "BPL", "JP", "NGP", "GHY", "BBS", "CBE", "TVC", "VSKP", "BSB",
    "PRYJ", "CDG", "LDH", "DNR", "RNC", "GKP", "AGC", "JAT", "YPR", "ERS",
    "BZA", "UBL", "MYS", "PUNE", "ST", "BRC", "RTM", "JBP", "KGP", "ASN",
    "SDAH", "TATA", "BSP", "RPR", "JU", "AII", "MDU", "TPJ", "MAQ", "GTL"
]

# --- VENDOR TEMPLATES & MENUS ---
VENDOR_TEMPLATES = [
    {
        "name": "Domino's Pizza",
        "tags": "Pizzas, Fast Food, Beverages",
        "menu": [
            {"name": "Margherita Pizza", "price": 299, "desc": "Classic cheese pizza with a regular crust", "isVeg": True},
            {"name": "Peppy Paneer Pizza", "price": 459, "desc": "Chunky paneer with crisp capsicum and spicy red pepper", "isVeg": True},
            {"name": "Chicken Dominator", "price": 599, "desc": "Grilled chicken chunks, double pepper barbecue chicken", "isVeg": False},
            {"name": "Garlic Breadsticks", "price": 109, "desc": "Baked to perfection with garlic butter", "isVeg": True}
        ]
    },
    {
        "name": "Haldiram's",
        "tags": "North Indian, Mithai, Snacks",
        "menu": [
            {"name": "Premium Veg Thali", "price": 250, "desc": "Paneer Butter Masala, Dal Makhani, 3 Rotis, Rice, Sweet", "isVeg": True},
            {"name": "Chole Bhature", "price": 150, "desc": "Spicy chickpea curry with 2 fluffy bhatures", "isVeg": True},
            {"name": "Raj Kachori", "price": 120, "desc": "Crispy kachori filled with chutneys, yogurt, and sev", "isVeg": True},
            {"name": "Gulab Jamun (2 pcs)", "price": 60, "desc": "Classic Indian sweet syrup dumplings", "isVeg": True}
        ]
    },
    {
        "name": "Faasos",
        "tags": "Wraps, Rolls, Fast Food",
        "menu": [
            {"name": "Paneer Tikka Wrap", "price": 180, "desc": "Grilled paneer with mint chutney in a soft wrap", "isVeg": True},
            {"name": "Chicken Kebab Wrap", "price": 220, "desc": "Smoky chicken kebab with fresh vegetables and mayo", "isVeg": False},
            {"name": "Cheesy Corn Wrap", "price": 150, "desc": "Sweet corn mixed with melted cheese in a paratha wrap", "isVeg": True}
        ]
    },
    {
        "name": "Behrouz Biryani",
        "tags": "Biryani, Mughlai, Kebabs",
        "menu": [
            {"name": "Subz-E-Falafel Biryani", "price": 320, "desc": "Aromatic basmati rice cooked with fresh veggies and falafel", "isVeg": True},
            {"name": "Murgh Makhani Kefta Biryani", "price": 450, "desc": "Chicken meatballs cooked in a creamy makhani gravy with biryani rice", "isVeg": False},
            {"name": "Dum Gosht Biryani (Mutton)", "price": 550, "desc": "Tender mutton pieces marinated and dum-cooked with long grain rice", "isVeg": False}
        ]
    },
    {
        "name": "Comesum",
        "tags": "North Indian, South Indian, Thalis",
        "menu": [
            {"name": "Standard Veg Thali", "price": 180, "desc": "Dal, Seasonal Veg Curry, 4 Puris, Rice, Pickle", "isVeg": True},
            {"name": "Egg Curry Meal", "price": 200, "desc": "2 Eggs in spiced gravy served with Jeera Rice", "isVeg": False},
            {"name": "Masala Dosa", "price": 130, "desc": "Crispy crepe served with sambar and coconut chutney", "isVeg": True},
            {"name": "Idli Vada Combo", "price": 110, "desc": "2 soft idlis and 1 crispy vada with sambar", "isVeg": True}
        ]
    },
    {
        "name": "Bikanervala",
        "tags": "Sweets, Snacks, North Indian",
        "menu": [
            {"name": "Deluxe Thali", "price": 300, "desc": "Shahi Paneer, Dal Makhani, Mix Veg, Pulao, 2 Parathas, Raita, Papad, Sweet", "isVeg": True},
            {"name": "Paneer Tikka Sandwich", "price": 140, "desc": "Grilled sandwich with tandoori paneer filling", "isVeg": True},
            {"name": "Cold Coffee", "price": 90, "desc": "Thick chilled blended coffee", "isVeg": True}
        ]
    }
]

def populate_vendors():
    success_count = 0
    failure_count = 0

    print(f"Starting creation of vendors for {len(STATION_CODES)} stations...\n")

    for idx, station_code in enumerate(STATION_CODES, 1):
        # Pick 2 or 3 random distinct vendors for this station
        num_vendors = random.choice([2, 3])
        selected_templates = random.sample(VENDOR_TEMPLATES, num_vendors)

        for template in selected_templates:
            vendor_payload = {
                "name": template["name"],
                "tags": template["tags"],
                "rating": round(random.uniform(3.8, 4.8), 1),
                "stationCode": station_code,
                "menu": template["menu"]
            }

            try:
                response = requests.post(API_URL, json=vendor_payload, headers=HEADERS)
                
                if response.status_code in [200, 201]:
                    print(f"[{idx}/{len(STATION_CODES)}] SUCCESS: Created '{vendor_payload['name']}' at {station_code}")
                    success_count += 1
                else:
                    print(f"[{idx}/{len(STATION_CODES)}] FAILED at {station_code} - Status: {response.status_code} | Msg: {response.text}")
                    failure_count += 1
                    
            except requests.exceptions.RequestException as e:
                print(f"[{idx}/{len(STATION_CODES)}] ERROR: Network issue at {station_code} | {e}")
                failure_count += 1
            
            # 100ms delay to prevent overwhelming the local Node server
            time.sleep(0.1)

    print("\n--- SUMMARY ---")
    print(f"Total Stations Processed: {len(STATION_CODES)}")
    print(f"Total Vendors Successfully Created: {success_count}")
    print(f"Total Failures: {failure_count}")

if __name__ == "__main__":
    if AUTH_TOKEN == "your_admin_jwt_token_here":
        print("ERROR: Please replace the AUTH_TOKEN in the script with your actual admin JWT.")
    else:
        populate_vendors()