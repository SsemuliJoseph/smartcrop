/* ================================================================
   PotatoGuard — app.js
   Complete application logic
================================================================ */

'use strict';

/* ----------------------------------------------------------------
   CONSTANTS
---------------------------------------------------------------- */
const CFG        = window.POTATOGUARD_CONFIG || {};
const INFER_URL  = (CFG.INFERENCE_URL || '').replace(/\/+$/, '');     // model service (direct)
const STORE_KEY  = 'pg_history';
const USER_KEY   = 'pg_user';
const PREFS_KEY  = 'pg_prefs';

const DISEASES = ['Healthy','Late Blight','Early Blight','Bacterial Wilt'];

// Shown when the model is not confident - never guess a diagnosis.
const UNCERTAIN_DATA = {
  scientific: '', color: '#546E7A', severity: 0, sevLabel: 'Unclear',
  summary: 'The model is not confident about this photo, so no diagnosis is given. Retake it: one leaf, in daylight, filling most of the frame, in focus. If the plant looks unwell, ask your agricultural extension officer.',
  steps: ['Photograph a single leaf against a plain background.','Use natural daylight; avoid shadows and glare.','Fill the frame with the leaf and keep the phone steady.','Scan 2-3 different leaves from the affected plant.','If symptoms persist, contact an extension officer.'],
  prevention: ['Scout your field twice a week.','Use certified seed tubers and rotate crops.'],
  about: 'PotatoGuard only gives a diagnosis when the model is sufficiently confident. Blurry, dark or non-leaf photos are reported as unclear.'
};

const TREATMENT_DATA = {
  'Healthy': {
    scientific:  '',
    color:       '#2E7D32',
    severity:    0,
    sevLabel:    'None',
    summary:     'Your potato plant is healthy and growing well. No disease detected. Continue your current farming practices and monitor weekly.',
    steps:       ['Monitor leaves weekly for any spots or discolouration.','Maintain correct spacing (30–40 cm between plants) for air circulation.','Apply balanced NPK fertiliser at scheduled intervals.','Remove weeds that compete for nutrients.','Keep records of all scans to track plant health over time.'],
    prevention:  ['Use certified disease-free seed tubers at planting.','Rotate crops each season to prevent soil-borne disease build-up.','Avoid overhead irrigation — water at the base of the plant.','Keep field clean of crop debris after harvest.','Scout your field at least twice a week during peak growing season.'],
    about:       'A healthy potato plant shows vibrant green leaves with no lesions, spots, or wilting. Proper crop management and preventive fungicide applications help maintain plant health throughout the growing season.'
  },
  'Late Blight': {
    scientific:  'Phytophthora infestans',
    color:       '#C62828',
    severity:    5,
    sevLabel:    'Critical',
    summary:     'Late Blight detected — this is the most serious potato disease and requires IMMEDIATE action. It can destroy your entire crop within 10–14 days without treatment.',
    steps:       ['Apply Mancozeb 80% WP at 2.5 kg/ha immediately — do not delay.','Alternatively, use Chlorothalonil 75% WP at 2 kg/ha.','Remove and burn or deep-bury all visibly infected leaves and plants.','Stop overhead irrigation — water at plant base only.','Re-apply fungicide every 7 days while wet/cool weather continues.','Notify neighbouring farmers so they can inspect their crops too.'],
    prevention:  ['Plant resistant varieties such as Victoria or Tigoni.','Apply preventive fungicide before rainy seasons begin.','Avoid planting in poorly drained, waterlogged fields.','Use certified, disease-free seed tubers only.','Never compost infected plant material — always burn or deep-bury.','Store harvested tubers in cool, dry, well-ventilated conditions.'],
    about:       'Late Blight is caused by Phytophthora infestans, the same pathogen responsible for the Irish Potato Famine of the 1840s. Water-soaked lesions appear on leaf edges, turn brown, and develop white fuzzy mould on the underside in humid conditions. Spreads rapidly by airborne spores in cool (10–25°C), wet weather.'
  },
  'Early Blight': {
    scientific:  'Alternaria solani',
    color:       '#E65100',
    severity:    3,
    sevLabel:    'Moderate',
    summary:     'Early Blight detected. This fungal disease starts on older lower leaves and moves upward. Treat promptly to prevent significant yield loss.',
    steps:       ['Apply Copper Oxychloride 50% WP at 2 kg/ha.','Or use a Mancozeb + Metalaxyl combination product.','Carefully remove all infected lower leaves before spraying.','Ensure adequate nitrogen fertilisation to strengthen the plant.','Spray every 10–14 days during humid periods.','Avoid working in the field when leaves are wet to prevent spreading spores.'],
    prevention:  ['Rotate crops — avoid planting potatoes in the same field for 2+ consecutive years.','Remove and destroy all crop debris after harvest.','Maintain good plant nutrition — stressed plants are most susceptible.','Apply preventive fungicide spray at canopy closure.','Choose varieties with good Early Blight tolerance where available.','Avoid over-watering which increases humidity around the plant.'],
    about:       'Early Blight is caused by the fungus Alternaria solani. It is identified by dark brown spots with distinctive concentric rings forming a "target" pattern, surrounded by a yellow halo. Starts on the lowest, oldest leaves and progresses upward. Favoured by warm (24–29°C), humid conditions alternating with dry periods.'
  },
  'Bacterial Wilt': {
    scientific:  'Ralstonia solanacearum',
    color:       '#4A148C',
    severity:    4,
    sevLabel:    'Severe',
    summary:     'Bacterial Wilt detected — there is NO chemical cure for this disease. Immediate removal of infected plants is essential to prevent the bacteria from spreading through the soil.',
    steps:       ['Remove and destroy all infected plants IMMEDIATELY — burn or deep-bury.','Do NOT compost infected material under any circumstances.','Disinfect all tools with a 1:9 bleach-to-water solution after touching infected plants.','Do not replant potatoes or tomatoes in the same field for at least 2–3 seasons.','Improve field drainage — waterlogged soils spread the bacteria rapidly.','Test remaining plants — isolate any showing early wilting symptoms.'],
    prevention:  ['Use only certified, disease-tested seed tubers from reputable suppliers.','Rotate with non-host crops: maize, wheat, beans, or sorghum for 2–3 years.','Avoid fields previously infected — bacteria survive in soil for 6+ years.','Practice strict tool hygiene — sterilise between each plant when scouting.','Improve field drainage with raised beds or drainage channels.','Never bring plants, soil, or equipment from infected fields to clean fields.'],
    about:       'Bacterial Wilt is caused by Ralstonia solanacearum (Race 3, Biovar 2). Infected plants wilt suddenly even when the soil has adequate moisture, beginning with the youngest leaves. A characteristic test is cutting the stem and placing it in water — bacterial ooze streams from the cut end. The bacteria can persist in soil for up to 6 years.'
  }
};

