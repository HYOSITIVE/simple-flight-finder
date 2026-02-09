from fastapi import APIRouter, Response
from fli.models import Airport

router = APIRouter()


@router.get("/airports")
def get_airports(response: Response):
    """Return all available airports from the fli library."""
    # Set cache headers (airports are immutable data)
    response.headers["Cache-Control"] = "public, max-age=31536000, immutable"

    airports = []
    for airport in Airport:
        airports.append({
            "code": airport.name,
            "name": airport.value
        })
    return sorted(airports, key=lambda x: x["code"])
