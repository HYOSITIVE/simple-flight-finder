from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.schemas.requests import DateSearchRequest
from app.schemas.responses import DatePriceResponse
from app.services.date_search import search_cheapest_dates

router = APIRouter()


@router.post("/dates", response_model=list[DatePriceResponse])
def search_dates(req: DateSearchRequest):
    try:
        return search_cheapest_dates(req)
    except ValueError as e:
        return JSONResponse(status_code=422, content={"detail": str(e)})
    except Exception as e:
        return JSONResponse(status_code=502, content={"detail": f"Search failed: {str(e)}"})