const TIPS_DATA = [
  { category:'planting', emoji:'🌱', title:'Best Planting Time', body:'Plant potatoes at the start of the rainy season when soil temperature is 10–18°C. Avoid planting during the hottest months as tubers may fail to sprout properly.' },
  { category:'planting', emoji:'🥔', title:'Seed Tuber Selection', body:'Use certified, disease-free seed tubers. Choose medium-sized tubers (50–80g) with at least 2–3 healthy eyes. Reject any tubers showing soft rot, discolouration, or wilt symptoms.' },
  { category:'planting', emoji:'📏', title:'Plant Spacing', body:'Space plants 30–40 cm apart in rows 70–80 cm apart. Correct spacing improves air circulation, reduces humidity, and makes it harder for fungal diseases to spread between plants.' },
  { category:'planting', emoji:'🌿', title:'Hilling Up', body:'Hill soil up around the base of plants when they reach 20–25 cm tall. This protects developing tubers from sunlight (which causes greening and toxicity) and supports plant stability.' },
  { category:'disease', emoji:'🔍', title:'Scout Twice Weekly', body:'Walk through your field twice per week and examine leaves carefully. Catching disease at its earliest stage — even just 3–5 infected plants — can save the entire crop.' },
  { category:'disease', emoji:'💊', title:'Fungicide Rotation', body:'Rotate between different fungicide modes of action every 2–3 sprays to prevent resistance building up. Never rely on only one product for an entire season.' },
  { category:'disease', emoji:'🌧️', title:'Spray Before Rain', body:'Apply fungicide 24–48 hours BEFORE expected heavy rain, not after. Rain washes off protective fungicides. Preventive spraying is far more effective than treating active infections.' },
  { category:'disease', emoji:'🧤', title:'Tool Hygiene', body:'Always disinfect pruning knives, hoes, and other tools between rows using a 10% bleach solution or 70% alcohol. This simple practice stops bacterial and fungal diseases spreading from plant to plant.' },
  { category:'soil', emoji:'🌍', title:'Soil pH Testing', body:'Potatoes thrive in slightly acidic soil (pH 5.0–6.0). Test your soil before each season. Apply lime to raise pH or sulphur to lower it. Correct pH dramatically improves nutrient uptake and yield.' },
  { category:'soil', emoji:'♻️', title:'Crop Rotation', body:'Never plant potatoes (or tomatoes, peppers, or aubergines) in the same field two years in a row. Rotate with maize, beans, or wheat. Rotation breaks disease cycles and restores soil nutrients.' },
  { category:'soil', emoji:'💧', title:'Irrigation Management', body:'Water at the base of the plant, not overhead. Wet foliage greatly increases fungal disease risk. Drip irrigation or furrow irrigation is ideal. Water in the morning so leaves dry before evening.' },
  { category:'soil', emoji:'🌾', title:'Organic Matter', body:'Incorporate 5–10 tonnes of well-rotted compost per hectare before planting. Organic matter improves soil drainage, water retention, and beneficial microbial activity that naturally suppresses some diseases.' },
  { category:'harvest', emoji:'⏰', title:'Harvest Timing', body:'Harvest 2 weeks after the vines have died back naturally. This allows tuber skins to "set" (harden), which dramatically reduces bruising, disease entry points, and storage losses.' },
  { category:'harvest', emoji:'☀️', title:'Cure Before Storing', body:'After harvest, spread tubers in the shade for 5–7 days to cure. Curing heals minor skin damage and reduces moisture content, greatly extending the storage life of your crop.' },
  { category:'harvest', emoji:'🌡️', title:'Harvest in Cool Conditions', body:'Harvest in the early morning or on cool, overcast days. High temperatures during harvest increase bruising and stress on tubers. Bruised tubers rot much faster in storage.' },
  { category:'storage', emoji:'📦', title:'Storage Conditions', body:'Store harvested potatoes in a cool (4–10°C), dark, well-ventilated space. Never store in direct sunlight — this causes greening and produces solanine, which is toxic and makes potatoes bitter.' },
  { category:'storage', emoji:'🪣', title:'Storage Containers', body:'Use wooden crates or woven sacks — never sealed plastic bags. Good airflow around stored tubers prevents moisture build-up and dramatically reduces post-harvest rot.' },
  { category:'storage', emoji:'🔎', title:'Regular Storage Checks', body:'Check stored potatoes weekly. Remove any rotting tubers immediately — one rotting tuber can spread soft rot to an entire store within 48–72 hours.' },
];

