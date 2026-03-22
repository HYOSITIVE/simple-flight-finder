import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZodError } from "zod";

import type { DateSearchRequest, FlightSearchRequest } from "./types.js";
import { listAirports, parseDestinations, assertAirport } from "./services/airports.js";
import { searchCheapestDates, searchFlights } from "./services/googleFlights.js";
import { dateSearchSchema, flightSearchSchema } from "./validation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");

const app = express();
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";

app.use(express.json());
app.use("/static", express.static(publicDir, { maxAge: "1h" }));

app.get("/", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.get("/api/airports", (_req, res) => {
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.json(listAirports());
});

app.post("/api/search/flights", async (req, res) => {
  try {
    const parsed = flightSearchSchema.parse(req.body) as FlightSearchRequest;
    const request: FlightSearchRequest = {
      ...parsed,
      origin: assertAirport(parsed.origin, "origin"),
      destination: assertAirport(parsed.destination, "destination"),
    };

    res.json(await searchFlights(request));
  } catch (error) {
    handleError(error, res);
  }
});

app.post("/api/search/dates", async (req, res) => {
  try {
    const parsed = dateSearchSchema.parse(req.body) as DateSearchRequest;
    const request = {
      ...parsed,
      origin: assertAirport(parsed.origin, "origin"),
      destinations: parseDestinations(parsed.destinations),
    };

    res.json(
      await searchCheapestDates({
        origin: request.origin,
        destinations: request.destinations,
        from_date: request.from_date,
        to_date: request.to_date,
        adults: request.adults,
        seat_type: request.seat_type,
        trip_type: request.trip_type,
        duration: request.duration,
      }),
    );
  } catch (error) {
    handleError(error, res);
  }
});

function handleError(error: unknown, res: express.Response): void {
  if (error instanceof ZodError) {
    res.status(422).json({ detail: error.issues[0]?.message ?? "Invalid request" });
    return;
  }

  if (error instanceof Error) {
    const statusCode = /^Invalid |required|At least one/.test(error.message) ? 422 : 502;
    res.status(statusCode).json({ detail: error.message });
    return;
  }

  res.status(500).json({ detail: "Unknown server error" });
}

app.listen(port, host, () => {
  console.log(`Flight Finder listening on http://${host}:${port}`);
});
