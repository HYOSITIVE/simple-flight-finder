type TripType = "ONE_WAY" | "ROUND_TRIP";

interface DatePriceResponse {
  date: string;
  return_date?: string;
  price: number;
  destination: string;
}

interface FlightLegResponse {
  airline: string;
  flight_number: string;
  departure_airport: string;
  arrival_airport: string;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
}

interface FlightResponse {
  price: number;
  duration_minutes: number;
  stops: number;
  legs: FlightLegResponse[];
}

interface AirportOption {
  code: string;
  name: string;
}

const form = document.getElementById("searchForm") as HTMLFormElement;
const tripTypeEl = document.getElementById("tripType") as HTMLSelectElement;
const durationGroup = document.getElementById("durationGroup") as HTMLDivElement;
const searchBtn = document.getElementById("searchBtn") as HTMLButtonElement;
const errorBox = document.getElementById("errorBox") as HTMLDivElement;
const datesSection = document.getElementById("datesSection") as HTMLDivElement;
const datesBody = document.getElementById("datesBody") as HTMLTableSectionElement;
const flightsSection = document.getElementById("flightsSection") as HTMLDivElement;
const flightsList = document.getElementById("flightsList") as HTMLDivElement;
const airportsDatalist = document.getElementById("airports") as HTMLDataListElement;
const originInput = document.getElementById("origin") as HTMLInputElement;
const destInput = document.getElementById("destination") as HTMLInputElement;
const destChipsContainer = document.getElementById("destChips") as HTMLDivElement;
const fromDateInput = document.getElementById("fromDate") as HTMLInputElement;
const toDateInput = document.getElementById("toDate") as HTMLInputElement;
const seatTypeInput = document.getElementById("seatType") as HTMLSelectElement;
const adultsInput = document.getElementById("adults") as HTMLInputElement;
const durationInput = document.getElementById("duration") as HTMLInputElement;
const datesSectionTitle = document.getElementById("datesSectionTitle") as HTMLDivElement;
const flightsSectionTitle = document.getElementById("flightsSectionTitle") as HTMLDivElement;

let selectedDestinations: string[] = [];
let selectedRow: HTMLTableRowElement | null = null;

function showError(message: string): void {
  errorBox.textContent = message;
  errorBox.style.display = "block";
}

function hideError(): void {
  errorBox.style.display = "none";
}

