export const seatTypes = [
  "ECONOMY",
  "PREMIUM_ECONOMY",
  "BUSINESS",
  "FIRST",
] as const;

export const tripTypes = ["ONE_WAY", "ROUND_TRIP"] as const;

export type SeatType = (typeof seatTypes)[number];
export type TripType = (typeof tripTypes)[number];

export interface DateSearchRequest {
  origin: string;
  destinations: string;
  from_date: string;
  to_date: string;
  adults: number;
  seat_type: SeatType;
  trip_type: TripType;
  duration?: number;
}

export interface FlightSearchRequest {
  origin: string;
  destination: string;
  date: string;
  adults: number;
  seat_type: SeatType;
  trip_type: TripType;
  return_date?: string;
}

export interface DatePriceResponse {
  date: string;
  return_date?: string;
  price: number;
  destination: string;
}

export interface FlightLegResponse {
  airline: string;
  flight_number: string;
  departure_airport: string;
  arrival_airport: string;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
}

export interface FlightResponse {
  price: number;
  duration_minutes: number;
  stops: number;
  legs: FlightLegResponse[];
}
