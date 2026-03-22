from fli.models import Airport, PassengerInfo, SeatType, TripType, MaxStops, SortBy
from fli.models.google_flights.base import FlightSegment
from fli.models.google_flights.flights import FlightSearchFilters
from fli.search import SearchFlights

from app.schemas.requests import FlightSearchRequest
from app.schemas.responses import FlightResponse, FlightLegResponse


def search_flights(req: FlightSearchRequest) -> list[FlightResponse]:
    try:
        origin = Airport[req.origin.upper()]
        destination = Airport[req.destination.upper()]
    except KeyError as e:
        raise ValueError(f"Invalid airport code: {e}")

    try:
        seat_type = SeatType[req.seat_type.upper()]
    except KeyError:
        raise ValueError(f"Invalid seat type: {req.seat_type}")

    try:
        trip_type = TripType[req.trip_type.upper()]
    except KeyError:
        raise ValueError(f"Invalid trip type: {req.trip_type}")

    segments = [
        FlightSegment(
            departure_airport=[[origin, 0]],
            arrival_airport=[[destination, 0]],
            travel_date=req.date,
        )
    ]

    if trip_type == TripType.ROUND_TRIP:
        if req.return_date is None:
            raise ValueError("return_date is required for round-trip searches")
        segments.append(
            FlightSegment(
                departure_airport=[[destination, 0]],
                arrival_airport=[[origin, 0]],
                travel_date=req.return_date,
            )
        )

    filters = FlightSearchFilters(
        trip_type=trip_type,
        passenger_info=PassengerInfo(adults=req.adults),
        flight_segments=segments,
        stops=MaxStops.ANY,
        seat_type=seat_type,
        sort_by=SortBy.CHEAPEST,
    )

    results = SearchFlights().search(filters)
    if not results:
        return []

    output = []
    for result in results:
        if isinstance(result, tuple):
            # Round trip - combine outbound + return legs
            outbound, inbound = result
            flights_to_combine = [outbound, inbound]
            price = outbound.price
            duration_minutes = outbound.duration + inbound.duration
            stops = outbound.stops + inbound.stops
        else:
            flights_to_combine = [result]
            price = result.price
            duration_minutes = result.duration
            stops = result.stops

        legs = []
        for flight in flights_to_combine:
            for leg in flight.legs:
                legs.append(FlightLegResponse(
                    airline=leg.airline.value,
                    flight_number=leg.flight_number,
                    departure_airport=leg.departure_airport.name,
                    arrival_airport=leg.arrival_airport.name,
                    departure_time=leg.departure_datetime.isoformat(),
                    arrival_time=leg.arrival_datetime.isoformat(),
                    duration_minutes=leg.duration,
                ))

        output.append(FlightResponse(
            price=price,
            duration_minutes=duration_minutes,
            stops=stops,
            legs=legs,
        ))

    return output