/* ----------------------------------------------------------------
   STATE
---------------------------------------------------------------- */
let currentUser    = null;
let scannedFile    = null;
let scannedDataUrl = null;
let lastResult     = null;
let allHistory     = [];
let userPrefs      = { dark: false, name: '', location: '', farmSize: '', phone: '' };

/* ================================================================
   INIT
================================================================ */
window.addEventListener('DOMContentLoaded', () => {
  loadPrefs();
  animateHeroStats();
  renderTips('all');
  setupWeather();
  loadModelStats();

  // Auto-login if session exists
  const saved = sessionStorage.getItem(USER_KEY);
  if (saved) {
    currentUser = JSON.parse(saved);
    enterApp();
  }
});

/* ================================================================
   LANDING HELPERS
================================================================ */
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function toggleMobileMenu() {
  document.getElementById('mobileMenu').classList.toggle('open');
}

// Animate the hero stat counters
function animateHeroStats() {
  document.querySelectorAll('.hstat-num[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target);
    let current  = 0;
    const step   = Math.max(1, Math.floor(target / 40));
    const timer  = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current;
      if (current >= target) clearInterval(timer);
    }, 30);
  });
}

/* ================================================================
   AUTH
================================================================ */
function openLoginModal() {
  document.getElementById('modalOverlay').classList.add('active');
  document.getElementById('loginModal').classList.add('active');
}

function closeModal() {
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
  document.getElementById('modalOverlay').classList.remove('active');
}

function switchAuthTab(tab) {
  document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('loginForm').style.display    = tab === 'login'    ? '' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? '' : 'none';
}

function doLogin() {
  const id   = document.getElementById('loginId').value.trim();
  const pass = document.getElementById('loginPass').value.trim();
  if (!id || !pass) { showToastMsg('Please enter your Farmer ID and password.', 'error'); return; }
  currentUser = { id, name: userPrefs.name || id };
  sessionStorage.setItem(USER_KEY, JSON.stringify(currentUser));
  closeModal();
  enterApp();
}

function doRegister() {
  const name = document.getElementById('regName').value.trim();
  const id   = document.getElementById('regId').value.trim();
  const loc  = document.getElementById('regLocation').value.trim();
  const pass = document.getElementById('regPass').value.trim();
  if (!name || !id || !pass) { showToastMsg('Please fill in all required fields.', 'error'); return; }
  currentUser = { id, name };
  userPrefs.name = name; userPrefs.location = loc;
  savePrefs();
  sessionStorage.setItem(USER_KEY, JSON.stringify(currentUser));
  closeModal();
  enterApp();
}

function doLogout() {
  sessionStorage.removeItem(USER_KEY);
  currentUser = null;
  document.getElementById('appShell').style.display = 'none';
  document.getElementById('page-landing').classList.add('active');
  window.scrollTo(0, 0);
  showToastMsg('Signed out successfully.', '');
}

function enterApp() {
  document.getElementById('page-landing').classList.remove('active');
  document.getElementById('appShell').style.display = 'flex';
  allHistory = loadHistory();
  updateUserUI();
  showPage('dashboard');
}

function updateUserUI() {
  if (!currentUser) return;
  const name    = userPrefs.name || currentUser.name || currentUser.id;
  const initial = (name.charAt(0) || 'F').toUpperCase();
  document.getElementById('sbUname').textContent      = name;
  document.getElementById('sbUid').textContent        = currentUser.id;
  document.getElementById('sbAvatar').textContent     = initial;
  document.getElementById('topbarAvatar').textContent = initial;
  document.getElementById('profileAvatarBig').textContent = (name.slice(0,2) || 'FA').toUpperCase();
  document.getElementById('profileName').textContent  = name;
  document.getElementById('profileIdBadge').textContent = currentUser.id;
  document.getElementById('profileLocationDisplay').textContent = userPrefs.location ? '📍 ' + userPrefs.location : '📍 Uganda';
}

/* ================================================================
   PAGE NAVIGATION
================================================================ */
function showPage(name) {
  // Update sidebar links
  document.querySelectorAll('.sb-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === name);
  });
  // Hide all app pages
  document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
  // Show target
  const el = document.getElementById('app-' + name);
  if (el) el.classList.add('active');
  // Update topbar title
  const titles = { dashboard:'Dashboard', scan:'Scan a Leaf', result:'Detection Result', history:'Scan History', library:'Disease Library', tips:'Farming Tips', reports:'Reports', profile:'My Profile', about:'About' };
  document.getElementById('topbarTitle').textContent = titles[name] || 'PotatoGuard';
  // Close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');
  // Page-specific setup
  if (name === 'dashboard') refreshDashboard();
  if (name === 'history')   renderHistoryTable();
  if (name === 'reports')   renderReports();
  if (name === 'profile')   populateProfile();
  if (name === 'tips')      renderTips('all');
  // Scroll to top
  if (el) el.scrollTop = 0;
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

