from pydantic import BaseModel
from typing import Optional


class DatePriceResponse(BaseModel):
    date: str        # YYYY-MM-DD
    return_date: Optional[str] = None  # YYYY-MM-DD for round trips
    price: float
    destination: str  # Airport code for multi-destination searches


class FlightLegResponse(BaseModel):
    airline: str
    flight_number: str
    departure_airport: str
    arrival_airport: str
    departure_time: str  # ISO datetime string
    arrival_time: str    # ISO datetime string
    duration_minutes: int


class FlightResponse(BaseModel):
    price: float
    duration_minutes: int
    stops: int
    legs: list[FlightLegResponse]
