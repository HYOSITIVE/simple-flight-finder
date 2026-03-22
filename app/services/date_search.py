from fli.models import Airport, PassengerInfo, SeatType, TripType, MaxStops
from fli.models.google_flights.base import FlightSegment
from fli.models.google_flights.dates import DateSearchFilters
from fli.search import SearchDates

from app.schemas.requests import DateSearchRequest
from app.schemas.responses import DatePriceResponse


def search_cheapest_dates(req: DateSearchRequest) -> list[DatePriceResponse]:
    try:
        origin = Airport[req.origin.upper()]
    except KeyError as e:
        raise ValueError(f"Invalid origin airport code: {e}")

    # Parse comma-separated destinations
    destination_codes = [c for c in (code.strip().upper() for code in req.destinations.split(',')) if c]
    if not destination_codes:
        raise ValueError("At least one destination is required")

    # Validate all destination codes
    destinations = []
    for code in destination_codes:
        try:
            destinations.append(Airport[code])
        except KeyError:
            raise ValueError(f"Invalid destination airport code: {code}")

    try:
        seat_type = SeatType[req.seat_type.upper()]
    except KeyError:
        raise ValueError(f"Invalid seat type: {req.seat_type}")

    try:
        trip_type = TripType[req.trip_type.upper()]
    except KeyError:
        raise ValueError(f"Invalid trip type: {req.trip_type}")

    if trip_type == TripType.ROUND_TRIP and req.duration is None:
        raise ValueError("duration is required for round-trip searches")

    # Search for each destination
    all_results = []
    for destination in destinations:
        # For round trips, we need two segments (outbound and return)
        segments = [
            FlightSegment(
                departure_airport=[[origin, 0]],
                arrival_airport=[[destination, 0]],
                travel_date=req.from_date,
            )
        ]

        if trip_type == TripType.ROUND_TRIP:
            segments.append(
                FlightSegment(
                    departure_airport=[[destination, 0]],
                    arrival_airport=[[origin, 0]],
                    travel_date=req.from_date,  # Will be overridden by duration
                )
            )

        filters_kwargs = dict(
            trip_type=trip_type,
            passenger_info=PassengerInfo(adults=req.adults),
            flight_segments=segments,
            stops=MaxStops.ANY,
            seat_type=seat_type,
            from_date=req.from_date,
            to_date=req.to_date,
        )

        if trip_type == TripType.ROUND_TRIP:
            filters_kwargs["duration"] = req.duration

        filters = DateSearchFilters(**filters_kwargs)

        results = SearchDates().search(filters)

        # Process results for this destination
        for dp in results:
            if isinstance(dp.date, tuple):
                if len(dp.date) == 1:
                    all_results.append(DatePriceResponse(
                        date=dp.date[0].strftime("%Y-%m-%d"),
                        price=dp.price,
                        destination=destination.name,
                    ))
                elif len(dp.date) == 2:
                    all_results.append(DatePriceResponse(
                        date=dp.date[0].strftime("%Y-%m-%d"),
                        return_date=dp.date[1].strftime("%Y-%m-%d"),
                        price=dp.price,
                        destination=destination.name,
                    ))
            else:
                all_results.append(DatePriceResponse(
                    date=dp.date.strftime("%Y-%m-%d"),
                    price=dp.price,
                    destination=destination.name,
                ))

    return all_results
