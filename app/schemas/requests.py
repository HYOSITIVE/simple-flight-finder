from pydantic import BaseModel
from typing import Optional


class DateSearchRequest(BaseModel):
    origin: str
    destinations: str  # Comma-separated airport codes (e.g., "SFO,LAX,SEA")
    from_date: str  # YYYY-MM-DD
    to_date: str    # YYYY-MM-DD
    adults: int = 1
    seat_type: str = "ECONOMY"  # ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST
    trip_type: str = "ONE_WAY"  # ONE_WAY, ROUND_TRIP
    duration: Optional[int] = None  # Required for ROUND_TRIP


class FlightSearchRequest(BaseModel):
    origin: str
    destination: str
    date: str  # YYYY-MM-DD
    adults: int = 1
    seat_type: str = "ECONOMY"
    trip_type: str = "ONE_WAY"
    return_date: Optional[str] = None  # Required for ROUND_TRIP