/* ================================================================
   DASHBOARD
================================================================ */
function refreshDashboard() {
  allHistory = loadHistory();
  const total    = allHistory.length;
  const healthy  = allHistory.filter(r => r.disease === 'Healthy').length;
  const diseased = total - healthy;
  const rate     = total ? Math.round((healthy / total) * 100) : 0;

  // Stat cards
  animateCounter('statTotal',   total);
  animateCounter('statHealthy', healthy);
  animateCounter('statDiseased',diseased);
  document.getElementById('statRate').textContent = rate + '%';

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = userPrefs.name || (currentUser ? currentUser.name : 'Farmer');
  document.getElementById('dashGreeting').textContent = `${greeting}, ${name} 🌱`;

  // Disease breakdown bars
  const counts = { 'Healthy':0, 'Late Blight':0, 'Early Blight':0, 'Bacterial Wilt':0 };
  allHistory.forEach(r => { if (counts[r.disease] !== undefined) counts[r.disease]++; });
  const keys = { 'Healthy':'Healthy', 'Late Blight':'Late', 'Early Blight':'Early', 'Bacterial Wilt':'Wilt' };
  Object.entries(keys).forEach(([disease, key]) => {
    const pct = total ? Math.round((counts[disease] / total) * 100) : 0;
    setTimeout(() => {
      document.getElementById('bar' + key).style.width = pct + '%';
      document.getElementById('pct' + key).textContent = pct + '%';
    }, 200);
  });

  // Recent scans
  const recentEl = document.getElementById('recentScansList');
  const recent   = allHistory.slice(0, 5);
  if (!recent.length) {
    recentEl.innerHTML = '<div class="empty-state-small">No scans yet — <a onclick="showPage(\'scan\')" style="cursor:pointer;color:var(--green);">scan your first leaf!</a></div>';
  } else {
    recentEl.innerHTML = recent.map(r => {
      const color = (TREATMENT_DATA[r.disease] || {}).color || '#607D8B';
      const emoji = getEmoji(r.disease);
      const pct   = Math.round((r.confidence || 0) * 100);
      return `<div class="recent-item" style="border-left-color:${color}">
        <div class="ri-left">
          <span class="ri-emoji">${emoji}</span>
          <div><div class="ri-disease">${r.disease}</div><div class="ri-date">${formatDate(r.timestamp)}</div></div>
        </div>
        <span class="ri-pct" style="color:${color}">${pct}%</span>
      </div>`;
    }).join('');
  }

  // Alert banner
  const hasBad = allHistory.slice(0, 5).some(r => r.disease !== 'Healthy');
  const alertEl = document.getElementById('alertBanner');
  if (hasBad && allHistory.length > 0) {
    alertEl.style.display = 'flex';
    const worst = allHistory.find(r => r.disease === 'Late Blight' || r.disease === 'Bacterial Wilt');
    document.getElementById('alertText').textContent = worst
      ? `${worst.disease} detected in recent scans. Review the Disease Library for treatment steps.`
      : 'Disease detected in recent scans. Check your field urgently.';
  } else {
    alertEl.style.display = 'none';
  }

  // Summary for reports
  document.getElementById('sumTotal').textContent   = total;
  document.getElementById('sumHealthy').textContent = counts['Healthy'];
  document.getElementById('sumLate').textContent    = counts['Late Blight'];
  document.getElementById('sumEarly').textContent   = counts['Early Blight'];
  document.getElementById('sumWilt').textContent    = counts['Bacterial Wilt'];
  document.getElementById('sumRate').textContent    = rate + '%';
}

function animateCounter(id, target) {
  const el   = document.getElementById(id);
  let current = 0;
  const step  = Math.max(1, Math.floor(target / 30));
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 40);
}

function setWeatherUnavailable(place) {
  document.getElementById('weatherIcon').textContent = '🌡️';
  document.getElementById('weatherTemp').textContent = '--';
  document.getElementById('weatherDesc').textContent = 'Weather unavailable right now';
  ['wHumidity','wWind','wVis'].forEach(id => { document.getElementById(id).textContent = '--'; });
  document.getElementById('blightRisk').style.width = '0%';
  document.getElementById('riskLabel').textContent = 'Unknown';
  document.getElementById('weatherLocation').textContent = place || CFG.DEFAULT_PLACE || '';
}

// Real weather from Open-Meteo (free, no API key). Blight risk is a simple indicator from
// humidity + temperature (Late Blight favours cool, wet, humid conditions) - not a forecast model.
async function setupWeather(lat, lon, place) {
  lat = lat ?? CFG.DEFAULT_LAT; lon = lon ?? CFG.DEFAULT_LON;
  place = place || userPrefs.location || CFG.DEFAULT_PLACE || '';
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code';
    const r = await fetch(url);
    if (!r.ok) throw new Error('weather http ' + r.status);
    const c = (await r.json()).current;
    const code = c.weather_code;
    const icon = code === 0 ? '☀️' : code <= 2 ? '⛅' : code <= 48 ? '☁️' : code <= 67 ? '🌧️' : code <= 82 ? '🌦️' : '⛈️';
    const desc = code === 0 ? 'Clear sky' : code <= 2 ? 'Partly cloudy' : code <= 48 ? 'Cloudy / foggy' : code <= 67 ? 'Rain' : code <= 82 ? 'Showers' : 'Thunderstorm';
    const hum = c.relative_humidity_2m, t = c.temperature_2m;
    const risk = Math.max(0, Math.min(100, Math.round((hum - 60) * 2 + (t >= 10 && t <= 25 ? 20 : 0) + (c.precipitation > 0 ? 15 : 0))));
    const riskLabel = risk > 70 ? 'High' : risk > 40 ? 'Moderate' : 'Low';
    document.getElementById('weatherIcon').textContent = icon;
    document.getElementById('weatherTemp').textContent = Math.round(t) + '°C';
    document.getElementById('weatherDesc').textContent = desc;
    document.getElementById('wHumidity').textContent   = Math.round(hum) + '%';
    document.getElementById('wWind').textContent       = Math.round(c.wind_speed_10m) + ' km/h';
    document.getElementById('wVis').textContent        = c.precipitation > 0 ? c.precipitation + ' mm' : 'dry';
    document.getElementById('blightRisk').style.width  = risk + '%';
    document.getElementById('blightRisk').style.background = risk > 70 ? 'var(--red)' : risk > 40 ? 'var(--orange)' : 'var(--green-light)';
    document.getElementById('riskLabel').textContent   = riskLabel;
    document.getElementById('weatherLocation').textContent = place;
  } catch (e) {
    console.warn('Weather lookup failed:', e);
    setWeatherUnavailable(place);
  }
}

