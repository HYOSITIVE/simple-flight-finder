import flatpickr from 'flatpickr';
import TomSelect from 'tom-select';
import { Notyf } from 'notyf';

import 'flatpickr/dist/flatpickr.min.css';
import 'notyf/notyf.min.css';
import 'tom-select/dist/css/tom-select.css';
import './styles.css';

const app = document.querySelector('#app');

app.innerHTML = `
  <main class="page-shell">
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Simple Flight Finder</p>
        <h1>Search flexible dates without using a hostile airline UI.</h1>
        <p class="hero-text">
          Compare multiple destinations, spot the cheapest departure window, and drill into real flight options from one clean screen.
        </p>
        <div class="hero-metrics">
          <div class="metric">
            <span class="metric-label">Destinations</span>
            <strong id="airportCount">Loading...</strong>
          </div>
          <div class="metric">
            <span class="metric-label">Search Mode</span>
            <strong>Multi-city flexible scan</strong>
          </div>
        </div>
      </div>
      <div class="search-panel glass-card">
        <form id="searchForm" class="search-form">
          <div class="form-grid">
            <label class="field">
              <span>Origin</span>
              <select id="origin" placeholder="Choose an origin airport"></select>
            </label>
            <label class="field">
              <span>Destination(s)</span>
              <select id="destinations" multiple placeholder="Add one or more destinations"></select>
            </label>
            <label class="field">
              <span>From Date</span>
              <input type="text" id="fromDate" placeholder="Select start date" required />
            </label>
            <label class="field">
              <span>To Date</span>
              <input type="text" id="toDate" placeholder="Select end date" required />
            </label>
            <label class="field">
              <span>Cabin Class</span>
              <select id="seatType">
                <option value="ECONOMY">Economy</option>
                <option value="PREMIUM_ECONOMY">Premium Economy</option>
                <option value="BUSINESS">Business</option>
                <option value="FIRST">First</option>
              </select>
            </label>
            <label class="field">
              <span>Trip Type</span>
              <select id="tripType">
                <option value="ONE_WAY">One Way</option>
                <option value="ROUND_TRIP">Round Trip</option>
              </select>
            </label>
            <label class="field" id="durationField" hidden>
              <span>Duration</span>
              <input type="number" id="duration" min="1" max="30" value="7" />
            </label>
            <label class="field">
              <span>Adults</span>
              <input type="number" id="adults" min="1" max="9" value="1" />
            </label>
          </div>
          <div class="panel-actions">
            <p class="helper-copy">Pick dates, scan low fares, then click a row to load flight details.</p>
            <button type="submit" id="searchBtn" class="primary-btn">Search Cheapest Dates</button>
          </div>
        </form>
      </div>
    </section>

    <section class="results-grid">
      <article class="results-card glass-card" id="datesSection" hidden>
        <div class="section-header">
          <div>
            <p class="section-kicker">Cheapest dates</p>
            <h2 id="datesSectionTitle">Flexible date results</h2>
          </div>
        </div>
        <div id="datesList" class="date-groups"></div>
      </article>

      <article class="results-card glass-card" id="flightsSection" hidden>
        <div class="section-header">
          <div>
            <p class="section-kicker">Flight options</p>
            <h2 id="flightsSectionTitle">Pick a fare to inspect flights</h2>
          </div>
        </div>
        <div id="flightsList" class="flight-list empty-state">
          Select a result on the left to load matching flights.
        </div>
      </article>
    </section>
  </main>
`;

const form = document.querySelector('#searchForm');
const searchBtn = document.querySelector('#searchBtn');
const datesSection = document.querySelector('#datesSection');
const datesSectionTitle = document.querySelector('#datesSectionTitle');
const datesList = document.querySelector('#datesList');
const flightsSection = document.querySelector('#flightsSection');
const flightsSectionTitle = document.querySelector('#flightsSectionTitle');
const flightsList = document.querySelector('#flightsList');
const durationField = document.querySelector('#durationField');
const airportCount = document.querySelector('#airportCount');

const notyf = new Notyf({
  duration: 4000,
  position: { x: 'right', y: 'top' },
  types: [
    {
      type: 'error',
      background: '#d14343',
      duration: 5000,
    },
  ],
});

const seatTypeSelect = new TomSelect('#seatType', {
  create: false,
  allowEmptyOption: false,
  controlInput: null,
});

const tripTypeSelect = new TomSelect('#tripType', {
  create: false,
  allowEmptyOption: false,
  controlInput: null,
});