function formatDate(dateStr?: string): string {
  if (!dateStr) {
    return "—";
  }

  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(isoStr: string): string {
  const date = new Date(isoStr);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function renderDestinations(): void {
  destChipsContainer.innerHTML = "";

  for (const code of selectedDestinations) {
    const chip = document.createElement("div");
    chip.className = "dest-chip";
    chip.innerHTML = `<span>${code}</span><span class="dest-chip-remove" data-code="${code}">&times;</span>`;
    chip.querySelector(".dest-chip-remove")?.addEventListener("click", () => {
      removeDestination(code);
    });
    destChipsContainer.appendChild(chip);
  }
}

function removeDestination(code: string): void {
  selectedDestinations = selectedDestinations.filter((value) => value !== code);
  renderDestinations();
}

function airportExists(code: string): boolean {
  return Array.from(airportsDatalist.options).some((option) => option.value === code);
}

function addDestination(code: string): void {
  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    return;
  }

  if (selectedDestinations.includes(normalized)) {
    destInput.value = "";
    return;
  }

  if (airportsDatalist.options.length > 0 && !airportExists(normalized)) {
    showError(`Invalid airport code: ${normalized}`);
    return;
  }

  selectedDestinations.push(normalized);
  destInput.value = "";
  hideError();
  renderDestinations();
}

async function loadAirports(): Promise<void> {
  originInput.placeholder = "Loading airports...";
  destInput.placeholder = "Loading airports...";

  try {
    const response = await fetch("/api/airports");
    const airports = (await response.json()) as AirportOption[];

    for (const airport of airports) {
      const option = document.createElement("option");
      option.value = airport.code;
      option.textContent = `${airport.code} - ${airport.name}`;
      airportsDatalist.appendChild(option);
    }

    originInput.placeholder = "e.g. JFK, YVR, LAX";
    destInput.placeholder = "Type to search and add destinations...";
  } catch {
    originInput.placeholder = "e.g. JFK";
    destInput.placeholder = "Type airport codes like SFO or LAX";
  }
}

function setDefaultDates(): void {
  const today = new Date();
  const fromDefault = new Date(today);
  const toDefault = new Date(today);
  fromDefault.setDate(today.getDate() + 14);
  toDefault.setDate(today.getDate() + 28);
  fromDateInput.value = fromDefault.toISOString().slice(0, 10);
  toDateInput.value = toDefault.toISOString().slice(0, 10);
}

function resetResults(): void {
  datesSection.style.display = "none";
  flightsSection.style.display = "none";
  datesBody.innerHTML = "";
  flightsList.innerHTML = "";
  selectedRow?.classList.remove("selected");
  selectedRow = null;
}

async function loadFlights(
  row: DatePriceResponse,
  tableRow: HTMLTableRowElement,
  origin: string,
  destination: string,
  tripType: TripType,
  adults: number,
  seatType: string,
): Promise<void> {
  selectedRow?.classList.remove("selected");
  selectedRow = tableRow;
  selectedRow.classList.add("selected");

  flightsSection.style.display = "block";
  flightsSectionTitle.textContent = `Flight Options: ${origin} → ${destination} on ${formatDate(row.date)}`;
  flightsList.innerHTML = `<p><span class="spinner"></span>Loading flights...</p>`;

  const payload: Record<string, string | number> = {
    origin,
    destination,
    date: row.date,
    adults,
    seat_type: seatType,
    trip_type: tripType,
  };

  if (row.return_date) {
    payload.return_date = row.return_date;
  }

  try {
    const response = await fetch("/api/search/flights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as FlightResponse[] | { detail?: string };

    if (!response.ok || !Array.isArray(data)) {
      flightsList.innerHTML = `<div class="error">${"detail" in data ? data.detail ?? "Failed to load flights" : "Failed to load flights"}</div>`;
      return;
    }

    if (!data.length) {
      flightsList.innerHTML = `<p class="empty">No flights found for this date.</p>`;
      return;
    }

    flightsList.innerHTML = "";
    for (const flight of data) {
      const card = document.createElement("div");
      card.className = "flight-card";

      const legsHtml = flight.legs
        .map(
          (leg) => `
            <div class="leg">
              <span class="leg-airports">${leg.departure_airport} → ${leg.arrival_airport}</span>
              <span class="leg-time">${formatDateTime(leg.departure_time)} → ${formatDateTime(leg.arrival_time)}</span>
              <span class="leg-airline">${leg.airline}${leg.flight_number ? ` ${leg.flight_number}` : ""}</span>
            </div>
          `,
        )
        .join("");

      card.innerHTML = `
        <div class="flight-card-header">
          <span class="flight-price">$${flight.price.toFixed(2)}</span>
          <span class="flight-meta">${formatDuration(flight.duration_minutes)} · ${flight.stops === 0 ? "Nonstop" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}</span>
        </div>
        ${legsHtml}
      `;
      flightsList.appendChild(card);
    }
  } catch (error) {
    flightsList.innerHTML = `<div class="error">Network error: ${(error as Error).message}</div>`;
  }
}

function renderDateResults(data: DatePriceResponse[], origin: string, tripType: TripType, adults: number, seatType: string): void {
  const byDestination = new Map<string, DatePriceResponse[]>();

  for (const row of data) {
    const rows = byDestination.get(row.destination) ?? [];
    rows.push(row);
    byDestination.set(row.destination, rows);
  }

  datesSectionTitle.textContent = `Cheapest Dates from ${origin}`;
  datesBody.innerHTML = "";
  datesSection.style.display = "block";

  const destinations = Array.from(byDestination.keys()).sort((left, right) => left.localeCompare(right));
  for (const destination of destinations) {
    const rows = (byDestination.get(destination) ?? []).sort((left, right) => left.price - right.price);

    const headerRow = document.createElement("tr");
    headerRow.innerHTML = `<td colspan="3" style="background: rgba(255,255,255,0.65); font-weight:700;">${origin} → ${destination}</td>`;
    datesBody.appendChild(headerRow);

    for (const row of rows) {
      const tableRow = document.createElement("tr");
      tableRow.className = "clickable";
      tableRow.innerHTML = `
        <td>${formatDate(row.date)}</td>
        <td>${formatDate(row.return_date)}</td>
        <td class="price">$${row.price.toFixed(2)}</td>
      `;
      tableRow.addEventListener("click", () => {
        void loadFlights(row, tableRow, origin, destination, tripType, adults, seatType);
      });
      datesBody.appendChild(tableRow);
    }
  }
}

tripTypeEl.addEventListener("change", () => {
  durationGroup.style.display = tripTypeEl.value === "ROUND_TRIP" ? "flex" : "none";
});

destInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === "," || event.key === " ") {
    event.preventDefault();
    addDestination(destInput.value);
    return;
  }

  if (event.key === "Backspace" && !destInput.value && selectedDestinations.length > 0) {
    removeDestination(selectedDestinations[selectedDestinations.length - 1]!);
  }
});

destInput.addEventListener("change", () => {
  if (destInput.value) {
    addDestination(destInput.value);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideError();
  resetResults();

  const origin = originInput.value.trim().toUpperCase();
  if (!origin) {
    showError("Origin is required");
    return;
  }

  if (!selectedDestinations.length) {
    showError("Please select at least one destination");
    return;
  }

  const tripType = tripTypeEl.value as TripType;
  const adults = Number.parseInt(adultsInput.value, 10) || 1;
  const seatType = seatTypeInput.value;

  const payload: Record<string, string | number> = {
    origin,
    destinations: selectedDestinations.join(","),
    from_date: fromDateInput.value,
    to_date: toDateInput.value,
    seat_type: seatType,
    trip_type: tripType,
    adults,
  };

  if (tripType === "ROUND_TRIP") {
    payload.duration = Number.parseInt(durationInput.value, 10) || 7;
  }

  searchBtn.disabled = true;
  searchBtn.innerHTML = `<span class="spinner"></span>Searching...`;

  try {
    const response = await fetch("/api/search/dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as DatePriceResponse[] | { detail?: string };

    if (!response.ok || !Array.isArray(data)) {
      showError("detail" in data ? data.detail ?? "Search failed" : "Search failed");
      return;
    }

    if (!data.length) {
      showError("No results found for this route and date range.");
      return;
    }

    renderDateResults(data, origin, tripType, adults, seatType);
  } catch (error) {
    showError(`Network error: ${(error as Error).message}`);
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = "Search Cheapest Dates";
  }
});

setDefaultDates();
void loadAirports();
