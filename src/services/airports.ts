import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const airportCodesPath = require.resolve("@nwpr/airport-codes/dist/airports.json");
const airportCodes = JSON.parse(fs.readFileSync(airportCodesPath, "utf8")) as AirportRecord[];

interface AirportRecord {
  iata?: string | null;
  name?: string | null;
}

export interface AirportOption {
  code: string;
  name: string;
}

const airports = airportCodes
  .filter((airport) => airport.iata && airport.name)
  .map((airport) => ({
    code: airport.iata!.toUpperCase(),
    name: airport.name!.trim(),
  }))
  .sort((left, right) => left.code.localeCompare(right.code));

const airportCodeSet = new Set(airports.map((airport) => airport.code));

export function listAirports(): AirportOption[] {
  return airports;
}

export function assertAirport(code: string, label: string): string {
  const normalized = code.trim().toUpperCase();
  if (!airportCodeSet.has(normalized)) {
    throw new Error(`Invalid ${label} airport code: ${normalized}`);
  }
  return normalized;
}

export function parseDestinations(destinations: string): string[] {
  const parsed = destinations
    .split(",")
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);

  if (!parsed.length) {
    throw new Error("At least one destination is required");
  }

  return [...new Set(parsed.map((code) => assertAirport(code, "destination")))];
}
