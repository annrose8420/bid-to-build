/* ==========================================================
   ROSELLE – Campus Fest
   1. Data            4. Cards & filters
   2. State/storage   5. Registration form & validation
   3. Small helpers   6. Success pop-up & ticket download
                      7. Event listeners (start-up)
   ========================================================== */

/* ---------- 1. Data ---------- */

// Dummy events. "accent" picks the card colour class in style.css.
const EVENTS = [
  { id: 1, name: 'Battle of Bands', category: 'Music', date: '14', day: 'FRI', time: '6:30 PM',  venue: 'Main Stage',       seats: 24, accent: 'coral', glyph: '♪',        description: 'Campus bands turn up the volume for one electric night.' },
  { id: 2, name: 'Code Carnival',   category: 'Tech',  date: '15', day: 'SAT', time: '10:00 AM', venue: 'Innovation Lab',   seats: 18, accent: 'lilac', glyph: '&lt;/&gt;', description: 'Build, break and pitch a playful prototype in six hours.' },
  { id: 3, name: 'Street Canvas',   category: 'Art',   date: '15', day: 'SAT', time: '2:00 PM',  venue: 'North Quad',       seats: 31, accent: 'peach', glyph: '✦',        description: 'Make a collaborative mural with artists from across campus.' },
  { id: 4, name: 'Rhythm Rush',     category: 'Dance', date: '15', day: 'SAT', time: '7:30 PM',  venue: 'Open Air Theatre', seats: 8,  accent: 'pink',  glyph: '↝',        description: 'Crews collide in a fast, fearless inter-college dance-off.' },
  { id: 5, name: 'Frame by Frame',  category: 'Film',  date: '16', day: 'SUN', time: '11:00 AM', venue: 'Auditorium',       seats: 0,  accent: 'blue',  glyph: '▶',        description: 'A showcase of bold student shorts, stories and animation.' },
  { id: 6, name: 'Laugh Track',     category: 'Stage', date: '16', day: 'SUN', time: '5:00 PM',  venue: 'Amphitheatre',     seats: 12, accent: 'mint',  glyph: '!',        description: 'Quick wit, crowd work and fresh voices take the mic.' }
];

const CATEGORIES = ['All', 'Music', 'Tech', 'Art', 'Dance', 'Film', 'Stage'];

// Phone rules per country: "dial" = country code, "pattern" = what the number must look like
// once the country code and leading zero are removed.
const COUNTRY_PHONE_RULES = {
  IN: { name: 'India',              dial: '91',  example: '+91 98765 43210',  pattern: /^[6-9]\d{9}$/ },
  US: { name: 'the United States',  dial: '1',   example: '+1 415 555 2671',  pattern: /^[2-9]\d{2}[2-9]\d{6}$/ },
  CA: { name: 'Canada',             dial: '1',   example: '+1 416 555 2671',  pattern: /^[2-9]\d{2}[2-9]\d{6}$/ },
  GB: { name: 'the United Kingdom', dial: '44',  example: '+44 7700 900123',  pattern: /^(?:7\d{9}|0?7\d{9}|[1-2]\d{9,10})$/ },
  AU: { name: 'Australia',          dial: '61',  example: '+61 412 345 678',  pattern: /^(?:4\d{8}|04\d{8})$/ },
  DE: { name: 'Germany',            dial: '49',  example: '+49 1512 3456789', pattern: /^(?:1\d{9,10}|0?1\d{9,10})$/ },
  FR: { name: 'France',             dial: '33',  example: '+33 6 12 34 56 78', pattern: /^(?:[67]\d{8}|0[67]\d{8})$/ },
  SG: { name: 'Singapore',          dial: '65',  example: '+65 8123 4567',    pattern: /^[689]\d{7}$/ },
  AE: { name: 'the UAE',            dial: '971', example: '+971 50 123 4567', pattern: /^(?:5\d{8}|05\d{8})$/ }
};

/* ---------- 2. State & storage (kept in the browser so it survives a refresh) ---------- */

/** Read JSON from localStorage; return the fallback if missing or broken. */
function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

/** Write to localStorage; ignore errors (for example private mode). */
function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked – the site still works, it just won't remember */
  }
}

let activeCategory = 'All';
let searchText = '';
let showSavedOnly = false;      // true when "My events" is on
let currentEvent = null;        // event the registration form is open for
let lastTicket = null;          // { name, event } used by "Download ticket"