function forceTomSelectInputTheme(instance) {
  const applyInputTheme = () => {
    if (!instance.control_input) return;

    instance.control_input.style.setProperty('color', '#f9fbff', 'important');
    instance.control_input.style.setProperty('-webkit-text-fill-color', '#f9fbff', 'important');
    instance.control_input.style.setProperty('caret-color', '#f9fbff', 'important');
    instance.control_input.style.setProperty('opacity', '1', 'important');
  };

  applyInputTheme();

  instance.on('initialize', applyInputTheme);
  instance.on('dropdown_open', applyInputTheme);
  instance.on('type', applyInputTheme);
  instance.on('focus', applyInputTheme);

  const observer = new MutationObserver(applyInputTheme);
  observer.observe(instance.control_input, {
    attributes: true,
    attributeFilter: ['style'],
  });
}

const originSelect = new TomSelect('#origin', {
  valueField: 'code',
  labelField: 'label',
  searchField: ['code', 'name', 'city', 'full_name'],
  maxItems: 1,
  maxOptions: null,
  create: false,
  placeholder: 'Choose an origin airport',
  sortField: [
    { field: 'code', direction: 'asc' },
  ],
  render: {
    option(item, escape) {
      return `<div class="airport-option"><strong>${escape(item.code)}</strong><span>${escape(item.full_name || item.name)}</span></div>`;
    },
    item(item, escape) {
      return `<div>${escape(item.code)}</div>`;
    },
  },
});
forceTomSelectInputTheme(originSelect);

const destinationSelect = new TomSelect('#destinations', {
  valueField: 'code',
  labelField: 'label',
  searchField: ['code', 'name', 'city', 'full_name'],
  plugins: {
    remove_button: { title: 'Remove this destination' },
  },
  create: false,
  persist: false,
  maxOptions: null,
  placeholder: 'Add one or more destinations',
  sortField: [
    { field: 'code', direction: 'asc' },
  ],
  onItemAdd() {
    this.setTextboxValue('');
    this.refreshOptions();
  },
  render: {
    option(item, escape) {
      return `<div class="airport-option"><strong>${escape(item.code)}</strong><span>${escape(item.full_name || item.name)}</span></div>`;
    },
    item(item, escape) {
      return `<div>${escape(item.code)}</div>`;
    },
  },
});
forceTomSelectInputTheme(destinationSelect);

const today = new Date();
const fromDefault = new Date(today);
fromDefault.setDate(today.getDate() + 14);
const toDefault = new Date(today);
toDefault.setDate(today.getDate() + 28);

flatpickr('#fromDate', {
  dateFormat: 'Y-m-d',
  defaultDate: fromDefault,
  minDate: 'today',
});

flatpickr('#toDate', {
  dateFormat: 'Y-m-d',
  defaultDate: toDefault,
  minDate: 'today',
});

let selectedFareCard = null;

function toggleDurationField() {
  durationField.hidden = tripTypeSelect.getValue() !== 'ROUND_TRIP';
}

function setSearchState(loading) {
  searchBtn.disabled = loading;
  searchBtn.textContent = loading ? 'Searching...' : 'Search Cheapest Dates';
}

function formatDate(dateStr) {
  if (!dateStr) return 'One way';
  const date = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(isoStr) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoStr));
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function setEmptyFlights(message) {
  flightsSection.hidden = false;
  flightsList.className = 'flight-list empty-state';
  flightsList.textContent = message;
}

