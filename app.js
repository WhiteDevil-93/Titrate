// Titrate - ICU Dosing Guide PWA v2.1
let clinicalData = null;
let deferredPrompt = null;
let patientWeight = 0;

const CAT_NAMES = {
    'favourites': 'Favourites',
    '1_resuscitation_fluids_and_inotropes': 'Resuscitation',
    '2_airway_and_ventilation': 'Airway & Vent',
    '3_sedation_analgesia_and_neurology': 'Sedation & Neuro',
    '4_antimicrobials_and_infectious_diseases': 'Antimicrobials',
    '5_metabolic_electrolytes_and_nutrition': 'Metabolic',
    '6_poisoning_and_toxicology': 'Toxicology',
    '7_useful_formulae': 'Formulae',
    '8_cardiovascular': 'Cardiovascular',
    '9_blood_products': 'Blood Products',
    '10_endocrine_and_other': 'Endocrine'
};

const CAT_ICONS = {
    'favourites': '⭐',
    '1_resuscitation_fluids_and_inotropes': '💉',
    '2_airway_and_ventilation': '🫁',
    '3_sedation_analgesia_and_neurology': '🧠',
    '4_antimicrobials_and_infectious_diseases': '🦠',
    '5_metabolic_electrolytes_and_nutrition': '⚗️',
    '6_poisoning_and_toxicology': '☠️',
    '7_useful_formulae': '📐',
    '8_cardiovascular': '❤️',
    '9_blood_products': '🩸',
    '10_endocrine_and_other': '🔬'
};

const TAB_ORDER = [
    'favourites','1_resuscitation_fluids_and_inotropes','2_airway_and_ventilation',
    '3_sedation_analgesia_and_neurology','4_antimicrobials_and_infectious_diseases',
    '5_metabolic_electrolytes_and_nutrition','6_poisoning_and_toxicology',
    '7_useful_formulae','8_cardiovascular','9_blood_products','10_endocrine_and_other'
];

// ═══ DOSE PARSER ═══
function parseWeightDose(doseStr) {
    if (!doseStr) return null;
    const s = doseStr.toLowerCase().replace(/–/g, '-');

    // Infusion rates: 0.05-1 mcg/kg/min
    let m = s.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)\s*(mcg|mg|ug|g|units|iu)\s*\/\s*kg\s*\/\s*(min|hr|hour)/);
    if (m) return { type: 'infusion', minVal: parseFloat(m[1]), maxVal: parseFloat(m[2]), unit: m[3], time: m[4], isRange: true };

    m = s.match(/(\d+\.?\d*)\s*(mcg|mg|ug|g|units|iu)\s*\/\s*kg\s*\/\s*(min|hr|hour)/);
    if (m) return { type: 'infusion', minVal: parseFloat(m[1]), maxVal: parseFloat(m[1]), unit: m[2], time: m[3], isRange: false };

    // Weight-based with freq: 10-20mg/kg IV 8hrly
    m = s.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)\s*(mg|mcg|ug|g|units|iu|mmol|ml)\s*\/\s*kg\s+(.*)/);
    if (m) return { type: 'dose_freq', minVal: parseFloat(m[1]), maxVal: parseFloat(m[2]), unit: m[3], freq: m[4], isRange: true };

    m = s.match(/(\d+\.?\d*)\s*(mg|mcg|ug|g|units|iu|mmol|ml)\s*\/\s*kg\s+(.*)/);
    if (m) return { type: 'dose_freq', minVal: parseFloat(m[1]), maxVal: parseFloat(m[1]), unit: m[2], freq: m[3], isRange: false };

    // Plain weight-based: 10mg/kg
    m = s.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)\s*(mg|mcg|ug|g|units|iu|mmol|ml)\s*\/\s*kg/);
    if (m) return { type: 'dose', minVal: parseFloat(m[1]), maxVal: parseFloat(m[2]), unit: m[3], isRange: true };

    m = s.match(/(\d+\.?\d*)\s*(mg|mcg|ug|g|units|iu|mmol|ml)\s*\/\s*kg/);
    if (m) return { type: 'dose', minVal: parseFloat(m[1]), maxVal: parseFloat(m[1]), unit: m[2], isRange: false };

    return null;
}

function fmtU(u) { return u === 'ug' ? 'mcg' : u; }