let savedIds = readStorage('roselle-saved', []);          // bookmarked event ids
let registrations = readStorage('roselle-registrations', {}); // { eventId: number of sign-ups }

const saveToStorage = () => {
  writeStorage('roselle-saved', savedIds);
  writeStorage('roselle-registrations', registrations);
};

/* ---------- 3. Small helpers ---------- */

const $ = selector => document.querySelector(selector);

const eventGrid       = $('#event-grid');
const emptyState      = $('#empty-state');
const savedNotice     = $('#saved-notice');
const savedToggle     = $('#saved-toggle');
const registerBackdrop = $('#registration-backdrop');
const successBackdrop = $('#success-backdrop');
const form            = $('#registration-form');

/** Inline SVG icons. "filled" makes the shape solid (used for saved bookmarks). */
function icon(name, filled = false) {
  const shapes = {
    search:   '<circle cx="11" cy="11" r="6"></circle><path d="m16 16 4 4"></path>',
    bookmark: '<path d="M6.5 4.5h11v16l-5.5-3.2-5.5 3.2z"></path>',
    close:    '<path d="m5 5 14 14"></path><path d="M19 5 5 19"></path>',
    moon:     '<path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"></path>'
  };
  return `<svg aria-hidden="true" class="icon" fill="${filled ? 'currentColor' : 'none'}" viewBox="0 0 24 24">${shapes[name]}</svg>`;
}

// Fill every <span class="icon-slot" data-icon="..."> in the HTML
document.querySelectorAll('.icon-slot').forEach(slot => {
  slot.innerHTML = icon(slot.dataset.icon);
});

/** Seats still free = total seats minus sign-ups on this browser. */
const seatsLeft = event => Math.max(0, event.seats - (registrations[event.id] || 0));

/* ---------- 4. Cards & filters ---------- */

function renderCategories() {
  $('#categories').innerHTML = CATEGORIES.map(category =>
    `<button class="${category === activeCategory ? 'active' : ''}" data-category="${category}" type="button">${category}</button>`
  ).join('');
}

function cardHTML(event, index) {
  const left = seatsLeft(event);
  const isFull = left === 0;
  const isSaved = savedIds.includes(event.id);

  return `
    <article class="event-card ${event.accent}">
      <div class="card-top">
        <span class="event-number">0${index + 1}</span>
        <button aria-label="${isSaved ? 'Remove' : 'Save'} ${event.name}" class="save-button" data-save="${event.id}" type="button">${icon('bookmark', isSaved)}</button>
      </div>
      <div class="card-glyph" aria-hidden="true">${event.glyph}</div>
      <p class="event-category">${event.category}</p>
      <h3>${event.name}</h3>
      <p class="event-description">${event.description}</p>
      <div class="event-details">
        <div class="date-block"><b>${event.date}</b><span>MAR · ${event.day}</span></div>
        <div><span>${event.time}</span><span>${event.venue}</span></div>
      </div>
      <div class="card-footer">
        <span class="seat-count ${isFull ? 'full' : ''}">${isFull ? 'FULL' : `${left} SEATS LEFT`}</span>
        <button class="register-button" data-register="${event.id}" ${isFull ? 'disabled' : ''} type="button">${isFull ? 'JOIN WAITLIST' : 'REGISTER'} <span>↗</span></button>
      </div>
    </article>`;
}

/** Show the events that match the category, the search text and (optionally) "saved only". */
function renderEvents() {
  const visible = EVENTS.filter(event => {
    const matchesCategory = activeCategory === 'All' || event.category === activeCategory;
    const matchesSearch   = event.name.toLowerCase().includes(searchText.toLowerCase());
    const matchesSaved    = !showSavedOnly || savedIds.includes(event.id);
    return matchesCategory && matchesSearch && matchesSaved;
  });

  eventGrid.innerHTML = visible.map(cardHTML).join('');
  emptyState.hidden = visible.length > 0;
  savedNotice.hidden = !showSavedOnly;
  savedToggle.classList.toggle('active', showSavedOnly);
  savedToggle.querySelector('.icon-slot').innerHTML = icon('bookmark', showSavedOnly);
}

function toggleSaved(id) {
  savedIds = savedIds.includes(id) ? savedIds.filter(savedId => savedId !== id) : [...savedIds, id];
  saveToStorage();
  renderEvents();
}

