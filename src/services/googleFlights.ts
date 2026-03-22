import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import type {
  DatePriceResponse,
  FlightLegResponse,
  FlightResponse,
  FlightSearchRequest,
  SeatType,
} from "../types.js";

const FLI_MCP_URL = "http://127.0.0.1:8000/mcp/";

async function callFliTool<T>(toolName: string, args: Record<string, unknown>): Promise<T> {
  const client = new Client({ name: "flight-finder", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(FLI_MCP_URL));

  await client.connect(transport);
  try {
    const result = await client.callTool({ name: toolName, arguments: args });
    const text = (result.content as Array<{ type: string; text: string }>)
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("");
    console.log("[fli raw]", text.slice(0, 500));
    return JSON.parse(text) as T;
  } finally {
    await client.close();
  }
}

function parseDurationMinutes(duration: string | null | undefined): number {
  if (!duration) return 0;
  const h = duration.match(/(\d+)\s*h/);
  const m = duration.match(/(\d+)\s*m/);
  return (h ? Number(h[1]) : 0) * 60 + (m ? Number(m[1]) : 0);
}

function mapSeatType(seatType: SeatType): string {
  return seatType; // ECONOMY | PREMIUM_ECONOMY | BUSINESS | FIRST — same values
}

interface FliLeg {
  airline: string;
  flight_number: string;
  departure_airport: string;
  arrival_airport: string;
  departure_time: string;
  arrival_time: string;
  duration: string;
}

interface FliFlight {
  price: number;
  legs: FliLeg[];
}

interface FliFlightResult {
  success: boolean;
  flights?: FliFlight[];
  error?: string;
}

interface FliDateEntry {
  date: string;
  price: number;
  return_date?: string;
}

interface FliDateResult {
  success: boolean;
  dates?: FliDateEntry[];
  error?: string;
}

export async function searchFlights(request: FlightSearchRequest): Promise<FlightResponse[]> {
  const args: Record<string, unknown> = {
    origin: request.origin,
    destination: request.destination,
    departure_date: request.date,
    cabin_class: mapSeatType(request.seat_type),
    passengers: request.adults,
    sort_by: "CHEAPEST",
  };

  if (request.return_date) {
    args.return_date = request.return_date;
  }

  const result = await callFliTool<FliFlightResult>("search_flights", args);

  if (!result.success || !result.flights) {
    throw new Error(result.error ?? "Flight search failed");
  }

  return result.flights.map((f) => {
    const legs: FlightLegResponse[] = f.legs.map((leg) => ({
      airline: leg.airline,
      flight_number: leg.flight_number ?? "",
      departure_airport: leg.departure_airport,
      arrival_airport: leg.arrival_airport,
      departure_time: leg.departure_time,
      arrival_time: leg.arrival_time,
      duration_minutes: parseDurationMinutes(leg.duration),
    }));

    const totalMinutes = legs.reduce((sum, leg) => sum + leg.duration_minutes, 0);
    const stops = Math.max(0, legs.length - 1);

    return { price: f.price, duration_minutes: totalMinutes, stops, legs };
  });
}

export async function searchCheapestDates(
  baseRequest: Omit<FlightSearchRequest, "destination" | "date" | "return_date"> & {
    destinations: string[];
    from_date: string;
    to_date: string;
    duration?: number;
  },
): Promise<DatePriceResponse[]> {
  const results: DatePriceResponse[] = [];

  for (const destination of baseRequest.destinations) {
    const args: Record<string, unknown> = {
      origin: baseRequest.origin,
      destination,
      start_date: baseRequest.from_date,
      end_date: baseRequest.to_date,
      cabin_class: mapSeatType(baseRequest.seat_type),
      passengers: baseRequest.adults,
      is_round_trip: baseRequest.trip_type === "ROUND_TRIP",
      sort_by_price: true,
    };

    if (baseRequest.trip_type === "ROUND_TRIP" && baseRequest.duration != null) {
      args.trip_duration = baseRequest.duration;
    }

    const result = await callFliTool<FliDateResult>("search_dates", args);

    if (!result.success || !result.dates) {
      continue;
    }

    for (const entry of result.dates) {
      results.push({
        date: entry.date,
        return_date: entry.return_date,
        price: entry.price,
        destination,
      });
    }
  }

  return results;
}