function calculateDose(parsed, weight) {
    if (!parsed || !weight || weight <= 0) return null;
    const w = parseFloat(weight);
    const minD = (parsed.minVal * w);
    const maxD = (parsed.maxVal * w);
    const minS = minD >= 100 ? minD.toFixed(0) : minD >= 10 ? minD.toFixed(1) : minD.toFixed(2);
    const maxS = maxD >= 100 ? maxD.toFixed(0) : maxD >= 10 ? maxD.toFixed(1) : maxD.toFixed(2);
    const unit = fmtU(parsed.unit);

    if (parsed.type === 'infusion') {
        const tl = parsed.time === 'min' ? 'min' : 'hr';
        return parsed.isRange ? `${minS}-${maxS} ${unit}/${tl}` : `${minS} ${unit}/${tl}`;
    } else if (parsed.type === 'dose_freq') {
        return parsed.isRange ? `${minS}-${maxS} ${unit} ${parsed.freq}` : `${minS} ${unit} ${parsed.freq}`;
    } else {
        return parsed.isRange ? `${minS}-${maxS} ${unit}` : `${minS} ${unit}`;
    }
}

function hasWeightDose(item) {
    const t = (item.adult_dose || '') + ' ' + (item.paediatric_dose || '') + ' ' + (item.adult_settings || '') + ' ' + (item.paediatric_settings || '');
    return /\/\s*kg/.test(t.toLowerCase());
}

// ═══ WEIGHT MANAGEMENT ═══
function getWeight() { return parseFloat(localStorage.getItem('titrate_weight') || '0'); }
function setWeight(w) { localStorage.setItem('titrate_weight', w); patientWeight = w; updateAllCalcs(); updateWeightBadge(); }

function updateWeightBadge() {
    const badge = document.getElementById('weightBadge');
    if (badge) badge.textContent = patientWeight > 0 ? patientWeight + ' kg' : 'Set Wt';
}

function updateAllCalcs() {
    document.querySelectorAll('.calc-result-row').forEach(el => {
        const dose = el.dataset.dose;
        const parsed = parseWeightDose(dose);
        const result = calculateDose(parsed, patientWeight);
        if (result) {
            el.style.display = 'flex';
            el.querySelector('.calc-value').textContent = '→ ' + result;
        } else {
            el.style.display = 'none';
        }
    });
}

// ═══ FAVOURITES ═══
function getFavs() { try { return JSON.parse(localStorage.getItem('titrate_favourites') || '[]'); } catch { return []; } }
function saveFavs(f) { localStorage.setItem('titrate_favourites', JSON.stringify(f)); updateFavBadge(); }
function toggleFav(key) { let f = getFavs(); saveFavs(f.includes(key) ? f.filter(x => x !== key) : [...f, key]); updateFavBtns(); if (activeCat === 'favourites') renderFavourites(); }
function isFav(key) { return getFavs().includes(key); }
function makeKey(item, cat) { const n = item.item || item.drug || item.condition_or_drug || item.poison_or_drug || item.antidote_treatment || item.product || ''; return cat + '::' + n; }
function updateFavBadge() { const b = document.getElementById('favBadge'); if (b) { const c = getFavs().length; b.textContent = c; b.style.display = c > 0 ? 'inline-flex' : 'none'; } }
function updateFavBtns() { document.querySelectorAll('.fav-btn').forEach(btn => { const k = btn.dataset.key; const f = isFav(k); btn.textContent = f ? '★' : '☆'; btn.classList.toggle('fav-active', f); btn.title = f ? 'Remove from favourites' : 'Add to favourites'; }); }

// ═══ INIT ═══
document.addEventListener('DOMContentLoaded', () => { patientWeight = getWeight(); loadData(); setupSearch(); setupScrollTop(); setupInstallPrompt(); });

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').then(r => console.log('SW:', r.scope)).catch(e => console.log('SW fail:', e));
    });
}

async function loadData() {
    try {
        const res = await fetch('data.json?v=' + Date.now());
        clinicalData = await res.json();
        renderNav();
        if (activeCat === 'favourites') renderFavourites(); else if (activeCat === 'all') renderAllSections(); else renderSection(activeCat);
        updateConnectionStatus(); updateFavBadge(); updateWeightBadge();
    } catch (e) {
        document.getElementById('content').innerHTML = '<div class="no-results"><div style="font-size:2rem">⚠️</div>Failed to load data.<br>Check connection and refresh.</div>';
    }
}