/* ---------- 5. Registration form & validation ---------- */

function openRegistration(event) {
  currentEvent = event;
  form.reset();
  clearErrors();
  $('#modal-event').innerHTML = `
    <span>${event.category}</span>
    <b>${event.name}</b>
    <span>${event.date} MAR · ${event.time}</span>`;
  registerBackdrop.hidden = false;
  form.elements.name.focus();
}

function closeRegistration() {
  registerBackdrop.hidden = true;
  currentEvent = null;
}

function clearErrors() {
  form.querySelectorAll('small[data-error]').forEach(message => { message.textContent = ''; });
  form.querySelectorAll('input, select').forEach(field => field.removeAttribute('aria-invalid'));
}

/** errors looks like { name: "message", email: "message" } */
function showErrors(errors) {
  Object.entries(errors).forEach(([field, message]) => {
    form.elements[field].setAttribute('aria-invalid', 'true');
    form.querySelector(`[data-error="${field}"]`).textContent = message;
  });
}

/** True when the phone number fits the chosen country (country code is optional). */
function validPhoneForCountry(value, country) {
  const rule = COUNTRY_PHONE_RULES[country];
  if (!rule) return false;
  let digits = value.replace(/\D/g, '');
  if (value.trim().startsWith('+') && digits.startsWith(rule.dial)) {
    digits = digits.slice(rule.dial.length);
  }
  return rule.pattern.test(digits);
}