// Show the model's real held-out test accuracy on the landing page (from the service's /health).
async function loadModelStats() {
  if (!INFER_URL) return;
  try {
    const r = await fetch(INFER_URL + '/health');
    const h = await r.json();
    if (h.test_accuracy != null) document.getElementById('statAccuracy').textContent = (h.test_accuracy * 100).toFixed(1);
  } catch (e) { console.warn('Model stats unavailable:', e); }
}

/* ================================================================
   SCAN PAGE
================================================================ */
function triggerFile() {
  if (scannedFile) return;
  document.getElementById('scanFileInput').click();
}
function openScanCamera() {
  const i = document.getElementById('scanFileInput');
  i.setAttribute('capture','environment'); i.click();
}
function openScanGallery() {
  const i = document.getElementById('scanFileInput');
  i.removeAttribute('capture'); i.click();
}

function handleScanFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToastMsg('Please select an image file.','error'); return; }
  scannedFile = file;
  const reader = new FileReader();
  reader.onload = ev => {
    scannedDataUrl = ev.target.result;
    const img = document.getElementById('scanPreview');
    img.src = scannedDataUrl; img.style.display = 'block';
    document.getElementById('uploadPlaceholder').style.display  = 'none';
    document.getElementById('scanRemoveBtn').style.display      = 'flex';
    document.getElementById('uploadZone').style.cursor          = 'default';
    document.getElementById('analyseBtn').disabled = false;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function removeScanPhoto(e) {
  e.stopPropagation();
  scannedFile = null; scannedDataUrl = null;
  const img = document.getElementById('scanPreview');
  img.src = ''; img.style.display = 'none';
  document.getElementById('uploadPlaceholder').style.display = '';
  document.getElementById('scanRemoveBtn').style.display     = 'none';
  document.getElementById('uploadZone').style.cursor         = 'pointer';
  document.getElementById('analyseBtn').disabled = true;
}

// Drag-and-drop
function handleDrop(e) {
  e.preventDefault();
  document.getElementById('uploadZone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    scannedFile = file;
    const reader = new FileReader();
    reader.onload = ev => {
      scannedDataUrl = ev.target.result;
      const img = document.getElementById('scanPreview');
      img.src = scannedDataUrl; img.style.display = 'block';
      document.getElementById('uploadPlaceholder').style.display = 'none';
      document.getElementById('scanRemoveBtn').style.display     = 'flex';
      document.getElementById('uploadZone').style.cursor         = 'default';
      document.getElementById('analyseBtn').disabled = false;
    };
    reader.readAsDataURL(file);
  }
}
function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('uploadZone').classList.add('drag-over');
}
function handleDragLeave() {
  document.getElementById('uploadZone').classList.remove('drag-over');
}

async function runScan() {
  if (!scannedDataUrl) { showToastMsg('Please select a leaf photo first.','error'); return; }
  // INFERENCE_URL empty  -> the model runs on this device (web-inference.js, nothing is uploaded)
  // INFERENCE_URL set    -> the photo is sent to that server instead
  if (!INFER_URL && !window.PGLocal) {
    showToastMsg('The on-device AI engine did not load. Reload the page.','error'); return;
  }
  setScanLoading(true);
  try {
    let result;
    {
      // History is kept on this device. The diagnosis comes from the on-device model, or a server if INFERENCE_URL is set.
      let p;
      if (!INFER_URL) {
        p = await window.PGLocal.predict(scannedFile);
      } else {
        const resp = await fetch(`${INFER_URL}/predict`, { method:'POST', body: scannedFile });
        if (!resp.ok) {
          const e = await resp.json().catch(() => ({}));
          throw new Error(resp.status === 503 ? 'The diagnosis model is starting up or unavailable. Try again shortly.' : (e.detail || 'Detection failed'));
        }
        p = await resp.json();
      }
      const uncertain = p.uncertain === true;
      result = {
        disease:     uncertain ? 'Uncertain' : p.disease,
        confidence:  p.confidence,
        treatment:   uncertain ? UNCERTAIN_DATA.summary : ((TREATMENT_DATA[p.disease] || {}).summary || ''),
        detectionId: 'local-' + Date.now(),
        farmerId:    currentUser?.id || 'farmer001'
      };
    }
    saveToHistory(result);
    displayResult(result);
    showPage('result');
    showToastMsg(result.disease === 'Uncertain' ? 'Photo unclear - please retake it.' : 'Leaf analysed.', result.disease === 'Uncertain' ? 'error' : 'success');
  } catch (err) {
    showToastMsg(err.message || 'Detection failed. Check your connection.','error');
  } finally {
    setScanLoading(false);
  }
}

function setScanLoading(on) {
  const btn     = document.getElementById('analyseBtn');
  const spinner = document.getElementById('scanSpinner');
  const text    = document.getElementById('analyseBtnText');
  btn.disabled  = on;
  spinner.classList.toggle('visible', on);
  text.textContent = on ? ' Analysing…' : '🔍 Analyse Leaf';
}

