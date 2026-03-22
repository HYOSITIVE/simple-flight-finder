# Airport Codes

> Airport codes (IATA) and information pulled from OpenFlights.org

Fork which uses types in TypeScript.

_INFO: Version 3.0.0 introduced breaking changes._

## Install

```
npm install @nwpr/airport-codes
```

## Usage

The list of airport codes is provided as typed array.

```javascript
import { airports } from "@nwpr/airport-codes";

console.log(airports.find((airport) => airport.iata === "LAX")?.name);
// Los Angeles International Airport

console.log(airports[124].city);
// Sydney

console.log(airports[0].name);
// Goroka Airport

airports.sort((a, b) => a.city!.localeCompare(b.city!));
console.log(airports[0].name);
// Minsk Mazowiecki Military Air Base

```

If you'd like only the JSON list of airport codes, you can import the json list directly:

```javascript
require("@nwpr/airport-codes/airports.json");
```

## Update the list of Airport Codes

The list gets updated on installation.
To manually update the list of airport codes afterwards:

```
node update.js
```

## Thanks

- [Andrew Kennedy](https://github.com/L1fescape/airport-codes)
- [Ram Nadella](https://github.com/ram-nadella/airport-codes)
- [Jani Patokallio](https://github.com/jpatokal/openflights/)
