import airportsdata
from fastapi import APIRouter, Response
from fli.models import Airport

router = APIRouter()

_iata_db = airportsdata.load("IATA")


@router.get("/airports")
def get_airports(response: Response):
    """Return all available airports from the fli library."""
    # Set cache headers (airports are immutable data)
    response.headers["Cache-Control"] = "public, max-age=31536000, immutable"

    airports = []
    for airport in Airport:
        extra = _iata_db.get(airport.name, {})
        airports.append({
            "code": airport.name,
            "name": airport.value,
            "city": extra.get("city", ""),
        })
    return sorted(airports, key=lambda x: x["code"])
