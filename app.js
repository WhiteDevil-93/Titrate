// Titrate - ICU Dosing Guide PWA
let clinicalData = null;
let deferredPrompt = null;

// Category display names
const CAT_NAMES = {
    '1_resuscitation_fluids_and_inotropes': 'Resuscitation',
    '2_airway_and_ventilation': 'Airway & Vent',
    '3_sedation_analgesia_and_neurology': 'Sedation & Neuro',
    '4_antimicrobials_and_infectious_diseases': 'Antimicrobials',
    '5_metabolic_electrolytes_and_nutrition': 'Metabolic',
    '6_poisoning_and_toxicology': 'Toxicology',
    '7_useful_formulae': 'Formulae',
    '8_cardiovascular': 'Cardiovascular',
    '9_blood_products': 'Blood Products',
    '10_endocrine_and_other': 'Endocrine & Other'
};

const CAT_ICONS = {
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

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupSearch();
    setupScrollTop();
    setupInstallPrompt();
});

// ─── Service Worker ───
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => console.log('SW registered:', reg.scope))
            .catch(err => console.log('SW failed:', err));
    });
}

// ─── Load Data ───
async function loadData() {
    try {
        const res = await fetch('data.json?v=' + Date.now());
        clinicalData = await res.json();
        renderNav();
        renderAllSections();
        updateConnectionStatus();
    } catch (e) {
        document.getElementById('content').innerHTML = `
            <div class="no-results">
                <div style="font-size:2rem;margin-bottom:0.5rem;">⚠️</div>
                Failed to load clinical data.<br>Please check your connection and refresh.
            </div>`;
    }
}

// ─── Navigation ───
let activeCat = 'all';

function renderNav() {
    const nav = document.getElementById('catNav');
    let html = `<button class="cat-btn active" data-cat="all">All</button>`;
    for (const [key, name] of Object.entries(CAT_NAMES)) {
        html += `<button class="cat-btn" data-cat="${key}">${CAT_ICONS[key]} ${name}</button>`;
    }
    nav.innerHTML = html;
    
    nav.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            nav.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCat = btn.dataset.cat;
            if (activeCat === 'all') {
                renderAllSections();
            } else {
                renderSection(activeCat);
            }
            document.getElementById('searchInput').value = '';
            document.getElementById('clearBtn').classList.remove('visible');
        });
    });
}

// ─── Render ───
function renderAllSections() {
    const content = document.getElementById('content');
    let html = '';
    for (const catKey of Object.keys(clinicalData)) {
        html += renderSectionHTML(catKey);
    }
    content.innerHTML = html;
    attachSectionHandlers();
    // Expand first section by default
    const first = content.querySelector('.section');
    if (first) first.classList.add('expanded');
}

function renderSection(catKey) {
    const content = document.getElementById('content');
    content.innerHTML = renderSectionHTML(catKey);
    attachSectionHandlers();
    const section = content.querySelector('.section');
    if (section) section.classList.add('expanded');
}

function renderSectionHTML(catKey) {
    const data = clinicalData[catKey];
    const catName = CAT_NAMES[catKey] || catKey;
    const icon = CAT_ICONS[catKey] || '';
    
    let bodyHTML = '';
    for (const [subKey, items] of Object.entries(data)) {
        const subLabel = subKey.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
        if (Array.isArray(items)) {
            bodyHTML += `<div style="padding:0.5rem 1.25rem;font-size:0.75rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid var(--border);">${subLabel}</div>`;
            for (const item of items) {
                bodyHTML += renderDrugCard(item, catKey);
            }
        } else {
            bodyHTML += renderDrugCard(items, catKey);
        }
    }
    
    return `
        <div class="section expanded" data-cat="${catKey}">
            <div class="section-header">
                <div class="section-title">${icon} ${catName}</div>
                <div class="section-toggle">&#9662;</div>
            </div>
            <div class="section-body">${bodyHTML}</div>
        </div>
    `;
}