/* ================================================================
   RESULT PAGE
================================================================ */
function displayResult(result) {
  lastResult       = result;
  const data       = result.disease === 'Uncertain' ? UNCERTAIN_DATA : (TREATMENT_DATA[result.disease] || UNCERTAIN_DATA);
  const pct        = Math.round((result.confidence || 0) * 100);

  // Header
  document.getElementById('resultMainCard').style.background   = data.color;
  document.getElementById('resultBigEmoji').textContent        = getEmoji(result.disease);
  document.getElementById('resultDisease').textContent         = result.disease;
  document.getElementById('resultScientific').textContent      = data.scientific ? `(${data.scientific})` : '';
  document.getElementById('resultConfidenceLabel').textContent = result.disease === 'Uncertain' ? 'Low confidence - no diagnosis' : 'Detection Confidence';
  document.getElementById('resultConfPct').textContent         = `${pct}%`;
  document.getElementById('resultTimestamp').textContent       = 'Scanned ' + formatDate(new Date().toISOString());

  // Confidence bar
  const bar = document.getElementById('resultConfBar');
  bar.style.width = '0%';
  requestAnimationFrame(() => { requestAnimationFrame(() => { bar.style.width = pct + '%'; }); });

  // Severity dots
  const dots = document.querySelectorAll('#sevDots .sev-dot');
  dots.forEach((d, i) => d.classList.toggle('active', i < data.severity));
  document.getElementById('sevText').textContent = data.sevLabel;

  // Treatment
  document.getElementById('treatmentFull').textContent = data.summary;
  document.getElementById('treatmentSteps').innerHTML  = data.steps.map((s,i) =>
    `<div class="treatment-step"><div class="ts-num">${i+1}</div><div>${s}</div></div>`
  ).join('');

  // Prevention
  document.getElementById('preventionList').innerHTML = data.prevention.map(p =>
    `<li>${p}</li>`
  ).join('');

  // About
  document.getElementById('diseaseAbout').textContent = data.about;
}

/* ================================================================
   HISTORY
================================================================ */
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch { return []; }
}

function saveToHistory(result) {
  allHistory = loadHistory();
  allHistory.unshift({
    detectionId: result.detectionId || 'local-' + Date.now(),
    disease:     result.disease,
    confidence:  result.confidence,
    timestamp:   new Date().toISOString(),
    farmerId:    currentUser?.id || 'farmer001'
  });
  if (allHistory.length > 200) allHistory.length = 200;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(allHistory)); } catch {}
}

function renderHistoryTable(filter, search) {
  allHistory = loadHistory();
  let records = [...allHistory];
  const filterVal = filter !== undefined ? filter : (document.getElementById('historyFilter')?.value || 'all');
  const searchVal = search !== undefined ? search : (document.getElementById('historySearch')?.value || '');
  if (filterVal !== 'all') records = records.filter(r => r.disease === filterVal);
  if (searchVal) records = records.filter(r => r.disease.toLowerCase().includes(searchVal.toLowerCase()));

  // Render history stats chips
  const total    = allHistory.length;
  const counts   = {};
  DISEASES.forEach(d => counts[d] = allHistory.filter(r => r.disease === d).length);
  document.getElementById('historyStats').innerHTML = [
    { label:'Total', val: total, emoji:'🔬' },
    { label:'Healthy', val: counts['Healthy'], emoji:'✅' },
    { label:'Late Blight', val: counts['Late Blight'], emoji:'🔴' },
    { label:'Early Blight', val: counts['Early Blight'], emoji:'🟠' },
    { label:'Bacterial Wilt', val: counts['Bacterial Wilt'], emoji:'🟣' },
  ].map(c => `<div class="hs-chip">${c.emoji} ${c.label}: <strong>${c.val}</strong></div>`).join('');

  const tbody = document.getElementById('historyTableBody');
  const empty = document.getElementById('historyEmpty');
  const table = document.getElementById('historyTable');

  if (!records.length) {
    table.style.display = 'none';
    empty.style.display = '';
    return;
  }
  table.style.display = ''; empty.style.display = 'none';

  const tagClass = { 'Healthy':'tag-healthy','Late Blight':'tag-late','Early Blight':'tag-early','Bacterial Wilt':'tag-wilt' };
  const sevMap   = { 'Healthy':0,'Late Blight':5,'Early Blight':3,'Bacterial Wilt':4 };

  tbody.innerHTML = records.map((r, i) => {
    const pct      = Math.round((r.confidence || 0) * 100);
    const tag      = tagClass[r.disease] || 'tag-healthy';
    const emoji    = getEmoji(r.disease);
    const sev      = sevMap[r.disease] || 0;
    const sevDots  = Array(5).fill(0).map((_,j) => `<span class="${j < sev ? 'on' : ''}"></span>`).join('');
    return `<tr>
      <td style="color:var(--text-light);font-size:13px">${i+1}</td>
      <td><span class="disease-tag ${tag}">${emoji} ${r.disease}</span></td>
      <td><strong>${pct}%</strong></td>
      <td style="color:var(--text-mid);font-size:13px">${formatDate(r.timestamp)}</td>
      <td><div class="sev-mini">${sevDots}</div></td>
      <td><div class="row-actions">
        <button class="row-btn" onclick="viewRecord(${i})">View</button>
        <button class="row-btn del" onclick="deleteRecord(${i})">Delete</button>
      </div></td>
    </tr>`;
  }).join('');
}

function filterHistory() {
  renderHistoryTable(document.getElementById('historyFilter').value, document.getElementById('historySearch').value);
}

