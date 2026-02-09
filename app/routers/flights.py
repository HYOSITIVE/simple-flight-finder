from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.schemas.requests import FlightSearchRequest
from app.schemas.responses import FlightResponse
from app.services.flight_search import search_flights

router = APIRouter()


@router.post("/flights", response_model=list[FlightResponse])
def search_flight_options(req: FlightSearchRequest):
    try:
        return search_flights(req)
    except ValueError as e:
        return JSONResponse(status_code=422, content={"detail": str(e)})
    except Exception as e:
        return JSONResponse(status_code=502, content={"detail": f"Search failed: {str(e)}"})