function renderDrugCard(item, catKey) {
    const name = item.item || item.drug || item.condition_or_drug || item.poison_or_drug || item.antidote_treatment || item.product || '';
    if (!name && !item.category) return '';
    
    const displayName = name || `${item.category} - ${item.item || ''}`;
    
    // Badges
    let badges = '';
    const notes = (item.notes_updates || item.notes || '');
    if (notes.toLowerCase().includes('first-line')) badges += '<span class="badge badge-first">1st Line</span>';
    if (notes.toLowerCase().includes('warning') || notes.toLowerCase().includes('caution')) badges += '<span class="badge badge-warn">⚠️ Caution</span>';
    if (notes.toLowerCase().includes('avoid') || notes.toLowerCase().includes('teratogenic') || notes.toLowerCase().includes('pris')) badges += '<span class="badge badge-danger">⚠️ Warning</span>';
    
    let html = `<div class="drug-card" data-search="${(displayName + ' ' + notes + ' ' + (item.adult_dose || '') + ' ' + (item.paediatric_dose || '')).toLowerCase()}">`;
    html += `<div class="drug-name">${displayName} ${badges}</div>`;
    
    // Adult dose
    if (item.adult_dose || item.adult_settings) {
        html += `<div class="dose-row"><span class="dose-label">Adult</span><span class="dose-value">${item.adult_dose || item.adult_settings}</span></div>`;
    }
    
    // Paediatric dose
    if (item.paediatric_dose || item.paediatric_settings) {
        html += `<div class="dose-row"><span class="dose-label">Paediatric</span><span class="dose-value">${item.paediatric_dose || item.paediatric_settings}</span></div>`;
    }
    
    // Protocol dose (toxicology)
    if (item.protocol_dose) {
        html += `<div class="dose-row"><span class="dose-label">Protocol</span><span class="dose-value">${item.protocol_dose}</span></div>`;
    }
    
    // Formula
    if (item.formula) {
        html += `<div class="dose-row"><span class="dose-label">Formula</span><span class="dose-value" style="font-family:monospace;">${item.formula}</span></div>`;
        if (item.standard_dilutions) {
            html += `<div class="dose-row"><span class="dose-label">Dilution</span><span class="dose-value">${item.standard_dilutions}</span></div>`;
        }
    }
    
    // Calculator for inotrope formulae
    if (item.formula && item.category === 'Inotopes' && item.formula.includes('ml/hr')) {
        html += renderCalc(item);
    }
    
    // Notes
    if (notes) {
        let noteClass = 'notes';
        if (notes.toLowerCase().includes('warning') || notes.toLowerCase().includes('avoid') || notes.toLowerCase().includes('teratogenic')) noteClass += ' danger';
        else if (notes.toLowerCase().includes('caution') || notes.toLowerCase().includes('preferred') || notes.toLowerCase().includes('consult')) noteClass += ' warn';
        html += `<div class="${noteClass}">${notes}</div>`;
    }
    
    html += '</div>';
    return html;
}

function renderCalc(item) {
    const drugId = item.item.replace(/\s+/g, '');
    return `
        <button class="calc-btn" onclick="toggleCalc('${drugId}')">📱 Open Calculator</button>
        <div class="calc-panel" id="calc-${drugId}">
            <div class="calc-inputs">
                <input type="number" id="dose-${drugId}" placeholder="mcg/kg/min" step="0.01" oninput="calcInotrope('${drugId}', '${item.item}')">
                <input type="number" id="wt-${drugId}" placeholder="Weight (kg)" step="0.1" oninput="calcInotrope('${drugId}', '${item.item}')">
            </div>
            <div class="calc-result" id="result-${drugId}">-- ml/hr</div>
            <div class="formula-display">${item.formula}</div>
        </div>
    `;
}

function toggleCalc(id) {
    document.getElementById(`calc-${id}`).classList.toggle('open');
}

function calcInotrope(id, drugName) {
    const dose = parseFloat(document.getElementById(`dose-${id}`).value) || 0;
    const wt = parseFloat(document.getElementById(`wt-${id}`).value) || 0;
    if (dose <= 0 || wt <= 0) {
        document.getElementById(`result-${id}`).textContent = '-- ml/hr';
        return;
    }
    
    // Get divisor from formula
    const divisor = getDivisor(drugName);
    const result = (dose * wt * 60) / divisor;
    document.getElementById(`result-${id}`).textContent = `${result.toFixed(1)} ml/hr`;
}

function getDivisor(drugName) {
    const divisors = {
        'Adrenaline': 25,
        'Noradrenaline': 50,
        'Dobutamine': 1250
    };
    return divisors[drugName] || 50;
}

