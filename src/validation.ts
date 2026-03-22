import { z } from "zod";

import { seatTypes, tripTypes } from "./types.js";

const airportCode = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{3}$/, "Airport codes must be 3-letter IATA codes")
  .transform((value) => value.toUpperCase());

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Dates must use YYYY-MM-DD");

export const dateSearchSchema = z
  .object({
    origin: airportCode,
    destinations: z.string().trim().min(1, "At least one destination is required"),
    from_date: isoDate,
    to_date: isoDate,
    adults: z.coerce.number().int().min(1).max(9).default(1),
    seat_type: z.enum(seatTypes).default("ECONOMY"),
    trip_type: z.enum(tripTypes).default("ONE_WAY"),
    duration: z.coerce.number().int().min(1).max(30).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.trip_type === "ROUND_TRIP" && value.duration == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "duration is required for round-trip searches",
        path: ["duration"],
      });
    }

    if (value.from_date > value.to_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "from_date must be on or before to_date",
        path: ["from_date"],
      });
    }
  });

export const flightSearchSchema = z
  .object({
    origin: airportCode,
    destination: airportCode,
    date: isoDate,
    adults: z.coerce.number().int().min(1).max(9).default(1),
    seat_type: z.enum(seatTypes).default("ECONOMY"),
    trip_type: z.enum(tripTypes).default("ONE_WAY"),
    return_date: isoDate.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.trip_type === "ROUND_TRIP" && !value.return_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "return_date is required for round-trip searches",
        path: ["return_date"],
      });
    }
  });