// ═══ NAV ═══
let activeCat = 'all';

function renderNav() {
    const nav = document.getElementById('catNav');
    let html = '';
    const fc = getFavs().length;
    html += `<button class="cat-btn" data-cat="favourites">${CAT_ICONS.favourites} ${CAT_NAMES.favourites}<span class="nav-badge" id="favBadge" style="display:${fc > 0 ? 'inline-flex' : 'none'}">${fc}</span></button>`;
    html += `<button class="cat-btn active" data-cat="all">📋 All</button>`;
    for (const key of TAB_ORDER) {
        if (key === 'favourites' || !clinicalData[key]) continue;
        html += `<button class="cat-btn" data-cat="${key}">${CAT_ICONS[key]} ${CAT_NAMES[key]}</button>`;
    }
    nav.innerHTML = html;
    nav.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            nav.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCat = btn.dataset.cat;
            if (activeCat === 'favourites') renderFavourites();
            else if (activeCat === 'all') renderAllSections();
            else renderSection(activeCat);
            document.getElementById('searchInput').value = '';
            document.getElementById('clearBtn').classList.remove('visible');
        });
    });
}

// ═══ RENDER ═══
function renderAllSections() {
    const c = document.getElementById('content'); let h = '';
    for (const k of TAB_ORDER) { if (k !== 'favourites' && clinicalData[k]) h += renderSectionHTML(k); }
    c.innerHTML = h; attachHandlers(); updateFavBtns(); updateAllCalcs();
    const f = c.querySelector('.section'); if (f) f.classList.add('expanded');
}

function renderSection(catKey) {
    const c = document.getElementById('content');
    c.innerHTML = renderSectionHTML(catKey);
    attachHandlers(); updateFavBtns(); updateAllCalcs();
    const s = c.querySelector('.section'); if (s) s.classList.add('expanded');
}

function renderSectionHTML(catKey) {
    const d = clinicalData[catKey]; const cn = CAT_NAMES[catKey] || catKey; const ci = CAT_ICONS[catKey] || '';
    let body = '';
    for (const [sk, items] of Object.entries(d)) {
        const sl = sk.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
        if (Array.isArray(items)) {
            let sm = ''; let has = false;
            for (const item of items) { const c = renderDrugCard(item, catKey); if (c) { has = true; sm += c; } }
            if (has) { body += `<div class="sub-label">${sl}</div>` + sm; }
        } else { body += renderDrugCard(items, catKey); }
    }
    return `<div class="section" data-cat="${catKey}"><div class="section-header"><div class="section-title">${ci} ${cn}</div><div class="section-toggle">▼</div></div><div class="section-body">${body}</div></div>`;
}

function renderFavourites() {
    const c = document.getElementById('content'); const favs = getFavs();
    if (favs.length === 0) {
        c.innerHTML = `<div class="no-results"><div style="font-size:3rem;margin-bottom:1rem">⭐</div><div style="font-size:1.1rem;font-weight:700">No favourites yet</div><div style="font-size:0.85rem;color:var(--text-secondary);max-width:280px;margin:0.5rem auto">Tap the ☆ star on any drug to add it here. Saved locally, works offline.</div></div>`;
        return;
    }
    let h = '<div class="section expanded"><div class="section-body" style="max-height:none">';
    for (const ck of Object.keys(clinicalData)) {
        for (const [sk, items] of Object.entries(clinicalData[ck])) {
            if (Array.isArray(items)) { for (const item of items) { if (favs.includes(makeKey(item, ck))) h += renderDrugCard(item, ck); } }
            else { if (favs.includes(makeKey(items, ck))) h += renderDrugCard(items, ck); }
        }
    }
    h += '</div></div>'; c.innerHTML = h; updateFavBtns(); updateAllCalcs();
}

