import os
import requests
from flask import Blueprint, jsonify, request
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Blueprint
maps_bp = Blueprint("maps_api", __name__)

ORS_API_KEY = os.getenv("ORS_API_KEY")


# ---------------------- ORS Key Route ---------------------- #
@maps_bp.route("/api/map-key")
def map_key():
    """Provides the OpenRouteService API key to frontend (optional)."""
    if not ORS_API_KEY:
        print("🚨 ORS_API_KEY missing in .env")
        return jsonify({"error": "ORS_API_KEY not configured"}), 500
    return jsonify({"ors_key": ORS_API_KEY})


# ---------------------- Route Calculation ---------------------- #
@maps_bp.route("/api/route", methods=["POST"])
def get_route():
    """Compute a route between two points using ORS."""
    try:
        data = request.get_json()
        start = data.get("start")  # [lng, lat]
        end = data.get("end")      # [lng, lat]

        if not start or not end:
            return jsonify({"error": "Start and end coordinates required"}), 400

        if not ORS_API_KEY:
            print("⚠ No ORS_API_KEY configured — returning straight line fallback.")
            return jsonify({
                "coordinates": [start, end],
                "distance": 0,
                "duration": 0
            })

        url = "https://api.openrouteservice.org/v2/directions/driving-car"
        headers = {
            "Authorization": ORS_API_KEY,
            "Content-Type": "application/json"
        }
        payload = {"coordinates": [start, end]}
        res = requests.post(url, json=payload, headers=headers, timeout=10)

        if res.status_code == 200:
            route_data = res.json()
            if route_data.get("routes"):
                route = route_data["routes"][0]
                return jsonify({
                    "coordinates": route["geometry"]["coordinates"],
                    "distance": route["summary"]["distance"],
                    "duration": route["summary"]["duration"]
                })

        print(f"⚠ ORS route error: {res.status_code}")
        return jsonify({
            "coordinates": [start, end],
            "distance": 0,
            "duration": 0
        })

    except Exception as e:
        print(f"🚨 Route API error: {e}")
        return jsonify({"error": str(e)}), 500


# ---------------------- 🗺️ NEW: Geocode API Endpoint ---------------------- #
@maps_bp.route("/api/geocode")
def geocode():
    """Public API route to get coordinates from a landmark name."""
    query = request.args.get("q", "")
    if not query:
        return jsonify({"error": "Missing 'q' parameter"}), 400

    result = geocode_place(query)
    if result:
        return jsonify(result)
    return jsonify({"error": "Place not found"}), 404


# ---------------------- Geocode Helper Function ---------------------- #
def geocode_place(query: str):
    """Use OpenStreetMap (Nominatim) to get coordinates for a landmark."""
    if not query:
        return None
    try:
        NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
        headers = {"User-Agent": "Mira-Kolkata-Tourism/1.0 (openai.com)"}
        params = {"q": f"{query}, Kolkata", "format": "json", "limit": 1}

        res = requests.get(NOMINATIM_URL, params=params, headers=headers, timeout=8)
        if res.status_code == 200:
            data = res.json()
            if data:
                loc = data[0]
                return {
                    "label": loc.get("display_name", query),
                    "lat": float(loc["lat"]),
                    "lon": float(loc["lon"]),
                }
        return None
    except Exception as e:
        print(f"⚠ Geocode error: {e}")
        return None


# ---------------------- Multi-place Helper (Optional) ---------------------- #
def get_map_data_from_text(text: str):
    """Find multiple landmarks in user text."""
    if not text:
        return None

    places = []
    for part in [p.strip() for p in text.replace(",", " and ").split(" and ") if len(p.strip()) > 2]:
        loc = geocode_place(part)
        if loc:
            places.append(loc)
    return places or None