/** Check every field and return an object of error messages (empty = all good). */
function validateForm(values) {
  const errors = {};
  if (!/^[A-Za-zÀ-ž][A-Za-zÀ-ž' .-]{1,59}$/.test(values.name))
    errors.name = 'Enter a valid full name using letters.';
  if (!(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email) && values.email.length <= 254))
    errors.email = 'Enter a valid personal email address.';
  if (values.college.length < 2 || values.college.length > 100)
    errors.college = 'Enter a valid college name.';
  if (!COUNTRY_PHONE_RULES[values.country])
    errors.country = 'Please select your country.';
  if (!values.phone)
    errors.phone = 'Please enter your phone number.';
  else if (values.country && !validPhoneForCountry(values.phone, values.country))
    errors.phone = `Enter a valid phone number for ${COUNTRY_PHONE_RULES[values.country].name}.`;
  return errors;
}

function handleSubmit(submitEvent) {
  submitEvent.preventDefault();
  if (!currentEvent) return;
  clearErrors();

  const data = new FormData(form);
  const values = {
    name:    String(data.get('name') || '').trim(),
    email:   String(data.get('email') || '').trim(),
    college: String(data.get('college') || '').trim(),
    country: String(data.get('country') || ''),
    phone:   String(data.get('phone') || '').trim()
  };

  const errors = validateForm(values);
  if (Object.keys(errors).length) {
    showErrors(errors);
    form.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }

  // Valid: take one seat, remember it, close the form and celebrate
  const event = currentEvent;
  registrations[event.id] = (registrations[event.id] || 0) + 1;
  saveToStorage();
  closeRegistration();
  renderEvents();
  showSuccess(values.name, event);
}

/* ---------- 6. Success pop-up & ticket download ---------- */

function showSuccess(name, event) {
  lastTicket = { name, event };
  $('#success-title').textContent = `You’re in, ${name}!`;
  $('#success-message').innerHTML = `Your spot for <b>${event.name}</b> is officially saved. We’ll see you at Roselle.`;
  successBackdrop.hidden = false;
}

function closeSuccess() {
  successBackdrop.hidden = true;
  lastTicket = null;
}

/** Draws the ticket on a canvas and saves it as a PNG image. */
function downloadTicket() {
  if (!lastTicket) return;
  const { name, event } = lastTicket;

  const canvas = document.createElement('canvas');
  canvas.width = 1400;
  canvas.height = 650;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const text = (content, x, y, maxWidth) => ctx.fillText(content, x, y, maxWidth);

  // Paper background with a faint grid
  ctx.fillStyle = '#fffaf2';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(133, 21, 44, 0.16)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= canvas.width; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
  for (let y = 0; y <= canvas.height; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }

  // Pink top bar, red stub, border and dashed tear line
  ctx.fillStyle = '#ffc8d9';
  ctx.fillRect(0, 0, canvas.width, 105);
  ctx.fillStyle = '#85152c';
  ctx.fillRect(1010, 105, 390, 545);
  ctx.strokeStyle = '#85152c';
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
  ctx.setLineDash([14, 12]);
  ctx.beginPath(); ctx.moveTo(1010, 125); ctx.lineTo(1010, 625); ctx.stroke();
  ctx.setLineDash([]);

  // Text
  ctx.fillStyle = '#85152c';
  ctx.font = '700 42px Georgia, serif';             text('ROSELLE', 64, 70);
  ctx.font = '500 22px monospace';                  text('OFFICIAL FEST PASS  ·  2025', 940, 66);
  ctx.font = 'italic 28px Georgia, serif';          text('A little wild. A lot wonderful.', 64, 160);
  ctx.font = '400 82px Georgia, serif';             text(event.name, 64, 285, 850);
  ctx.font = '500 20px monospace';
  text('ADMIT ONE', 68, 345);
  text(event.category.toUpperCase(), 250, 345);
  text(`${event.date} MAR · ${event.day}`, 68, 420);
  text(event.time, 360, 420);
  text(event.venue.toUpperCase(), 68, 475);
  ctx.font = '400 31px Georgia, serif';             text(`Guest: ${name}`, 68, 560);

  // Stub text (centred, cream colour)
  ctx.fillStyle = '#fffaf2';
  ctx.textAlign = 'center';
  ctx.font = '400 108px Georgia, serif';            text('R', 1205, 320);
  ctx.font = '500 18px monospace';
  text('KEEP THIS TICKET', 1205, 405);
  text('PRESENT AT ENTRY', 1205, 438);
  ctx.font = '400 26px Georgia, serif';             text('roselle fest', 1205, 540);

  // Trigger the download
  const link = document.createElement('a');
  link.download = `roselle-${event.name.toLowerCase().replace(/\s+/g, '-')}-ticket.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/* ---------- 7. Event listeners & start-up ---------- */

// Category buttons
$('#categories').addEventListener('click', click => {
  const button = click.target.closest('[data-category]');
  if (!button) return;
  activeCategory = button.dataset.category;
  renderCategories();
  renderEvents();
});

// Card buttons: bookmark or register (one listener for the whole grid)
eventGrid.addEventListener('click', click => {
  const saveButton = click.target.closest('[data-save]');
  if (saveButton) return toggleSaved(Number(saveButton.dataset.save));

  const registerButton = click.target.closest('[data-register]');
  if (registerButton && !registerButton.disabled) {
    openRegistration(EVENTS.find(event => event.id === Number(registerButton.dataset.register)));
  }
});

// Search box
$('#event-search').addEventListener('input', input => {
  searchText = input.target.value;
  renderEvents();
});

// "My events" button and "View all" link
savedToggle.addEventListener('click', () => {
  showSavedOnly = !showSavedOnly;
  renderEvents();
  $('#events').scrollIntoView({ behavior: 'smooth' });
});
$('#view-all').addEventListener('click', () => {
  showSavedOnly = false;
  renderEvents();
});

// Dark mode (remembered between visits)
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  writeStorage('roselle-theme', theme);
}
$('#theme-toggle').addEventListener('click', () => {
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});
document.documentElement.dataset.theme = readStorage('roselle-theme', 'light');

// Choosing a country updates the phone placeholder and clears old phone errors
form.elements.country.addEventListener('change', change => {
  const rule = COUNTRY_PHONE_RULES[change.target.value];
  form.elements.phone.placeholder = rule ? rule.example : 'Select a country first';
  ['country', 'phone'].forEach(field => {
    form.elements[field].removeAttribute('aria-invalid');
    form.querySelector(`[data-error="${field}"]`).textContent = '';
  });
});

// Pop-ups: close buttons, clicking outside, Escape key
$('#registration-close').addEventListener('click', closeRegistration);
registerBackdrop.addEventListener('mousedown', click => { if (click.target === registerBackdrop) closeRegistration(); });
successBackdrop.addEventListener('mousedown', click => { if (click.target === successBackdrop) closeSuccess(); });
document.addEventListener('keydown', key => {
  if (key.key !== 'Escape') return;
  closeRegistration();
  closeSuccess();
});

form.addEventListener('submit', handleSubmit);
$('#download-ticket').addEventListener('click', downloadTicket);
$('#success-close').addEventListener('click', closeSuccess);

// First paint
renderCategories();
renderEvents();