function viewRecord(idx) {
  const filtered = getFilteredHistory();
  const record   = filtered[idx];
  if (!record) return;
  displayResult({ ...record, treatment: (TREATMENT_DATA[record.disease]||{}).summary || '' });
  showPage('result');
}

function deleteRecord(idx) {
  if (!confirm('Delete this scan record?')) return;
  const filtered = getFilteredHistory();
  const target   = filtered[idx];
  allHistory = allHistory.filter(r => r.detectionId !== target.detectionId);
  try { localStorage.setItem(STORE_KEY, JSON.stringify(allHistory)); } catch {}
  renderHistoryTable();
  showToastMsg('Record deleted.','');
}

function getFilteredHistory() {
  const filterVal = document.getElementById('historyFilter')?.value || 'all';
  const searchVal = document.getElementById('historySearch')?.value || '';
  let records = [...allHistory];
  if (filterVal !== 'all') records = records.filter(r => r.disease === filterVal);
  if (searchVal) records = records.filter(r => r.disease.toLowerCase().includes(searchVal.toLowerCase()));
  return records;
}

function clearHistory() {
  if (!confirm('Are you sure you want to delete ALL scan records? This cannot be undone.')) return;
  allHistory = [];
  try { localStorage.removeItem(STORE_KEY); } catch {}
  renderHistoryTable();
  showToastMsg('All history cleared.','warn');
}

function exportCSV() {
  if (!allHistory.length) { showToastMsg('No records to export.','warn'); return; }
  const header = 'Detection ID,Disease,Confidence %,Date,Farmer ID\n';
  const rows = allHistory.map(r =>
    `${r.detectionId},${r.disease},${Math.round((r.confidence||0)*100)}%,${formatDate(r.timestamp)},${r.farmerId||''}`
  ).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'potatoguard_history.csv'; a.click();
  URL.revokeObjectURL(url);
  showToastMsg('CSV exported!','success');
}

/* ================================================================
   TIPS PAGE
================================================================ */
function renderTips(category) {
  const list = category === 'all' ? TIPS_DATA : TIPS_DATA.filter(t => t.category === category);
  const catColors = { planting:'var(--green)', disease:'var(--red)', soil:'var(--orange)', harvest:'var(--yellow)', storage:'var(--purple)' };
  const catLabels = { planting:'🌱 Planting', disease:'🦠 Disease', soil:'🌍 Soil', harvest:'🥔 Harvest', storage:'📦 Storage' };
  document.getElementById('tipsGrid').innerHTML = list.map(t => `
    <div class="tip-card">
      <div class="tc-emoji">${t.emoji}</div>
      <div class="tc-category" style="color:${catColors[t.category]||'var(--green)'}">${catLabels[t.category]||t.category}</div>
      <div class="tc-title">${t.title}</div>
      <div class="tc-body">${t.body}</div>
    </div>`
  ).join('');
}

