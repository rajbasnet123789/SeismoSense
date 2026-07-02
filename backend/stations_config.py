"""Indian seismic stations on the IN (IMD) network via IRIS/EarthScope."""

KNOWN_STATIONS = [
    {
        "code": "SHL",
        "network": "IN",
        "location": "Shillong, Meghalaya, India",
        "lat": 25.5668,
        "lon": 91.8559,
        "rate": 100.0,
    },
    {
        "code": "MNC",
        "network": "IN",
        "location": "Minicoy, Lakshadweep, India",
        "lat": 8.2815,
        "lon": 73.0598,
        "rate": 100.0,
    },
]

STATION_CODES = {s["code"] for s in KNOWN_STATIONS}
