// --- Airport autocomplete ---
async function loadAirports() {
  const res = await fetch("/api/airports");
  const airports = await res.json();
  const datalist = document.getElementById("airports");
  for (const ap of airports) {
    const opt = document.createElement("option");
    opt.value = ap.code;
    opt.label = `${ap.code} — ${ap.name}`;
    datalist.appendChild(opt);
  }
  document.getElementById("destination").placeholder = "e.g. LHR";
  document.getElementById("origin").placeholder = "e.g. JFK";
}

// --- Destination chips ---
const destinations = new Set();

function renderChips() {
  const container = document.getElementById("destChips");
  container.innerHTML = "";
  for (const code of destinations) {
    const chip = document.createElement("span");
    chip.className = "dest-chip";
    chip.innerHTML = `${code} <span class="dest-chip-remove" data-code="${code}">×</span>`;
    container.appendChild(chip);
  }
}

document.getElementById("destChips").addEventListener("click", (e) => {
  const code = e.target.dataset.code;
  if (code) {
    destinations.delete(code);
    renderChips();
  }
});

document.getElementById("destination").addEventListener("change", (e) => {
  const val = e.target.value.trim().toUpperCase().slice(0, 3);
  if (val.length === 3) {
    destinations.add(val);
    renderChips();
    e.target.value = "";
  }
});

document.getElementById("destination").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const val = e.target.value.trim().toUpperCase().slice(0, 3);
    if (val.length === 3) {
      destinations.add(val);
      renderChips();
      e.target.value = "";
    }
  }
});

// --- Trip type toggle ---
document.getElementById("tripType").addEventListener("change", (e) => {
  document.getElementById("durationGroup").style.display =
    e.target.value === "ROUND_TRIP" ? "" : "none";
});

// --- Helpers ---
function showError(msg) {
  const box = document.getElementById("errorBox");
  box.textContent = msg;
  box.style.display = msg ? "" : "none";
}

function fmtPrice(p) {
  return "$" + Number(p).toLocaleString();
}

function fmtDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

// --- Date search ---
document.getElementById("searchForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  showError("");

  if (destinations.size === 0) {
    showError("Add at least one destination.");
    return;
  }

  const btn = document.getElementById("searchBtn");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Searching…`;

  document.getElementById("datesSection").style.display = "none";
  document.getElementById("flightsSection").style.display = "none";

  const body = {
    origin: document.getElementById("origin").value.trim().toUpperCase(),
    destinations: [...destinations].join(","),
    from_date: document.getElementById("fromDate").value,
    to_date: document.getElementById("toDate").value,
    seat_type: document.getElementById("seatType").value,
    trip_type: document.getElementById("tripType").value,
    adults: Number(document.getElementById("adults").value),
  };

  if (body.trip_type === "ROUND_TRIP") {
    body.duration = Number(document.getElementById("duration").value);
  }

  try {
    const res = await fetch("/api/search/dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail ?? "Search failed");
    renderDates(data, body);
  } catch (err) {
    showError(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Search Cheapest Dates";
  }
});

function renderDates(rows, searchBody) {
  const section = document.getElementById("datesSection");
  const tbody = document.getElementById("datesBody");
  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">No results found.</td></tr>`;
    section.style.display = "";
    return;
  }

  rows.sort((a, b) => a.price - b.price);

  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.className = "clickable";
    tr.innerHTML = `
      <td>${row.date}</td>
      <td>${row.return_date ?? "—"}</td>
      <td>${row.destination}</td>
      <td class="price">${fmtPrice(row.price)}</td>
    `;
    tr.addEventListener("click", () => {
      document.querySelectorAll("#datesBody tr").forEach((r) => r.classList.remove("selected"));
      tr.classList.add("selected");
      loadFlights(row, searchBody);
    });
    tbody.appendChild(tr);
  }

  section.style.display = "";
}

// --- Flight search ---
async function loadFlights(dateRow, searchBody) {
  const section = document.getElementById("flightsSection");
  const list = document.getElementById("flightsList");
  const title = document.getElementById("flightsSectionTitle");

  title.textContent = `Flights to ${dateRow.destination} on ${dateRow.date}`;
  list.innerHTML = `<div class="empty"><span class="spinner" style="border-color:rgba(0,0,0,.15);border-top-color:var(--accent)"></span></div>`;
  section.style.display = "";
  section.scrollIntoView({ behavior: "smooth", block: "start" });
  showError("");

  const body = {
    origin: searchBody.origin,
    destination: dateRow.destination,
    date: dateRow.date,
    seat_type: searchBody.seat_type,
    trip_type: searchBody.trip_type,
    adults: searchBody.adults,
  };
  if (dateRow.return_date) body.return_date = dateRow.return_date;

  try {
    const res = await fetch("/api/search/flights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail ?? "Flight search failed");
    renderFlights(data);
  } catch (err) {
    showError(err.message);
    list.innerHTML = "";
  }
}

function renderFlights(flights) {
  const list = document.getElementById("flightsList");
  list.innerHTML = "";

  if (!flights.length) {
    list.innerHTML = `<div class="empty">No flights found.</div>`;
    return;
  }

  for (const f of flights) {
    const stops = f.stops === 0 ? "Nonstop" : `${f.stops} stop${f.stops > 1 ? "s" : ""}`;
    const legsHtml = f.legs.map((leg) => `
      <div class="leg">
        <span class="leg-airports">${leg.departure_airport} → ${leg.arrival_airport}</span>
        <span class="leg-airline">${leg.airline}${leg.flight_number ? " · " + leg.flight_number : ""}</span>
        <span class="leg-time">${fmtTime(leg.departure_time)} – ${fmtTime(leg.arrival_time)}</span>
        <span class="leg-time">${fmtDuration(leg.duration_minutes)}</span>
      </div>
    `).join("");

    const card = document.createElement("div");
    card.className = "flight-card";
    card.innerHTML = `
      <div class="flight-card-header">
        <span class="flight-price">${fmtPrice(f.price)}</span>
        <span class="flight-meta">${fmtDuration(f.duration_minutes)} · ${stops}</span>
      </div>
      ${legsHtml}
    `;
    list.appendChild(card);
  }
}

// --- Init ---
loadAirports();
