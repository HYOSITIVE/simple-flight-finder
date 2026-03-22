# Flight Finder

A flight search tool that lets you search one origin → multiple destinations simultaneously, comparing the cheapest fares across a flexible date range.

## How It Works

Flights are fetched via the **[`fli`](https://pypi.org/project/fli/) Python library**, which queries **Google Flights** under the hood — no MCP, no official API key required.

Two search modes:
- **Date search** — finds the cheapest fare per date across all selected destinations
- **Flight search** — fetches full itineraries (airline, times, stops) for a selected date

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Vanilla JS + Vite |
| Backend | FastAPI (Python) |
| Flight data | `fli` → Google Flights |
| Airport data | `airportsdata` (IATA database) |

## Flow

```
User selects: origin, destinations[], date range, cabin, trip type
        ↓
POST /api/search/dates  →  cheapest fare cards per destination
        ↓ (user clicks a card)
POST /api/search/flights  →  full itineraries for that date
```
