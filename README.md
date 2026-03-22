# Flight Finder

TypeScript rebuild of the original flight finder app.

## Scripts

- `npm install`
- `npm run dev`
- `npm run build`
- `npm start`

The app serves:

- `GET /` for the UI
- `GET /api/airports` for airport suggestions
- `POST /api/search/dates` for cheapest dates in a range
- `POST /api/search/flights` for specific itinerary results

## Notes

The search layer uses browser automation against Google Flights from TypeScript. It expects a local Chrome installation on macOS at the standard path.
