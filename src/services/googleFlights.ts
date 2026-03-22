import type {
  BrowserContext,
  Locator,
  Page,
} from "playwright-core";

import type {
  DatePriceResponse,
  FlightLegResponse,
  FlightResponse,
  FlightSearchRequest,
  SeatType,
  TripType,
} from "../types.js";
import { getBrowser } from "./browser.js";

const SEARCH_TIMEOUT_MS = 45_000;
const MAX_RESULTS = 8;

function buildQuery(request: FlightSearchRequest): string {
  const cabin = describeSeatType(request.seat_type);
  const adults = `${request.adults} adult${request.adults === 1 ? "" : "s"}`;

  if (request.trip_type === "ROUND_TRIP" && request.return_date) {
    return [
      `Flights to ${request.destination} from ${request.origin}`,
      `departing ${request.date}`,
      `returning ${request.return_date}`,
      `${cabin} class`,
      adults,
    ].join(" ");
  }

  return [
    `One way flights to ${request.destination} from ${request.origin}`,
    `on ${request.date}`,
    `${cabin} class`,
    adults,
  ].join(" ");
}

function describeSeatType(seatType: SeatType): string {
  switch (seatType) {
    case "PREMIUM_ECONOMY":
      return "premium economy";
    case "BUSINESS":
      return "business";
    case "FIRST":
      return "first";
    default:
      return "economy";
  }
}

function buildSearchUrl(request: FlightSearchRequest): string {
  const query = encodeURIComponent(buildQuery(request));
  return `https://www.google.com/travel/flights?q=${query}&hl=en&gl=us&curr=USD`;
}

function parsePrice(rawText: string | null): number | null {
  if (!rawText) {
    return null;
  }

  const match = rawText.replace(/,/g, "").match(/\$?(\d+(?:\.\d{1,2})?)/);
  return match ? Number(match[1]) : null;
}

function parseDurationMinutes(rawText: string | null): number | null {
  if (!rawText) {
    return null;
  }

  const hourMatch = rawText.match(/(\d+)\s*h/);
  const minuteMatch = rawText.match(/(\d+)\s*m/);
  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
  const total = hours * 60 + minutes;
  return total > 0 ? total : null;
}

function parseStops(rawText: string | null): number {
  if (!rawText) {
    return 0;
  }
  if (/nonstop/i.test(rawText)) {
    return 0;
  }

  const match = rawText.match(/(\d+)\s*stop/i);
  return match ? Number(match[1]) : 0;
}

function normalizeTimeToken(value: string): string | null {
  const match = value.match(/(\d{1,2}:\d{2})\s*([AP]M)/i);
  if (!match) {
    return null;
  }

  const timeToken = match[1] ?? "";
  const [rawHours = "0", minutes = "00"] = timeToken.split(":");
  let hours = Number(rawHours);
  const meridiem = (match[2] ?? "AM").toUpperCase();

  if (meridiem === "PM" && hours !== 12) {
    hours += 12;
  }
  if (meridiem === "AM" && hours === 12) {
    hours = 0;
  }

  return `${String(hours).padStart(2, "0")}:${minutes}:00`;
}

function toIsoDateTime(date: string, rawTime: string | null): string {
  const normalized = rawTime ? normalizeTimeToken(rawTime) : null;
  return `${date}T${normalized ?? "00:00:00"}`;
}

async function dismissGoogleModals(page: Page): Promise<void> {
  const buttons = [
    page.getByRole("button", { name: /accept all/i }),
    page.getByRole("button", { name: /i agree/i }),
    page.getByRole("button", { name: /not now/i }),
  ];

  for (const button of buttons) {
    try {
      if (await button.isVisible({ timeout: 1_500 })) {
        await button.click();
        await page.waitForTimeout(500);
      }
    } catch {
      // Ignore transient consent UI failures.
    }
  }
}

async function withSearchPage<T>(callback: (page: Page, context: BrowserContext) => Promise<T>): Promise<T> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    locale: "en-US",
    timezoneId: "America/Vancouver",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    return await callback(page, context);
  } finally {
    await context.close();
  }
}