function attachSectionHandlers() {
    document.querySelectorAll('.section-header').forEach(header => {
        header.addEventListener('click', () => {
            header.parentElement.classList.toggle('expanded');
        });
    });
}

// ─── Search ───
function setupSearch() {
    const input = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearBtn');
    
    input.addEventListener('input', () => {
        const query = input.value.trim().toLowerCase();
        clearBtn.classList.toggle('visible', query.length > 0);
        
        if (query.length === 0) {
            if (activeCat === 'all') {
                renderAllSections();
            } else {
                renderSection(activeCat);
            }
            return;
        }
        
        performSearch(query);
    });
    
    clearBtn.addEventListener('click', () => {
        input.value = '';
        clearBtn.classList.remove('visible');
        if (activeCat === 'all') {
            renderAllSections();
        } else {
            renderSection(activeCat);
        }
    });
}

function performSearch(query) {
    const content = document.getElementById('content');
    let resultsHTML = '';
    let totalMatches = 0;
    
    for (const catKey of Object.keys(clinicalData)) {
        if (activeCat !== 'all' && activeCat !== catKey) continue;
        
        const catName = CAT_NAMES[catKey] || catKey;
        const icon = CAT_ICONS[catKey] || '';
        let catMatches = '';
        
        for (const [subKey, items] of Object.entries(clinicalData[catKey])) {
            const subLabel = subKey.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
            if (Array.isArray(items)) {
                let subMatches = '';
                for (const item of items) {
                    const searchable = JSON.stringify(item).toLowerCase();
                    if (searchable.includes(query)) {
                        subMatches += highlightSearch(renderDrugCard(item, catKey), query);
                    }
                }
                if (subMatches) {
                    catMatches += `<div style="padding:0.5rem 1.25rem;font-size:0.75rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid var(--border);">${subLabel}</div>`;
                    catMatches += subMatches;
                }
            } else {
                const searchable = JSON.stringify(items).toLowerCase();
                if (searchable.includes(query)) {
                    catMatches += highlightSearch(renderDrugCard(items, catKey), query);
                }
            }
        }
        
        if (catMatches) {
            totalMatches++;
            resultsHTML += `
                <div class="section expanded" data-cat="${catKey}">
                    <div class="section-header">
                        <div class="section-title">${icon} ${catName}</div>
                        <div class="section-toggle">&#9662;</div>
                    </div>
                    <div class="section-body">${catMatches}</div>
                </div>
            `;
        }
    }
    
    if (totalMatches === 0) {
        content.innerHTML = `
            <div class="no-results">
                <div style="font-size:2rem;margin-bottom:0.5rem;">🔍</div>
                No results for "${query}"<br>
                <span style="font-size:0.8rem;">Try a different drug name or condition</span>
            </div>
        `;
    } else {
        content.innerHTML = resultsHTML;
        attachSectionHandlers();
    }
}

function highlightSearch(html, query) {
    const words = query.split(/\s+/).filter(w => w.length > 1);
    if (words.length === 0) return html;
    
    // Simple highlight - wrap matching text in content areas
    for (const word of words) {
        const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        html = html.replace(regex, '<span class="highlight">$1</span>');
    }
    return html;
}

// ─── Scroll to top ───
function setupScrollTop() {
    const btn = document.getElementById('scrollTop');
    window.addEventListener('scroll', () => {
        btn.classList.toggle('visible', window.scrollY > 300);
    });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ─── Install Prompt ───
function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        document.getElementById('installBar').classList.add('show');
    });
    
    document.getElementById('installBtn').addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                document.getElementById('installBar').classList.remove('show');
            }
            deferredPrompt = null;
        }
    });
}

// ─── Connection Status ───
function updateConnectionStatus() {
    const badge = document.getElementById('offlineBadge');
    if (!navigator.onLine) {
        badge.textContent = 'Offline';
        badge.style.background = '#f39c12';
    } else {
        badge.textContent = 'Offline Ready';
        badge.style.background = 'var(--accent)';
    }
}

window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);

// Footer
document.getElementById('footer').innerHTML = `
    Titrate v2.0 &middot; Bara ICU Dosing Guide &middot; 2024<br>
    For clinical reference only &middot; Verify all doses<br>
    <span style="opacity:0.7;">Created by Tashriq Hendricks &amp; Kimi</span>
`;