function renderDrugCard(item, catKey) {
    const name = item.item || item.drug || item.condition_or_drug || item.poison_or_drug || item.antidote_treatment || item.product || '';
    if (!name && !item.category) return '';
    const dn = name || `${item.category} - ${item.item || ''}`;
    const dk = makeKey(item, catKey);
    const fv = isFav(dk);
    const fb = `<button class="fav-btn ${fv ? 'fav-active' : ''}" data-key="${dk}" onclick="event.stopPropagation();toggleFav('${dk}')" title="${fv ? 'Remove' : 'Add'}">${fv ? '★' : '☆'}</button>`;
    const notes = item.notes_updates || item.notes || '';
    let badges = '';
    if (notes.toLowerCase().includes('first-line')) badges += '<span class="badge b-first">1st</span>';
    if (notes.toLowerCase().includes('warning') || notes.toLowerCase().includes('caution')) badges += '<span class="badge b-warn">⚠️</span>';
    if (notes.toLowerCase().includes('avoid') || notes.toLowerCase().includes('teratogenic') || notes.toLowerCase().includes('contraindicated')) badges += '<span class="badge b-dang">🚫</span>';
    if (item.standard_dilutions) badges += '<span class="badge b-calc">📟</span>';

    // Build weight-based calc rows for adult + paediatric doses
    let calcRows = '';
    const doses = [item.adult_dose, item.paediatric_dose, item.adult_settings, item.paediatric_settings, item.protocol_dose].filter(Boolean);
    const seen = new Set();
    for (const dose of doses) {
        const parsed = parseWeightDose(dose);
        if (parsed) {
            const key = parsed.minVal + '-' + parsed.maxVal + parsed.unit + (parsed.freq || '') + (parsed.time || '');
            if (!seen.has(key)) {
                seen.add(key);
                const label = dose === item.adult_dose || dose === item.adult_settings ? 'Adult calc' : dose === item.protocol_dose ? 'Protocol calc' : 'Peds calc';
                const result = patientWeight > 0 ? calculateDose(parsed, patientWeight) : null;
                const display = result ? `→ ${result}` : 'Enter weight to calculate';
                const style = result ? '' : 'style="opacity:0.5"';
                calcRows += `<div class="calc-result-row" data-dose="${dose.replace(/"/g, '&quot;')}" ${style}><span class="calc-label">${label}</span><span class="calc-value">${display}</span></div>`;
            }
        }
    }

    let h = `<div class="drug-card" data-search="${(dn + ' ' + notes + ' ' + (item.adult_dose || '') + ' ' + (item.paediatric_dose || '')).toLowerCase()}">`;
    h += `<div class="drug-header"><div class="drug-name">${dn} ${badges}</div>${fb}</div>`;

    if (item.adult_dose || item.adult_settings) h += `<div class="dose-row"><span class="dose-label">Adult</span><span class="dose-value">${item.adult_dose || item.adult_settings}</span></div>`;
    if (item.paediatric_dose || item.paediatric_settings) h += `<div class="dose-row"><span class="dose-label">Paed</span><span class="dose-value">${item.paediatric_dose || item.paediatric_settings}</span></div>`;
    if (item.protocol_dose) h += `<div class="dose-row"><span class="dose-label">Protocol</span><span class="dose-value">${item.protocol_dose}</span></div>`;
    if (item.formula) {
        h += `<div class="dose-row"><span class="dose-label">Formula</span><span class="dose-value" style="font-family:monospace;font-size:0.78rem">${item.formula}</span></div>`;
        if (item.standard_dilutions) h += `<div class="dose-row"><span class="dose-label">Dilution</span><span class="dose-value">${item.standard_dilutions}</span></div>`;
    }
    if (calcRows) h += `<div class="calc-box">${calcRows}</div>`;
    if (item.formula && item.category === 'Inotopes' && item.formula.includes('ml/hr')) h += renderCalc(item);

    if (notes) {
        let nc = 'notes';
        if (notes.toLowerCase().includes('warning') || notes.toLowerCase().includes('avoid') || notes.toLowerCase().includes('teratogenic') || notes.toLowerCase().includes('contraindicated')) nc += ' danger';
        else if (notes.toLowerCase().includes('caution') || notes.toLowerCase().includes('consult') || notes.toLowerCase().includes('section 21')) nc += ' warn';
        h += `<div class="${nc}">${notes}</div>`;
    }
    h += '</div>';
    return h;
}

function renderCalc(item) {
    const id = item.item.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
    return `<button class="calc-btn" onclick="toggleCalc('${id}')">📟 Infusion Calc</button><div class="calc-panel" id="calc-${id}"><div class="calc-inputs"><input type="number" id="d-${id}" placeholder="mcg/kg/min" step="0.01" oninput="cI('${id}','${item.item}')"><input type="number" id="w-${id}" placeholder="Wt (kg)" step="0.1" value="${patientWeight || ''}" oninput="cI('${id}','${item.item}')"></div><div class="calc-result" id="r-${id}">-- ml/hr</div><div class="formula-display">${item.formula}</div></div>`;
}