function filterTips(category, btn) {
  document.querySelectorAll('.tips-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderTips(category);
}

/* ================================================================
   REPORTS PAGE
================================================================ */
function renderReports() {
  allHistory = loadHistory();
  const list = document.getElementById('reportsList');
  if (!allHistory.length) {
    list.innerHTML = '<div class="empty-state-small">No scan reports yet. Run a scan to generate reports.</div>';
    return;
  }
  list.innerHTML = allHistory.slice(0, 20).map((r, i) => {
    const emoji = getEmoji(r.disease);
    const pct   = Math.round((r.confidence||0)*100);
    return `<div class="report-item">
      <span class="report-icon">${emoji}</span>
      <div class="report-info">
        <div class="report-title">${r.disease} — ${pct}% confidence</div>
        <div class="report-meta">${formatDate(r.timestamp)} · ID: ${r.detectionId}</div>
      </div>
      <button class="btn btn-outline-sm" onclick="printSingleReport(${i})">🖨️ Print</button>
    </div>`;
  }).join('');
  refreshDashboard();
}

function printSingleReport(idx) {
  const r = allHistory[idx]; if (!r) return;
  const data = TREATMENT_DATA[r.disease] || TREATMENT_DATA['Healthy'];
  const pct  = Math.round((r.confidence||0)*100);
  openReportModal(`
    <div style="font-family:'Outfit',sans-serif;padding:20px">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;background:${data.color};padding:20px;border-radius:12px;color:#fff">
        <span style="font-size:48px">${getEmoji(r.disease)}</span>
        <div><h2 style="font-size:26px;font-weight:700;margin:0">${r.disease}</h2>
        <p style="margin:4px 0 0;opacity:.8">${data.scientific ? '('+data.scientific+')' : ''} · Confidence: ${pct}%</p></div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr><td style="padding:8px;border:1px solid #eee;font-weight:600">Farmer ID</td><td style="padding:8px;border:1px solid #eee">${r.farmerId||'—'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #eee;font-weight:600">Date</td><td style="padding:8px;border:1px solid #eee">${formatDate(r.timestamp)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #eee;font-weight:600">Detection ID</td><td style="padding:8px;border:1px solid #eee">${r.detectionId}</td></tr>
        <tr><td style="padding:8px;border:1px solid #eee;font-weight:600">Severity</td><td style="padding:8px;border:1px solid #eee">${data.sevLabel}</td></tr>
      </table>
      <h3 style="margin-bottom:10px">💊 Treatment Advice</h3>
      <p style="color:#555;line-height:1.7;margin-bottom:16px">${data.summary}</p>
      <h3 style="margin-bottom:10px">Treatment Steps</h3>
      <ol style="padding-left:20px;color:#555;line-height:2">${data.steps.map(s=>'<li>'+s+'</li>').join('')}</ol>
      <div style="margin-top:28px;padding-top:16px;border-top:1px solid #eee;color:#aaa;font-size:12px;text-align:center">
        PotatoGuard v1.0 · BSc Computer Science 2024/2025 · github.com/SsemuliJoseph/Smart-Crop
      </div>
    </div>
  `);
}

function openReportModal(html) {
  document.getElementById('reportContent').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('active');
  document.getElementById('reportModal').classList.add('active');
}

function printReport() {
  if (!lastResult) return;
  printSingleReport(allHistory.findIndex(r => r.detectionId === lastResult.detectionId) || 0);
}

function generateSummaryReport() { printSummaryReport(); }

function printSummaryReport() {
  allHistory = loadHistory();
  const total = allHistory.length;
  const counts = {};
  DISEASES.forEach(d => counts[d] = allHistory.filter(r => r.disease === d).length);
  const rate = total ? Math.round((counts['Healthy']/total)*100) : 0;
  openReportModal(`
    <div style="font-family:'Outfit',sans-serif;padding:20px">
      <div style="background:#1B5E20;padding:24px;border-radius:12px;color:#fff;text-align:center;margin-bottom:24px">
        <div style="font-size:40px;margin-bottom:8px">🥔</div>
        <h2 style="font-size:24px;margin:0 0 4px">PotatoGuard — Season Summary Report</h2>
        <p style="opacity:.7;font-size:13px">Generated: ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr style="background:#f5f5f5"><th style="padding:12px;border:1px solid #ddd;text-align:left">Metric</th><th style="padding:12px;border:1px solid #ddd;text-align:right">Value</th></tr>
        ${[['Total Scans',total],['Healthy',counts['Healthy']],['Late Blight',counts['Late Blight']],['Early Blight',counts['Early Blight']],['Bacterial Wilt',counts['Bacterial Wilt']],['Health Rate',rate+'%']].map(([k,v])=>`<tr><td style="padding:10px;border:1px solid #ddd">${k}</td><td style="padding:10px;border:1px solid #ddd;text-align:right;font-weight:700">${v}</td></tr>`).join('')}
      </table>
      <h3 style="margin-bottom:12px">Recent Scans (last 10)</h3>
      <table style="width:100%;border-collapse:collapse">
        <tr style="background:#f5f5f5"><th style="padding:8px;border:1px solid #ddd;text-align:left;font-size:13px">Disease</th><th style="padding:8px;border:1px solid #ddd;font-size:13px">Confidence</th><th style="padding:8px;border:1px solid #ddd;font-size:13px">Date</th></tr>
        ${allHistory.slice(0,10).map(r=>`<tr><td style="padding:8px;border:1px solid #ddd;font-size:13px">${getEmoji(r.disease)} ${r.disease}</td><td style="padding:8px;border:1px solid #ddd;text-align:center;font-size:13px">${Math.round((r.confidence||0)*100)}%</td><td style="padding:8px;border:1px solid #ddd;font-size:13px;color:#888">${formatDate(r.timestamp)}</td></tr>`).join('')}
      </table>
      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;color:#aaa;font-size:12px;text-align:center">
        PotatoGuard v1.0 · BSc Computer Science 2024/2025 · Farmer: ${currentUser?.id||'—'}
      </div>
    </div>
  `);
}

/* ================================================================
   PROFILE & SETTINGS
================================================================ */
function populateProfile() {
  updateUserUI();
  if (document.getElementById('pfName'))     document.getElementById('pfName').value     = userPrefs.name || '';
  if (document.getElementById('pfLocation')) document.getElementById('pfLocation').value = userPrefs.location || '';
  if (document.getElementById('pfFarm'))     document.getElementById('pfFarm').value     = userPrefs.farmSize || '';
  if (document.getElementById('pfPhone'))    document.getElementById('pfPhone').value    = userPrefs.phone || '';
  if (document.getElementById('darkModeToggle')) document.getElementById('darkModeToggle').checked = userPrefs.dark || false;
}

function toggleEditProfile() {
  const card = document.getElementById('profileFormCard');
  card.style.display = card.style.display === 'none' ? '' : 'none';
}

function saveProfile() {
  userPrefs.name     = document.getElementById('pfName').value.trim();
  userPrefs.location = document.getElementById('pfLocation').value.trim();
  userPrefs.farmSize = document.getElementById('pfFarm').value.trim();
  userPrefs.phone    = document.getElementById('pfPhone').value.trim();
  savePrefs();
  updateUserUI();
  toggleEditProfile();
  showToastMsg('Profile updated!','success');
}

function toggleDarkMode() {
  userPrefs.dark = document.getElementById('darkModeToggle').checked;
  document.body.classList.toggle('dark', userPrefs.dark);
  savePrefs();
}

function loadPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    Object.assign(userPrefs, saved);
    if (userPrefs.dark) document.body.classList.add('dark');
  } catch {}
}
function savePrefs() {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(userPrefs)); } catch {}
}

/* ================================================================
   UTILITIES
================================================================ */
function getEmoji(disease) {
  const map = { 'Healthy':'✅','Late Blight':'🔴','Early Blight':'🟠','Bacterial Wilt':'🟣','Uncertain':'❓' };
  return map[disease] || '🔬';
}

function formatDate(iso) {
  if (!iso) return 'Unknown';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'})
      + ' · ' + d.toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'});
  } catch { return iso; }
}

function showToastMsg(message, type) {
  const t = document.getElementById('toast');
  t.textContent = message;
  t.className   = 'toast' + (type ? ' '+type : '');
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => t.classList.remove('show'), 3200);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