function renderFlights(flights) {
  if (!flights.length) {
    setEmptyFlights('No flights found for this date.');
    return;
  }

  flightsList.className = 'flight-list';
  flightsList.innerHTML = flights.map((flight) => {
    const legs = flight.legs.map((leg) => `
      <div class="leg-row">
        <div class="leg-route">
          <strong>${leg.departure_airport} to ${leg.arrival_airport}</strong>
          <span>${leg.airline} ${leg.flight_number}</span>
        </div>
        <div class="leg-time">
          <strong>${formatDateTime(leg.departure_time)}</strong>
          <span>${formatDateTime(leg.arrival_time)}</span>
        </div>
        <div class="leg-length">${formatDuration(leg.duration_minutes)}</div>
      </div>
    `).join('');

    return `
      <article class="flight-card">
        <div class="flight-card-header">
          <div>
            <p class="price-tag">$${flight.price.toFixed(2)}</p>
            <p class="flight-summary">${flight.stops === 0 ? 'Nonstop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`} · ${formatDuration(flight.duration_minutes)}</p>
          </div>
        </div>
        <div class="legs">${legs}</div>
      </article>
    `;
  }).join('');
}

async function loadFlights(row, card, origin, destination, tripType, adults, seatType) {
  if (selectedFareCard) selectedFareCard.classList.remove('selected');
  selectedFareCard = card;
  card.classList.add('selected');

  flightsSection.hidden = false;
  flightsSectionTitle.textContent = `${origin} to ${destination} on ${formatDate(row.date)}`;
  flightsList.className = 'flight-list loading-state';
  flightsList.textContent = 'Loading flights...';

  const payload = {
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
    const response = await fetch('/api/search/flights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      setEmptyFlights(data.detail || 'Failed to load flights.');
      notyf.error(data.detail || 'Failed to load flights.');
      return;
    }

    renderFlights(data);
  } catch (error) {
    setEmptyFlights(`Network error: ${error.message}`);
    notyf.error(`Network error: ${error.message}`);
  }
}

function renderDateGroups(results, origin, tripType, adults, seatType) {
  const grouped = results.reduce((acc, row) => {
    if (!acc[row.destination]) acc[row.destination] = [];
    acc[row.destination].push(row);
    return acc;
  }, {});

  datesList.innerHTML = '';

  Object.keys(grouped).sort().forEach((destination) => {
    const destinationRows = grouped[destination].sort((a, b) => a.price - b.price);
    const group = document.createElement('section');
    group.className = 'date-group';

    const rowsMarkup = destinationRows
      .map((row, index) => `
        <button type="button" class="fare-card" data-row-index="${index}">
          <div>
            <p class="fare-date">${formatDate(row.date)}</p>
            <p class="fare-return">${formatDate(row.return_date)}</p>
          </div>
          <div class="fare-price">$${row.price.toFixed(2)}</div>
        </button>
      `)
      .join('');

    group.innerHTML = `
      <div class="date-group-header">
        <h3>${origin} to ${destination}</h3>
        <span>${destinationRows.length} fare option${destinationRows.length > 1 ? 's' : ''}</span>
      </div>
      <div class="fare-grid">${rowsMarkup}</div>
    `;

    group.querySelectorAll('.fare-card').forEach((card) => {
      const row = destinationRows[Number(card.dataset.rowIndex)];
      card.addEventListener('click', () => loadFlights(row, card, origin, destination, tripType, adults, seatType));
    });

    datesList.appendChild(group);
  });
}

async function loadAirports() {
  try {
    const response = await fetch('/api/airports');
    const airports = await response.json();

    const options = airports.map((airport) => ({
      code: airport.code,
      name: airport.name,
      city: airport.city,
      full_name: airport.full_name,
      label: `${airport.code} · ${airport.name}`,
    }));

    originSelect.clearOptions();
    destinationSelect.clearOptions();
    originSelect.addOptions(options);
    destinationSelect.addOptions(options);
    airportCount.textContent = `${options.length} airports loaded`;
  } catch (error) {
    airportCount.textContent = 'Airport list unavailable';
    notyf.error(`Failed to load airport list: ${error.message}`);
  }
}

tripTypeSelect.on('change', toggleDurationField);
toggleDurationField();

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const origin = originSelect.getValue();
  const destinations = destinationSelect.getValue();
  const fromDate = document.querySelector('#fromDate').value;
  const toDate = document.querySelector('#toDate').value;
  const seatType = seatTypeSelect.getValue();
  const tripType = tripTypeSelect.getValue();
  const adults = parseInt(document.querySelector('#adults').value, 10) || 1;
  const duration = parseInt(document.querySelector('#duration').value, 10) || 7;

  if (!origin) {
    notyf.error('Select an origin airport.');
    return;
  }

  if (!destinations.length) {
    notyf.error('Select at least one destination.');
    return;
  }

  datesSection.hidden = true;
  flightsSection.hidden = true;
  datesList.innerHTML = '';
  flightsList.innerHTML = '';
  selectedFareCard = null;

  const payload = {
    origin,
    destinations: destinations.join(','),
    from_date: fromDate,
    to_date: toDate,
    adults,
    seat_type: seatType,
    trip_type: tripType,
  };

  if (tripType === 'ROUND_TRIP') {
    payload.duration = duration;
  }

  setSearchState(true);

  try {
    const response = await fetch('/api/search/dates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      notyf.error(data.detail || 'Search failed.');
      return;
    }

    if (!data.length) {
      notyf.error('No results found for this route and date range.');
      return;
    }

    datesSection.hidden = false;
    datesSectionTitle.textContent = `Cheapest dates from ${origin}`;
    renderDateGroups(data, origin, tripType, adults, seatType);
    setEmptyFlights('Select a fare card to load matching flights.');
  } catch (error) {
    notyf.error(`Network error: ${error.message}`);
  } finally {
    setSearchState(false);
  }
});

loadAirports();