function toggleCalc(id) { document.getElementById(`calc-${id}`).classList.toggle('open'); }
function cI(id, drug) { const d = parseFloat(document.getElementById(`d-${id}`).value) || 0; const w = parseFloat(document.getElementById(`w-${id}`).value) || 0; if (d <= 0 || w <= 0) { document.getElementById(`r-${id}`).textContent = '-- ml/hr'; return; } const div = { 'Adrenaline': 25, 'Noradrenaline': 50, 'Dobutamine': 1250 }[drug] || 50; document.getElementById(`r-${id}`).textContent = ((d * w * 60) / div).toFixed(1) + ' ml/hr'; }
function attachHandlers() { document.querySelectorAll('.section-header').forEach(h => { h.addEventListener('click', () => { h.parentElement.classList.toggle('expanded'); }); }); }

// ═══ SEARCH ═══
function setupSearch() {
    const inp = document.getElementById('searchInput');
    const clr = document.getElementById('clearBtn');
    inp.addEventListener('input', () => {
        const q = inp.value.trim().toLowerCase();
        clr.classList.toggle('visible', q.length > 0);
        if (!q) { if (activeCat === 'favourites') renderFavourites(); else if (activeCat === 'all') renderAllSections(); else renderSection(activeCat); return; }
        doSearch(q);
    });
    clr.addEventListener('click', () => { inp.value = ''; clr.classList.remove('visible'); if (activeCat === 'favourites') renderFavourites(); else if (activeCat === 'all') renderAllSections(); else renderSection(activeCat); });
}

function doSearch(q) {
    const c = document.getElementById('content'); let h = '';
    for (const ck of Object.keys(clinicalData)) {
        if (activeCat !== 'all' && activeCat !== ck) continue;
        let cm = '';
        for (const [sk, items] of Object.entries(clinicalData[ck])) {
            if (Array.isArray(items)) { let sm = ''; for (const item of items) { if (JSON.stringify(item).toLowerCase().includes(q)) sm += hlt(renderDrugCard(item, ck), q); } if (sm) cm += `<div class="sub-label">${sk.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}</div>` + sm; }
            else { if (JSON.stringify(items).toLowerCase().includes(q)) cm += hlt(renderDrugCard(items, ck), q); }
        }
        if (cm) h += `<div class="section expanded"><div class="section-header"><div class="section-title">${CAT_ICONS[ck] || ''} ${CAT_NAMES[ck]}</div><div class="section-toggle">▼</div></div><div class="section-body">${cm}</div></div>`;
    }
    c.innerHTML = h || `<div class="no-results"><div style="font-size:2rem">🔍</div>No results for "${q}"</div>`;
    attachHandlers(); updateFavBtns(); updateAllCalcs();
}

function hlt(html, q) { const ws = q.split(/\s+/).filter(w => w.length > 1); for (const w of ws) { html = html.replace(new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<span class="highlight">$1</span>'); } return html; }

function setupScrollTop() { const b = document.getElementById('scrollTop'); window.addEventListener('scroll', () => b.classList.toggle('visible', window.scrollY > 300)); b.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' })); }
function setupInstallPrompt() { window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; document.getElementById('installBar').classList.add('show'); }); document.getElementById('installBtn').addEventListener('click', async () => { if (deferredPrompt) { deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; if (outcome === 'accepted') document.getElementById('installBar').classList.remove('show'); deferredPrompt = null; } }); }
function updateConnectionStatus() { const b = document.getElementById('offlineBadge'); if (!navigator.onLine) { b.textContent = 'Offline'; b.style.background = '#f39c12'; } else { b.textContent = 'Offline Ready'; b.style.background = 'var(--accent)'; } }
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);

// Weight input handler
document.addEventListener('DOMContentLoaded', () => {
    const wi = document.getElementById('weightInput');
    if (wi) {
        const saved = getWeight();
        if (saved > 0) { wi.value = saved; patientWeight = saved; }
        wi.addEventListener('input', () => { const w = parseFloat(wi.value) || 0; setWeight(w); });
    }
});

document.getElementById('footer').innerHTML = 'Titrate v2.1 &middot; 248 Drugs &middot; Weight-Based Calculators<br>For clinical reference only &middot; Verify all doses<br><span style="opacity:0.7">Created by Tashriq Hendricks &amp; Kimi</span>';