async function waitForResults(page: Page): Promise<Locator> {
  await dismissGoogleModals(page);

  const locator = page.locator("li.pIav2d");
  await locator.first().waitFor({ timeout: SEARCH_TIMEOUT_MS });
  await page.waitForTimeout(1_500);
  return locator;
}

async function scrapeCard(card: Locator, request: FlightSearchRequest): Promise<FlightResponse | null> {
  const times = await card.locator("span[aria-label*='Departure time'], span[aria-label*='Arrival time']").allTextContents();
  const durationText = await card.locator("div.gvkrdb.AdWm1c").first().textContent().catch(() => null);
  const priceText = await card.locator("div.BVAVmf div.YMlIz").first().textContent().catch(() => null);
  const stopText = await card.locator("div.hF6lYb span").first().textContent().catch(() => null);
  const airlineText =
    (await card.locator("div.sSHqwe span:not([class])").first().textContent().catch(() => null)) ??
    (await card.locator("div.Ir0Voe span").first().textContent().catch(() => null)) ??
    "Unknown airline";

  const price = parsePrice(priceText);
  const durationMinutes = parseDurationMinutes(durationText);
  if (price == null || durationMinutes == null) {
    return null;
  }

  const departureTime = times[0] ?? null;
  const arrivalTime = times[1] ?? null;
  const legDuration = durationMinutes;
  const departureDate = request.date;
  const arrivalDate =
    request.trip_type === "ROUND_TRIP" && request.return_date ? request.return_date : request.date;

  const leg: FlightLegResponse = {
    airline: airlineText.trim(),
    flight_number: "",
    departure_airport: request.origin,
    arrival_airport: request.destination,
    departure_time: toIsoDateTime(departureDate, departureTime),
    arrival_time: toIsoDateTime(arrivalDate, arrivalTime),
    duration_minutes: legDuration,
  };

  return {
    price,
    duration_minutes: durationMinutes,
    stops: parseStops(stopText),
    legs: [leg],
  };
}

export async function searchFlights(request: FlightSearchRequest): Promise<FlightResponse[]> {
  return withSearchPage(async (page) => {
    await page.goto(buildSearchUrl(request), {
      waitUntil: "domcontentloaded",
      timeout: SEARCH_TIMEOUT_MS,
    });

    const cards = await waitForResults(page);
    const count = Math.min(await cards.count(), MAX_RESULTS);
    const flights: FlightResponse[] = [];

    for (let index = 0; index < count; index += 1) {
      const flight = await scrapeCard(cards.nth(index), request);
      if (flight) {
        flights.push(flight);
      }
    }

    return flights.sort((left, right) => left.price - right.price);
  });
}

function addDays(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function enumerateDates(fromDate: string, toDate: string): string[] {
  const values: string[] = [];
  let cursor = fromDate;
  while (cursor <= toDate) {
    values.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return values;
}

export async function searchCheapestDates(
  baseRequest: Omit<FlightSearchRequest, "destination" | "date" | "return_date"> & {
    destinations: string[];
    from_date: string;
    to_date: string;
    duration?: number;
  },
): Promise<DatePriceResponse[]> {
  const dates = enumerateDates(baseRequest.from_date, baseRequest.to_date);
  const results: DatePriceResponse[] = [];

  for (const destination of baseRequest.destinations) {
    for (const date of dates) {
      const request: FlightSearchRequest = {
        origin: baseRequest.origin,
        destination,
        date,
        adults: baseRequest.adults,
        seat_type: baseRequest.seat_type,
        trip_type: baseRequest.trip_type as TripType,
        return_date:
          baseRequest.trip_type === "ROUND_TRIP" && baseRequest.duration != null
            ? addDays(date, baseRequest.duration)
            : undefined,
      };

      const flights = await searchFlights(request);
      const cheapest = flights[0];
      if (!cheapest) {
        continue;
      }

      results.push({
        date,
        return_date: request.return_date,
        price: cheapest.price,
        destination,
      });
    }
  }

  return results;
}
