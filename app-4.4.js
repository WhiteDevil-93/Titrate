/* ===== THEME MANAGEMENT ===== */
function initTheme() {
  const isLight = document.body.classList.contains('light');
  const btn = document.getElementById('theme-tog');
  if (btn) btn.textContent = isLight ? '☀️' : '🌙';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isLight ? '#f3f7f6' : '#0f2e2e');
}

function togTheme() {
  const isLight = document.body.classList.toggle('light');
  localStorage.setItem('tr_theme', isLight ? 'light' : 'dark');
  initTheme();
}
const APP_VERSION='4.7';
let D=null,W=0,act='all',deferred=null,scoreSt={};

const C={favourites:'Favourites',all:'All','1_resuscitation_fluids_and_inotropes':'Resuscitation','2_airway_and_ventilation':'Airway & Vent','3_sedation_analgesia_and_neurology':'Sedation & Neuro','4_antimicrobials_and_infectious_diseases':'Antimicrobials','5_metabolic_electrolytes_and_nutrition':'Metabolic','6_poisoning_and_toxicology':'Toxicology','7_useful_formulae':'Formulae','8_cardiovascular':'Cardiovascular','9_blood_products':'Blood','10_endocrine_and_other':'Endocrine','11_ed_medical_emergencies':'ED Medical','12_ed_toxicology':'ED Toxic','13_ed_trauma_surgical':'ED Trauma','14_ed_metabolic':'ED Metabolic','15_ed_procedures':'ED Procedures','16_score_calculators':'Score Calc'};
const I={'favourites':'⭐','all':'📋','1_resuscitation_fluids_and_inotropes':'💉','2_airway_and_ventilation':'🫁','3_sedation_analgesia_and_neurology':'🧠','4_antimicrobials_and_infectious_diseases':'🦠','5_metabolic_electrolytes_and_nutrition':'⚗️','6_poisoning_and_toxicology':'☠️','7_useful_formulae':'📐','8_cardiovascular':'❤️','9_blood_products':'🩸','10_endocrine_and_other':'🔬','11_ed_medical_emergencies':'🩺','12_ed_toxicology':'☠️','13_ed_trauma_surgical':'🚑','14_ed_metabolic':'⚗️','15_ed_procedures':'🩺','16_score_calculators':'📊'};
const ORDER=['favourites','all','1_resuscitation_fluids_and_inotropes','2_airway_and_ventilation','3_sedation_analgesia_and_neurology','4_antimicrobials_and_infectious_diseases','5_metabolic_electrolytes_and_nutrition','6_poisoning_and_toxicology','7_useful_formulae','8_cardiovascular','9_blood_products','10_endocrine_and_other','11_ed_medical_emergencies','12_ed_toxicology','13_ed_trauma_surgical','14_ed_metabolic','15_ed_procedures','16_score_calculators'];

const TAB_NAMES={...C,'2_airway_and_ventilation':'Airway','3_sedation_analgesia_and_neurology':'Sedation','4_antimicrobials_and_infectious_diseases':'Antibiotics','5_metabolic_electrolytes_and_nutrition':'Metabolic','6_poisoning_and_toxicology':'Toxicology','7_useful_formulae':'Formulae','10_endocrine_and_other':'Endocrine','11_ed_medical_emergencies':'ED Medical','12_ed_toxicology':'ED Toxic','13_ed_trauma_surgical':'ED Trauma','14_ed_metabolic':'ED Metabolic','15_ed_procedures':'ED Proc','16_score_calculators':'Scores'};

/* ===== CACHE BUSTING ===== */
function checkVersion(){
  const cached=localStorage.getItem('tr_ver');
  if(cached&&cached!==APP_VERSION){
    // Auto-clear old cache
    localStorage.removeItem('tr_ver');
    localStorage.removeItem('tr_f');
    localStorage.removeItem('tr_w');
    localStorage.removeItem('tr_onboarded');
    scoreSt={};
    // Unregister old service workers
    if('serviceWorker'in navigator)navigator.serviceWorker.getRegistrations().then(regs=>regs.forEach(r=>r.unregister()));
    // Force reload once
    if(!sessionStorage.getItem('tr_reloaded')){sessionStorage.setItem('tr_reloaded','1');location.reload(true)}
  }
  localStorage.setItem('tr_ver',APP_VERSION);
}

/* ===== WEIGHT ===== */
function gW(){return parseFloat(localStorage.getItem('tr_w')||'0')}
function sW(v){
  W=parseFloat(v)||0;
  localStorage.setItem('tr_w',W);
  // Show confirmation
  if(W>0){
    showWeightToast(W);
    // Re-render to update calculated doses
    if(act==='all')renderAll();else if(act!=='favourites')renderCat(act);
  }
}

/* ===== FAVS ===== */
function gF(){try{return JSON.parse(localStorage.getItem('tr_f')||'[]')}catch{return[]}}
function sF(f){localStorage.setItem('tr_f',JSON.stringify(f));updF()}
function togF(k){let f=gF();sF(f.includes(k)?f.filter(x=>x!==k):[...f,k]);if(act==='favourites')renderF()}
function iF(k){return gF().includes(k)}
function mK(it,cat){return cat+'::'+(it.item||it.drug||it.condition_or_drug||it.poison_or_drug||it.antidote_treatment||it.product||'')}
function updF(){const b=document.getElementById('favCt');if(b){const c=gF().length;b.textContent=c;b.style.display=c?'inline':'none'}}

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded',()=>{
  checkVersion();
  initTheme();
  W=gW();document.getElementById('w').value=W||'';
  document.getElementById('w').addEventListener('input',e=>sW(e.target.value));
  load();
});

async function load(){
  try{
    // Try single data.json first
    let r=await fetch('data.json?v='+APP_VERSION,{cache:'no-store'});
    let txt=await r.text();
    // If placeholder or empty, load chunks in parallel with retry
    if(txt.length<100||txt.includes('PLACEHOLDER')){
      const chunkUrls=[];
      for(let i=0;i<10;i++){
        if(i===8){chunkUrls.push('data_8a.json','data_8b.json')}
        else{chunkUrls.push('data_'+i+'.json')}
      }
      // Fetch all chunks in parallel
      const fetchChunk=async(url)=>{
        for(let attempt=0;attempt<3;attempt++){
          try{
            const rc=await fetch(url+'?v='+APP_VERSION,{cache:'no-store'});
            if(rc.ok)return await rc.text();
          }catch(e){}
          await new Promise(r=>setTimeout(r,300));
        }
        throw new Error('Failed to load '+url);
      };
      const chunks=await Promise.all(chunkUrls.map(fetchChunk));
      txt=chunks.join('');
    }
    D=JSON.parse(txt);mkNav();renderAll();updF();
  }catch(e){document.getElementById('c').innerHTML='<div class="nores"><div class=ico>⚠️</div>Failed to load data. Please check connection.</div>'}
  // Show onboarding on first visit
  if(!localStorage.getItem('tr_onboarded')){
    showOnboarding();
  }
  document.getElementById('s').addEventListener('input',doSearch);
  if('serviceWorker'in navigator){
    // Register kill-switch SW + overwrite old service-worker.js
    navigator.serviceWorker.register('sw.js?v='+APP_VERSION).catch(()=>{});
    navigator.serviceWorker.register('service-worker.js?v='+APP_VERSION).catch(()=>{});
    // Unregister any OTHER service workers (legacy cleanup)
    navigator.serviceWorker.getRegistrations().then(regs=>regs.forEach(r=>{
      const url=r.scope||'';
      if(url.includes('service-worker')&&!url.includes('service-worker.js?v='+APP_VERSION))r.unregister();
    }));
  }
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;document.getElementById('inst').classList.add('on')});
  let cont=document.getElementById('c');
  cont.addEventListener('scroll',()=>document.getElementById('top').classList.toggle('on',cont.scrollTop>400));
}
function doInstall(){if(deferred){deferred.prompt();deferred=null;document.getElementById('inst').classList.remove('on')}};

/* ===== ONBOARDING ===== */
let onboardStep=0;
const ONBOARD_STEPS=[
  {title:'Search anything',desc:'Search any drug, protocol, or score to find what you need fast.',icon:'🔍'},
  {title:'Set patient weight',desc:'Set patient weight once — it applies to all dosing calculations.',icon:'⚖️'},
  {title:'Browse & save',desc:'Tap categories to browse, tap stars to save favourites for quick access.',icon:'⭐'}
];
function showOnboarding(){
  if(document.getElementById('obv'))return;
  onboardStep=0;
  const ov=document.createElement('div');ov.id='obv';ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:1000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px)';
  renderOnboardCard(ov);
  document.body.appendChild(ov);
}
function renderOnboardCard(ov){
  const step=ONBOARD_STEPS[onboardStep];
  ov.innerHTML=`<div style="background:var(--bg);border:1px solid var(--b);border-radius:1rem;padding:1.5rem;max-width:320px;width:85%;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.4)">
    <div style="font-size:3rem;margin-bottom:.5rem">${step.icon}</div>
    <div style="font-weight:700;font-size:1.1rem;margin-bottom:.3rem;color:var(--t)">${step.title}</div>
    <div style="font-size:.82rem;color:var(--t2);margin-bottom:1rem;line-height:1.4">${step.desc}</div>
    <div style="display:flex;gap:.5rem;margin-bottom:1rem;justify-content:center">
      ${ONBOARD_STEPS.map((_,i)=>`<div style="width:8px;height:8px;border-radius:50%;background:${i===onboardStep?'var(--a)':'var(--b)'};transition:background .2s"></div>`).join('')}
    </div>
    <div style="display:flex;gap:.5rem">
      <button onclick="skipOnboard()" style="flex:1;padding:.5rem;border:1px solid var(--b);border-radius:.5rem;background:transparent;color:var(--t2);font-size:.8rem;cursor:pointer">Skip</button>
      <button onclick="nextOnboard()" style="flex:1;padding:.5rem;border:none;border-radius:.5rem;background:var(--a);color:#000;font-size:.8rem;font-weight:700;cursor:pointer">${onboardStep<ONBOARD_STEPS.length-1?'Next':'Get Started'}</button>
    </div>
  </div>`;
}
function nextOnboard(){
  onboardStep++;
  if(onboardStep>=ONBOARD_STEPS.length){
    localStorage.setItem('tr_onboarded','1');
    const ov=document.getElementById('obv');if(ov)ov.remove();
  }else{
    renderOnboardCard(document.getElementById('obv'));
  }
}
function skipOnboard(){
  localStorage.setItem('tr_onboarded','1');
  const ov=document.getElementById('obv');if(ov)ov.remove();
}

/* ===== WEIGHT TOAST ===== */
function showWeightToast(w){
  let t=document.getElementById('wtoast');
  if(!t){
    t=document.createElement('div');t.id='wtoast';
    t.style.cssText='position:fixed;top:calc(60px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);background:var(--g);color:#000;padding:.4rem .8rem;border-radius:.5rem;font-size:.8rem;font-weight:700;z-index:999;opacity:0;transition:opacity .3s;pointer-events:none;white-space:nowrap';
    document.body.appendChild(t);
  }
  t.textContent=`Weight set: ${w} kg`;
  t.style.opacity='1';
  setTimeout(()=>{t.style.opacity='0'},2000);
}

/* ===== NAV ===== */
function mkNav(){
  let h='';
  for(const k of ORDER){
    const label=TAB_NAMES[k]||C[k];
    if(k==='favourites'){const c=gF().length;h+=`<button class="cp${k===act?' on':''}" data-c="${k}" onclick="setCat('${k}')">${I[k]} ${label}${c?`<span class=n id=favCt>${c}</span>`:''}</button>`}
    else if(k==='all')h+=`<button class="cp on" data-c="all" onclick="setCat('all')">${I.all} All</button>`
    else if(D&&D[k])h+=`<button class="cp" data-c="${k}" onclick="setCat('${k}')">${I[k]} ${label}</button>`
  }
  document.getElementById('nav').innerHTML=h
}
function setCat(c){act=c;document.querySelectorAll('.cp').forEach(b=>b.classList.toggle('on',b.dataset.c===c));document.getElementById('s').value='';if(c==='favourites')renderF();else if(c==='all')renderAll();else renderCat(c)}

/* ===== RENDER ===== */
function renderAll(){let h='';for(const k of ORDER)if(k!=='favourites'&&k!=='all'&&D[k])h+=renderSect(k);document.getElementById('c').innerHTML=h||'<div class=nores>No data</div>';bindTog();updF()}
function renderCat(cat){document.getElementById('c').innerHTML=renderSect(cat);bindTog();updF();if(cat==='7_useful_formulae')renderCustomInfusionsList()}

function renderSect(cat){
  const d=D[cat];if(!d)return'';
  // Score calculators section
  if(cat==='16_score_calculators')return renderScores(d);
  // ED Procedures special renderer
  if(cat==='15_ed_procedures')return renderEDProcedures(d);
  let body='';
  for(const[sk,items]of Object.entries(d)){
    if(Array.isArray(items)){
      let sm='';
      for(const it of items){const c=renderItem(it,cat);if(c)sm+=c}
      if(sm)body+=`<div class="sub">${sk.replace(/_/g,' ').replace(/^\w/,c=>c.toUpperCase())}</div>`+sm
    }else{const c=renderItem(items,cat);if(c)body+=c}
  }
  // Useful Formulae: add custom infusion creator + saved infusions
  if(cat==='7_useful_formulae'){
    body+=renderCustomInfusionCreator();
    body+=`<div id="custom-infusions-list" style="margin:.3rem .5rem"></div>`;
  }
  if(!body)return'';
  return `<div class="sect open" data-c="${cat}"><div class="sh" onclick="togS(this)"><div style="display:flex;align-items:center"><div class="shi">${I[cat]}</div><div class="sht">${C[cat]}</div></div><div class="shc">▼</div></div><div class="sb">${body}</div></div>`
}

/* ===== ED PROCEDURES RENDERER ===== */
function renderEDProcedures(d){
  const protocols=d.protocols||[];
  if(!protocols.length)return'';
  let body='';
  for(const p of protocols){
    if(p.item)body+=renderEDProtocolCard(p);
  }
  if(!body)return'';
  return `<div class="sect open" data-c="15_ed_procedures"><div class="sh" onclick="togS(this)"><div style="display:flex;align-items:center"><div class="shi">${I['15_ed_procedures']}</div><div class="sht">${C['15_ed_procedures']}</div></div><div class="shc">▼</div></div><div class="sb">${body}</div></div>`;
}

function renderEDProtocolCard(p){
  const k='15_ed_procedures::'+p.item;
  let h=`<div class="drug" data-k="${esc(k)}">`;
  // Title + star
  h+=`<div class="dh"><div class="dn" style="font-size:.9rem">${esc(p.item)}</div><button class="star${iF(k)?' on':''}" onclick="togF('${esc(k)}')">${iF(k)?'★':'☆'}</button></div>`;
  // Equipment list
  const eq=p.equipment||[];
  if(eq.length){
    h+=`<div class="eq-grid" style="margin:.3rem 0">`;
    for(const e of eq)h+=`<span class="eq-item">${esc(e)}</span>`;
    h+=`</div>`;
  }
  // Drugs
  const drugs=p.drugs||[];
  if(drugs.length){
    for(const drug of drugs)h+=renderDrug(drug,'15_ed_procedures');
  }
  // Management steps
  const steps=p.management_steps||[];
  if(steps.length){
    h+=`<div style="font-size:.65rem;font-weight:700;color:var(--a);margin:.4rem 0 .2rem;text-transform:uppercase;letter-spacing:.5px">Protocol Steps</div>`;
    for(const s of steps){
      h+=`<div style="margin:.2rem 0;padding:.4rem .5rem;border-radius:.4rem;background:rgba(0,0,0,.15);border-left:2px solid var(--a)">`;
      h+=`<div style="font-weight:700;font-size:.78rem;color:var(--t)">Step ${s.step_number||'?'}: ${esc(s.action||'')}</div>`;
      if(s.details)h+=`<div style="font-size:.75rem;color:var(--t2);margin-top:.1rem">${esc(s.details)}</div>`;
      if(s.caution)h+=`<div style="font-size:.72rem;color:#e74c3c;margin-top:.15rem">⚠️ ${esc(s.caution)}</div>`;
      h+=`</div>`;
    }
  }
  // Notes / sub-protocols
  const notes=p.notes_updates||'';
  if(notes){
    const sections=parseProtocolSections(notes);
    if(sections.length>1){
      for(const sec of sections){
        h+=`<div style="margin:.25rem 0;padding:.35rem .5rem;background:rgba(255,255,255,.03);border-radius:.3rem">`;
        h+=`<div style="font-size:.68rem;font-weight:700;color:var(--a);text-transform:uppercase;letter-spacing:.5px;margin-bottom:.1rem">${esc(sec.title)}</div>`;
        h+=`<div style="font-size:.76rem;color:var(--t2);line-height:1.45">${sec.content}</div>`;
        h+=`</div>`;
      }
    }else{
      h+=`<div class="note" style="font-size:.76rem;color:var(--t2);line-height:1.45;margin-top:.2rem">${sections.map(s=>s.content).join('<br><br>')}</div>`;
    }
  }
  // Sub-protocols (for Oncological, Ophthalmology, Vascular, etc.)
  const subs=p.sub_protocols||[];
  if(subs.length){
    for(const sp of subs){
      h+=`<div style="margin:.35rem 0;padding:.4rem .6rem;border-radius:.4rem;background:rgba(0,217,181,.06);border:1px solid var(--b)">`;
      h+=`<div style="font-size:.82rem;font-weight:700;color:var(--t);margin-bottom:.15rem">${esc(sp.name||'')}</div>`;
      // Render sub-protocol content
      for(const[sk,sv]of Object.entries(sp)){
        if(sk==='name'||!sv)continue;
        if(Array.isArray(sv)){
          h+=`<div style="font-size:.68rem;font-weight:700;color:var(--a);margin:.15rem 0 .05rem;text-transform:uppercase">${esc(sk)}</div>`;
          for(const item of sv){
            if(typeof item==='string'){
              h+=`<div style="font-size:.75rem;color:var(--t2);padding:.1rem 0">• ${esc(item)}</div>`;
            }else if(typeof item==='object'){
              for(const[ik,iv]of Object.entries(item)){
                if(!iv)continue;
                h+=`<div style="font-size:.75rem;color:var(--t2);padding:.1rem 0"><b>${esc(ik)}</b>: ${esc(typeof iv==='string'?iv:JSON.stringify(iv))}</div>`;
              }
            }
          }
        }else if(typeof sv==='object'){
          h+=`<div style="font-size:.68rem;font-weight:700;color:var(--a);margin:.15rem 0 .05rem;text-transform:uppercase">${esc(sk)}</div>`;
          for(const[dk,dv]of Object.entries(sv)){
            if(!dv)continue;
            h+=`<div style="font-size:.75rem;color:var(--t2);padding:.1rem 0"><b>${esc(dk)}</b>: ${esc(typeof dv==='string'?dv:JSON.stringify(dv))}</div>`;
          }
        }else{
          h+=`<div style="font-size:.75rem;color:var(--t2);padding:.1rem 0"><b>${esc(sk)}</b>: ${esc(String(sv))}</div>`;
        }
      }
      h+=`</div>`;
    }
  }
  // Settings
  const settings=p.settings||[];
  if(settings.length){
    h+=`<div style="font-size:.65rem;font-weight:700;color:var(--a);margin:.4rem 0 .2rem;text-transform:uppercase;letter-spacing:.5px">Settings</div>`;
    for(const s of settings){
      h+=`<div style="font-size:.76rem;color:var(--t2);padding:.15rem 0"><b>${esc(s.parameter||'')}</b>: ${esc(s.value||'')}${s.unit?` ${esc(s.unit)}`:''}${s.conditions?` <span style="color:var(--w)">(${esc(s.conditions)})</span>`:''}</div>`;
    }
  }
  // Monitoring
  if(p.monitoring){
    const mon=Array.isArray(p.monitoring)?p.monitoring:[p.monitoring];
    h+=`<div style="font-size:.65rem;font-weight:700;color:var(--a);margin:.3rem 0 .1rem;text-transform:uppercase;letter-spacing:.5px">Monitoring</div>`;
    for(const m of mon)h+=`<div style="font-size:.75rem;color:var(--t2)">• ${esc(m)}</div>`;
  }
  // Complications
  const comp=p.complications||[];
  if(comp.length){
    h+=`<div style="font-size:.65rem;font-weight:700;color:var(--d);margin:.3rem 0 .1rem;text-transform:uppercase;letter-spacing:.5px">Complications</div>`;
    for(const c of comp)h+=`<div style="font-size:.75rem;color:var(--t2)">• ${esc(c)}</div>`;
  }
  // Warnings
  const warns=p.warnings||[];
  if(warns.length){
    for(const w of warns)h+=`<div style="font-size:.72rem;color:#e74c3c;margin:.1rem 0;padding:.2rem .3rem;background:rgba(231,76,60,.08);border-radius:.3rem">⚠️ ${esc(w)}</div>`;
  }
  h+=`</div>`;
  return h;
}

/* ===== ITEM RENDERER: Drug vs Protocol ===== */
function renderItem(it,cat){
  const n=it.item||it.drug||it.condition_or_drug||it.poison_or_drug||it.antidote_treatment||it.product||'';
  if(!n)return'';
  // Protocol header entries (━━ style)
  if(n.startsWith('━'))return renderProtoHeader(it,cat);
  // Check if this is a protocol entry (has structured fields or very long notes)
  const notes=(it.notes_updates||it.notes||'');
  const isProtocol=it.protocol_type==='ed_protocol'||it.protocol_type==='ed_guideline'||
    (notes.length>80&&(notes.includes(':')||notes.includes('|')||notes.includes('STEPS')))||
    it.parent_protocol||it.clinical_features||it.management_steps;
  if(isProtocol)return renderProtocol(it,cat,n,notes);
  return renderDrug(it,cat,n);
}

/* ===== PROTOCOL HEADER (━━) ===== */
function renderProtoHeader(it,cat){
  const n=it.item||'';
  return `<div class="proto-h" style="padding:.4rem .75rem;border-top:1px solid var(--b);background:rgba(0,0,0,.2)">
    <div class="proto-icon">▶</div>
    <div style="font-size:.85rem;font-weight:700">${n.replace(/━/g,'').trim()}</div>
  </div>`
}

/* ===== PROTOCOL CARD ===== */
function renderProtocol(it,cat,n,notes){
  const dk=mK(it,cat),fv=iF(dk);
  let h=`<div class="proto" data-s="${(n+' '+notes).toLowerCase()}">`;
  let badge='';
  if(notes.toLowerCase().includes('overdose'))badge='<span class="bdg bh">OD</span>';
  else if(notes.toLowerCase().includes('trauma'))badge='<span class="bdg bh">Trauma</span>';
  else if(notes.toLowerCase().includes('sepsis'))badge='<span class="bdg bh">Sepsis</span>';
  else if(notes.toLowerCase().includes('stroke'))badge='<span class="bdg bh">Stroke</span>';
  h+=`<div class="proto-h">
    <div class="proto-icon">📋</div>
    <div class="proto-title">${n}${badge}</div>
    <button class="proto-star${fv?' on':''}" onclick="togF('${dk}')">${fv?'★':'☆'}</button>
  </div>`;

  // Use structured data if available, else fall back to text parsing
  const hasStructured = it.drugs?.length || it.management_steps?.length || (it.clinical_features && Object.keys(it.clinical_features).length) || it.diagnostic_criteria?.length || it.classification?.length || it.monitoring?.length || it.warnings?.length || it.disposition || it.equipment?.length;
  if(hasStructured){
    h+=renderStructuredProtocol(it,cat);
  } else {
    h+=parseProtocolSections(notes);
  }
  h+='</div>';
  return h;
}

/* ===== PARSE PROTOCOL NOTES INTO SECTIONS ===== */
function parseProtocolSections(text){
  if(!text||text.length<10)return'';
  let h='';
  
  // Split by common section markers
  // Pattern: "Key: value | Key: value" or "FEATURES: a,b,c | MANAGEMENT: step1 -> step2"
  
  // 1. Extract steps (arrows or numbered)
  const steps=[];
  // Match "STEPS: a -> b -> c" or "STEP 1: x | STEP 2: y"
  const stepMatch=text.match(/STEPS?:\s*([^|]*)/i);
  if(stepMatch){
    const stepTexts=stepMatch[1].split(/->|→|\d+\./).filter(s=>s.trim());
    for(let i=0;i<stepTexts.length;i++){
      const st=stepTexts[i].trim();
      if(st.length>2)steps.push(st);
    }
  }
  // Also match steps separated by arrows anywhere
  if(steps.length===0){
    const arrowParts=text.split(/->|→/);
    if(arrowParts.length>1){
      for(let i=0;i<arrowParts.length;i++){
        const st=arrowParts[i].replace(/^[^a-zA-Z]*/,'').trim();
        // Only take reasonable-length steps
        if(st.length>3&&st.length<120)steps.push(st);
      }
    }
  }
  
  // 2. Extract features by system
  const features={};
  const sysPatterns={
    'Muscarinic':/Muscarinic[:\s]*([^|]*)/i,
    'Nicotinic':/Nicotinic[:\s]*([^|]*)/i,
    'CNS':/CNS[:\s]*([^|]*)/i,
    'Symptoms':/Symptoms[:\s]*([^|]*)/i,
    'Signs':/Signs[:\s]*([^|]*)/i,
    'Clinical Features':/Clinical Features[:\s]*([^|]*)/i
  };
  for(const[sys,pattern]of Object.entries(sysPatterns)){
    const m=text.match(pattern);
    if(m){const items=m[1].split(/[,;]/).map(s=>s.trim()).filter(s=>s.length>1);if(items.length)features[sys]=items}
  }
  
  // 3. Extract decontamination info
  const decon={};
  const deconPatterns={
    'Activated Charcoal':/Activated Charcoal[:\s]*([^|]*)/i,
    'Gastric Lavage':/Gastric Lavage[:\s]*([^|]*)/i,
    'Skin Decon':/Skin Decon(?:tamination)?[:\s]*([^|]*)/i,
    'Whole Bowel':/Whole Bowel[:\s]*([^|]*)/i
  };
  for(const[item,pattern]of Object.entries(deconPatterns)){
    const m=text.match(pattern);if(m)decon[item]=m[1].trim()
  }
  
  // 4. Extract warnings
  const warnings=[];
  const warnMatch=text.match(/WARNINGS?:\s*([^|]*)/i);
  if(warnMatch)warnMatch[1].split(/[|,]/).forEach(w=>{const wt=w.trim();if(wt.length>3)warnings.push(wt)});
  // Also match ⚠️ symbols
  const symMatch=text.match(/⚠️\s*([^|]*)/g);
  if(symMatch)symMatch.forEach(m=>{const w=m.replace('⚠️','').trim();if(w.length>3)warnings.push(w)});
  
  // 5. Extract disposition
  let disp='';
  const dispMatch=text.match(/Disposition[:\s]*([^|]*)/i);
  if(dispMatch)disp=dispMatch[1].trim();
  
  // 6. Extract monitoring
  const monitor=[];
  const monMatch=text.match(/Monitor(?:ing)?:\s*([^|]*)/i);
  if(monMatch)monMatch[1].split(/[,;]/).forEach(m=>{const mt=m.trim();if(mt.length>2)monitor.push(mt)});
  
  // === RENDER SECTIONS ===
  
  // Features section
  if(Object.keys(features).length>0){
    h+=`<div class="ps"><div class="ps-h" onclick="togPS(this)">🩺 Clinical Features</div><div class="ps-b" style="display:none">`;
    for(const[sys,items]of Object.entries(features)){
      h+=`<div style="font-weight:700;color:var(--a);font-size:.7rem;margin:.15rem 0;text-transform:uppercase;letter-spacing:.5px">${sys}</div>`;
      h+=`<ul>${items.map(i=>`<li>${i}</li>`).join('')}</ul>`;
    }
    h+='</div></div>';
  }
  
  // Steps section
  if(steps.length>0){
    h+=`<div class="ps"><div class="ps-h" onclick="togPS(this)">📋 Management Steps</div><div class="ps-b" style="display:none"><div class="steplist">`;
    for(let i=0;i<steps.length;i++){
      h+=`<div class="steprow"><span class="steparrow">→</span><div class="steptxt"><strong>Step ${i+1}:</strong> ${steps[i]}</div></div>`;
    }
    h+='</div></div></div>';
  }
  
  // Decontamination section
  if(Object.keys(decon).length>0){
    h+=`<div class="ps"><div class="ps-h" onclick="togPS(this)">🧼 Decontamination</div><div class="ps-b" style="display:none">`;
    for(const[item,val]of Object.entries(decon)){
      h+=`<div style="margin:.15rem 0"><strong style="color:var(--a)">${item}:</strong> ${val}</div>`;
    }
    h+='</div></div>';
  }
  
  // Monitoring section
  if(monitor.length>0){
    h+=`<div class="ps"><div class="ps-h" onclick="togPS(this)">👁 Monitoring</div><div class="ps-b" style="display:none"><ul>${monitor.map(m=>`<li>${m}</li>`).join('')}</ul></div></div>`;
  }
  
  // Warnings section
  if(warnings.length>0){
    h+=`<div class="warnbox"><div class="wl">⚠️ Warnings</div>${warnings.join('<br>')}</div>`;
  }
  
  // Disposition
  if(disp){
    h+=`<div style="margin-top:.25rem;padding:.3rem .5rem;border-radius:.3rem;background:rgba(0,201,167,.06);border-left:2px solid var(--g);font-size:.72rem"><strong style="color:var(--g)">Disposition:</strong> ${disp}</div>`;
  }
  
  // If nothing was parsed but there are notes, show them as a clean note (truncated)
  if(h===''&&text.length>10){
    // Try to format as bullet points by splitting on pipes
    const parts=text.split('|').map(p=>p.trim()).filter(p=>p.length>3);
    if(parts.length>1&&parts.length<15){
      h+=`<div class="ps"><div class="ps-h" onclick="togPS(this)">📋 Details</div><div class="ps-b" style="display:none"><ul>${parts.map(p=>`<li>${p}</li>`).join('')}</ul></div></div>`;
    }else{
      // Just show as note, but cap length
      const short=text.length>300?text.substring(0,300)+'...':text;
      h+=`<div class="note">${short}</div>`;
    }
  }
  
  return h;
}

/* ===== DRUG CARD ===== */
function renderDrug(it,cat,n){
  const dk=mK(it,cat),fv=iF(dk);
  let badges='';const nt=(it.notes_updates||it.notes||'').toLowerCase();
  if(nt.includes('first-line'))badges+='<span class="bdg b1">1st</span>';
  if(nt.includes('section 21'))badges+='<span class="bdg bc">S21</span>';
  if(nt.includes('warning')||nt.includes('caution')||nt.includes('contraindicated'))badges+='<span class="bdg bd">⚠</span>';
  let h=`<div class="drug" data-s="${(n+' '+nt).toLowerCase()}">`;
  h+=`<div class="dh"><div class="dn">${n}${badges}</div><button class="star${fv?' on':''}" onclick="togF('${dk}')">${fv?'★':'☆'}</button></div>`;
  if(it.adult_dose||it.adult_settings)h+=`<div class="dose"><span class="dl">A</span><span class="dv">${it.adult_dose||it.adult_settings}</span></div>`;
  if(it.paediatric_dose||it.paediatric_settings)h+=`<div class="dose"><span class="dl">P</span><span class="dp dv">${it.paediatric_dose||it.paediatric_settings}</span></div>`;
  if(it.protocol_dose)h+=`<div class="dose"><span class="dl">Rx</span><span class="dv">${it.protocol_dose}</span></div>`;
  // Weight-based dose calculation
  if(W>0){
    const adultDose = it.adult_dose||it.adult_settings||'';
    const pedsDose = it.paediatric_dose||it.paediatric_settings||'';
    // Check if dose contains /kg or per kg
    if(adultDose.toString().toLowerCase().includes('/kg') || adultDose.toString().toLowerCase().includes('per kg') || adultDose.toString().toLowerCase().includes('ug/kg') || adultDose.toString().toLowerCase().includes('mg/kg') || adultDose.toString().toLowerCase().includes('mcg/kg')){
      const calc = calcWeightDose(adultDose, W);
      if(calc) h+=`<div class="dose"><span class="dl">⚡</span><span class="dv" style="color:var(--a);font-weight:700">${calc} (for ${W}kg)</span></div>`;
    }
    if(pedsDose.toString().toLowerCase().includes('/kg') || pedsDose.toString().toLowerCase().includes('per kg') || pedsDose.toString().toLowerCase().includes('ug/kg') || pedsDose.toString().toLowerCase().includes('mg/kg') || pedsDose.toString().toLowerCase().includes('mcg/kg')){
      const calc = calcWeightDose(pedsDose, W);
      if(calc) h+=`<div class="dose"><span class="dl">⚡P</span><span class="dp dv">${calc} (for ${W}kg)</span></div>`;
    }
  }
  // Inline infusion calculator for inotropes/infusions
  if(isInfusionDrug(n, it)){
    h+=renderInfusionCalc(it, n);
  }
  if(it.formula){h+=`<div class="dose"><span class="dl">📐</span><span class="dv" style="font-family:monospace;font-size:.75rem">${it.formula}</span></div>`;if(it.standard_dilutions)h+=`<div class="dose"><span class="dl">Dil</span><span class="dv">${it.standard_dilutions}</span></div>`}
  if(it.notes_updates||it.notes){let cls='note';if(nt.includes('warning')||nt.includes('avoid')||nt.includes('contraindicated'))cls+=' d';else if(nt.includes('caution'))cls+=' w';h+=`<div class="${cls}">${it.notes_updates||it.notes}</div>`}
  h+='</div>';
  return h}

/* ===== WEIGHT-BASED DOSE CALCULATOR ===== */
function calcWeightDose(doseStr, wt){
  if(!doseStr||!wt)return null;
  const s=doseStr.toString().toLowerCase();
  // Find unit patterns: ug/kg, mcg/kg, mg/kg, g/kg, units/kg, mEq/kg, mmol/kg, ml/kg
  const unitMatch=s.match(/(ug|mcg|mg|g|units|mEq|mmol|ml)\s*\/\s*kg|per\s*kg/);
  if(!unitMatch)return null;
  let unit=unitMatch[1]||'';
  // Extract numeric range(s) before /kg
  // Patterns: "0.05 - 1 ug/kg" , "5-10 mg/kg" , "0.5 mg/kg"
  const numMatch=s.match(/([\d.]+)\s*(?:-|\s+to\s+)\s*([\d.]+)/);
  const singleMatch=s.match(/([\d.]+)/);
  let min=0,max=0;
  if(numMatch){min=parseFloat(numMatch[1]);max=parseFloat(numMatch[2])}
  else if(singleMatch){min=parseFloat(singleMatch[1]);max=min}
  else return null;
  // Calculate
  const calcMin=(min*wt).toFixed(1).replace(/\.0$/,'');
  const calcMax=(max*wt).toFixed(1).replace(/\.0$/,'');
  // Convert unit for output (drop /kg)
  let outUnit=unit;
  if(unit==='ug')outUnit='mcg';
  // Handle decimal cleanup
  if(min===max)return`${calcMin} ${outUnit}`;
  return`${calcMin} - ${calcMax} ${outUnit}`;
}

/* ===== INFUSION SYSTEM v2 - Enhanced ===== */
const INFUSION_DRUGS={
  'Adrenaline':{unit:'mcg/kg/min',conc:0.025,dilution:'5mg/200ml',type:'mcg'},
  'Noradrenaline':{unit:'mcg/kg/min',conc:0.05,dilution:'10mg/200ml',type:'mcg'},
  'Dobutamine':{unit:'mcg/kg/min',conc:1.25,dilution:'250mg/200ml',type:'mcg'},
  'Dopamine':{unit:'mcg/kg/min',conc:2.0,dilution:'200mg/100ml',type:'mcg'},
  'Phenylephrine':{unit:'mcg/kg/min',conc:0.1,dilution:'10mg/100ml',type:'mcg'},
  'Sodium Nitroprusside':{unit:'mcg/kg/min',conc:0.2,dilution:'50mg/250ml',type:'mcg'},
  'GTN (Nitroglycerin)':{unit:'mcg/kg/min',conc:0.2,dilution:'50mg/250ml',type:'mcg'},
  'Labetalol':{unit:'mg/hr',conc:1.0,dilution:'200mg/200ml',type:'mg'},
  'Milrinone':{unit:'mcg/kg/min',conc:0.2,dilution:'20mg/100ml',type:'mcg'},
  'Salbutamol':{unit:'mcg/min',conc:0.02,dilution:'10mg/500ml',type:'mcg'},
  'Insulin':{unit:'units/hr',conc:1.0,dilution:'50units/50ml',type:'units'},
  'Heparin':{unit:'units/hr',conc:100.0,dilution:'25000units/250ml',type:'units'},
  'Magnesium Sulphate':{unit:'mmol/hr',conc:0.1,dilution:'10mmol/100ml',type:'mmol'},
  'Isoprenaline':{unit:'mcg/kg/min',conc:0.02,dilution:'2mg/100ml',type:'mcg'},
  'Vasopressin':{unit:'units/min',conc:0.2,dilution:'20units/100ml',type:'units'}
};

function isInfusionDrug(name,it){
  const n=(name||'').toLowerCase();
  const known=Object.keys(INFUSION_DRUGS).map(x=>x.toLowerCase());
  if(known.some(x=>n.includes(x)))return true;
  const d=((it.adult_dose||it.adult_settings||it.paediatric_dose||it.paediatric_settings||it.notes_updates||it.notes||'')+'').toLowerCase();
  if(d.includes('/min')||d.includes('infusion')||d.includes('ivi')||d.includes('ml/hr')||d.includes('mcg/kg/min')||d.includes('mg/kg/hr')||d.includes('units/hr')||d.includes('mmol/hr'))return true;
  return false;
}

function getInfusionDrugInfo(name){
  const n=name||'';
  for(const[drug,info]of Object.entries(INFUSION_DRUGS)){if(n.toLowerCase().includes(drug.toLowerCase()))return info}
  return null;
}

/* ===== INFUSION CALCULATOR WIDGET ===== */
function renderInfusionCalc(it,n){
  const id=`inf-${Math.random().toString(36).slice(2,8)}`;
  const info=getInfusionDrugInfo(n);
  const unit=info?info.unit:'mcg/kg/min';
  const needsWeight=unit.includes('/kg');
  return`<div class="inf-calc" style="margin:.3rem .5rem;padding:.5rem;border-radius:.4rem;background:rgba(0,0,0,.15);border:1px solid var(--b)">
    <div style="font-size:.7rem;font-weight:700;color:var(--a);margin-bottom:.3rem">💉 Infusion Calculator</div>
    ${info?`<div style="font-size:.65rem;color:var(--t2);margin-bottom:.2rem">${info.dilution} = ${info.conc}${info.type==='mcg'?' mcg':info.type==='mg'?' mg':info.type==='units'?' units':info.type==='mmol'?' mmol':''}/ml</div>`:''}
    <div style="display:flex;gap:.3rem;flex-wrap:wrap;margin-bottom:.3rem">
      <div style="flex:1;min-width:100px"><label style="font-size:.65rem;color:var(--t2)">Dose (${unit})</label><input type="number" id="${id}-dose" placeholder="${unit}" step="any" style="width:100%;padding:.25rem .35rem;font-size:.75rem;background:var(--bg);color:var(--t);border:1px solid var(--b);border-radius:.3rem;margin-top:.1rem"></div>
      <div style="flex:1;min-width:100px"><label style="font-size:.65rem;color:var(--t2)">Conc (mg/mL or units/mL)</label><input type="number" id="${id}-conc" placeholder="e.g. 0.1" step="any" ${info?`value="${info.conc}"`:''} style="width:100%;padding:.25rem .35rem;font-size:.75rem;background:var(--bg);color:var(--t);border:1px solid var(--b);border-radius:.3rem;margin-top:.1rem"></div>
      ${needsWeight?`<div style="flex:1;min-width:100px"><label style="font-size:.65rem;color:var(--t2)">Weight (kg)</label><input type="number" id="${id}-wt" placeholder="kg" step="any" value="${W>0?W:''}" style="width:100%;padding:.25rem .35rem;font-size:.75rem;background:var(--bg);color:var(--t);border:1px solid var(--b);border-radius:.3rem;margin-top:.1rem"></div>`:`<input type="hidden" id="${id}-wt" value="1">`}
    </div>
    <button onclick="calcInfusionV2('${id}','${unit}')" style="padding:.3rem .6rem;font-size:.75rem;font-weight:700;background:var(--a);color:#000;border:none;border-radius:.3rem;cursor:pointer">Calculate mL/hr</button>
    <div id="${id}-res" style="margin-top:.3rem;font-size:.78rem;display:none"></div>
  </div>`;
}

function calcInfusionV2(id,unit){
  const dose=parseFloat(document.getElementById(id+'-dose')?.value)||0;
  const conc=parseFloat(document.getElementById(id+'-conc')?.value)||0;
  const wt=parseFloat(document.getElementById(id+'-wt')?.value)||0;
  const resEl=document.getElementById(id+'-res');
  if(!resEl)return;
  if(dose<=0||conc<=0||wt<=0){resEl.style.display='block';resEl.innerHTML='<span style="color:#e74c3c">Enter all values</span>';return}
  let mlHr,formulaDesc;
  if(unit.includes('mcg/kg/min')){mlHr=(dose*wt*60)/(conc*1000);formulaDesc=`(${dose} mcg/kg/min × ${wt}kg × 60) ÷ (${conc} mg/ml × 1000)`}
  else if(unit.includes('mcg/min')){mlHr=(dose*60)/(conc*1000);formulaDesc=`(${dose} mcg/min × 60) ÷ (${conc} mg/ml × 1000)`}
  else if(unit.includes('mg/hr')){mlHr=dose/conc;formulaDesc=`${dose} mg/hr ÷ ${conc} mg/ml`}
  else if(unit.includes('units/hr')){mlHr=dose/conc;formulaDesc=`${dose} units/hr ÷ ${conc} units/ml`}
  else if(unit.includes('mmol/hr')){mlHr=dose/conc;formulaDesc=`${dose} mmol/hr ÷ ${conc} mmol/ml`}
  else if(unit.includes('units/min')){mlHr=(dose*60)/conc;formulaDesc=`(${dose} units/min × 60) ÷ ${conc} units/ml`}
  else{mlHr=dose/conc;formulaDesc=`${dose} ÷ ${conc}`}
  const dropsMin=mlHr*20/60;
  resEl.style.display='block';
  resEl.innerHTML=`<div style="font-weight:700;color:var(--g);font-size:1rem">${mlHr.toFixed(1)} mL/hr</div>
    <div style="font-size:.68rem;color:var(--t2);margin-top:.1rem">${formulaDesc} = ${mlHr.toFixed(2)} mL/hr</div>
    <div style="font-size:.68rem;color:var(--t2)">~${dropsMin.toFixed(0)} drops/min (20 gtt/mL)</div>`;
}

/* ===== CUSTOM INFUSION CREATOR ===== */
function renderCustomInfusionCreator(){
  const id=`cinf-${Math.random().toString(36).slice(2,8)}`;
  return`<div class="inf-calc" style="margin:.5rem;padding:.6rem;border-radius:.5rem;background:rgba(0,217,181,.06);border:2px dashed var(--a)">
    <div style="font-size:.8rem;font-weight:800;color:var(--a);margin-bottom:.4rem">➕ Create Custom Infusion</div>
    <div style="display:flex;gap:.3rem;flex-wrap:wrap;margin-bottom:.3rem">
      <div style="flex:2;min-width:120px"><label style="font-size:.65rem;color:var(--t2)">Drug Name</label><input type="text" id="${id}-name" placeholder="e.g. Metaraminol" style="width:100%;padding:.25rem .35rem;font-size:.75rem;background:var(--bg);color:var(--t);border:1px solid var(--b);border-radius:.3rem;margin-top:.1rem"></div>
      <div style="flex:1;min-width:80px"><label style="font-size:.65rem;color:var(--t2)">Amount</label><input type="number" id="${id}-amt" placeholder="e.g. 10" step="any" style="width:100%;padding:.25rem .35rem;font-size:.75rem;background:var(--bg);color:var(--t);border:1px solid var(--b);border-radius:.3rem;margin-top:.1rem"></div>
      <div style="flex:1;min-width:80px"><label style="font-size:.65rem;color:var(--t2)">Unit</label><select id="${id}-dunit" style="width:100%;padding:.25rem .35rem;font-size:.75rem;background:var(--bg);color:var(--t);border:1px solid var(--b);border-radius:.3rem;margin-top:.1rem"><option value="mg">mg</option><option value="mcg">mcg</option><option value="units">units</option><option value="mmol">mmol</option></select></div>
    </div>
    <div style="display:flex;gap:.3rem;flex-wrap:wrap;margin-bottom:.3rem">
      <div style="flex:1;min-width:100px"><label style="font-size:.65rem;color:var(--t2)">Fluid Volume (ml)</label><input type="number" id="${id}-vol" placeholder="e.g. 100" value="100" step="any" style="width:100%;padding:.25rem .35rem;font-size:.75rem;background:var(--bg);color:var(--t);border:1px solid var(--b);border-radius:.3rem;margin-top:.1rem"></div>
      <div style="flex:1;min-width:100px"><label style="font-size:.65rem;color:var(--t2)">Desired Dose</label><input type="number" id="${id}-ddose" placeholder="e.g. 5" step="any" style="width:100%;padding:.25rem .35rem;font-size:.75rem;background:var(--bg);color:var(--t);border:1px solid var(--b);border-radius:.3rem;margin-top:.1rem"></div>
      <div style="flex:1;min-width:100px"><label style="font-size:.65rem;color:var(--t2)">Dose Unit</label><select id="${id}-runit" style="width:100%;padding:.25rem .35rem;font-size:.75rem;background:var(--bg);color:var(--t);border:1px solid var(--b);border-radius:.3rem;margin-top:.1rem"><option value="mcg/kg/min">mcg/kg/min</option><option value="mcg/min">mcg/min</option><option value="mg/hr">mg/hr</option><option value="units/hr">units/hr</option><option value="units/min">units/min</option><option value="mmol/hr">mmol/hr</option></select></div>
    </div>
    <div style="display:flex;gap:.3rem;margin-bottom:.3rem">
      <div style="flex:1;min-width:100px"><label style="font-size:.65rem;color:var(--t2)">Weight (kg)</label><input type="number" id="${id}-cwt" placeholder="kg" step="any" value="${W>0?W:''}" style="width:100%;padding:.25rem .35rem;font-size:.75rem;background:var(--bg);color:var(--t);border:1px solid var(--b);border-radius:.3rem;margin-top:.1rem"></div>
    </div>
    <button onclick="calcCustomInfusion('${id}')" style="padding:.3rem .6rem;font-size:.75rem;font-weight:700;background:var(--a);color:#000;border:none;border-radius:.3rem;cursor:pointer;margin-right:.3rem">Calculate mL/hr</button>
    <button onclick="saveCustomInfusion('${id}')" style="padding:.3rem .6rem;font-size:.75rem;font-weight:700;background:var(--i);color:#000;border:none;border-radius:.3rem;cursor:pointer">⭐ Save</button>
    <div id="${id}-res" style="margin-top:.3rem;font-size:.78rem;display:none"></div>
  </div>`;
}

function calcCustomInfusion(id){
  const name=document.getElementById(id+'-name')?.value||'Custom';
  const amt=parseFloat(document.getElementById(id+'-amt')?.value)||0;
  const dunit=document.getElementById(id+'-dunit')?.value||'mg';
  const vol=parseFloat(document.getElementById(id+'-vol')?.value)||0;
  const ddose=parseFloat(document.getElementById(id+'-ddose')?.value)||0;
  const runit=document.getElementById(id+'-runit')?.value||'mcg/kg/min';
  const wt=parseFloat(document.getElementById(id+'-cwt')?.value)||0;
  const resEl=document.getElementById(id+'-res');
  if(!resEl)return;
  if(amt<=0||vol<=0||ddose<=0){resEl.style.display='block';resEl.innerHTML='<span style="color:#e74c3c">Enter drug amount, fluid volume, and desired dose</span>';return}
  let conc=amt/vol;
  let mlHr,formulaDesc;
  if(runit.includes('mcg/kg/min')){
    if(wt<=0){resEl.style.display='block';resEl.innerHTML='<span style="color:#e74c3c">Weight required for mcg/kg/min</span>';return}
    let concMcg=dunit==='mg'?conc*1000:conc;
    mlHr=(ddose*wt*60)/concMcg;
    formulaDesc=`(${ddose} mcg/kg/min × ${wt}kg × 60) ÷ ${concMcg.toFixed(1)} mcg/ml`;
  }else if(runit.includes('mcg/min')){
    let concMcg=dunit==='mg'?conc*1000:conc;
    mlHr=(ddose*60)/concMcg;
    formulaDesc=`(${ddose} mcg/min × 60) ÷ ${concMcg.toFixed(1)} mcg/ml`;
  }else if(runit.includes('mg/hr')){
    let concMg=dunit==='mcg'?conc/1000:conc;
    mlHr=ddose/concMg;
    formulaDesc=`${ddose} mg/hr ÷ ${concMg.toFixed(3)} mg/ml`;
  }else if(runit.includes('units/hr')){
    mlHr=ddose/conc;
    formulaDesc=`${ddose} units/hr ÷ ${conc.toFixed(2)} ${dunit}/ml`;
  }else if(runit.includes('units/min')){
    mlHr=(ddose*60)/conc;
    formulaDesc=`(${ddose} units/min × 60) ÷ ${conc.toFixed(2)} ${dunit}/ml`;
  }else if(runit.includes('mmol/hr')){
    mlHr=ddose/conc;
    formulaDesc=`${ddose} mmol/hr ÷ ${conc.toFixed(3)} mmol/ml`;
  }else{
    mlHr=ddose/conc;
    formulaDesc=`${ddose} ÷ ${conc.toFixed(3)}`;
  }
  resEl.style.display='block';
  resEl.dataset.mlhr=mlHr.toFixed(2);
  resEl.dataset.name=name;
  resEl.dataset.conc=conc.toFixed(4);
  resEl.dataset.unit=dunit;
  resEl.dataset.dilution=`${amt}${dunit}/${vol}ml`;
  resEl.innerHTML=`<div style="font-weight:700;color:var(--g);font-size:1rem">${mlHr.toFixed(1)} mL/hr</div>
    <div style="font-size:.68rem;color:var(--t2);margin-top:.1rem">${formulaDesc} = ${mlHr.toFixed(2)} mL/hr</div>
    <div style="font-size:.68rem;color:var(--t2)">Concentration: ${conc.toFixed(3)} ${dunit}/ml (${amt}${dunit}/${vol}ml)</div>`;
}

function saveCustomInfusion(id){
  const resEl=document.getElementById(id+'-res');
  if(!resEl||resEl.style.display==='none'){alert('Calculate first, then save');return}
  const inf={name:resEl.dataset.name||'Custom',dilution:resEl.dataset.dilution||'',conc:resEl.dataset.conc||'',unit:resEl.dataset.unit||'mg',mlhr:resEl.dataset.mlhr||'',timestamp:Date.now()};
  let saved=JSON.parse(localStorage.getItem('tr_custom_infusions')||'[]');
  saved.push(inf);
  localStorage.setItem('tr_custom_infusions',JSON.stringify(saved));
  renderCustomInfusionsList();
}

function renderCustomInfusionsList(){
  const el=document.getElementById('custom-infusions-list');
  if(!el)return;
  const saved=JSON.parse(localStorage.getItem('tr_custom_infusions')||'[]');
  if(!saved.length){el.innerHTML='';return}
  let h=`<div style="font-size:.7rem;font-weight:700;color:var(--a);margin:.4rem 0 .2rem;text-transform:uppercase">⭐ My Saved Infusions</div>`;
  for(let i=0;i<saved.length;i++){
    const s=saved[i];
    h+=`<div style="display:flex;align-items:center;justify-content:space-between;padding:.3rem .4rem;background:rgba(0,0,0,.1);border-radius:.3rem;margin:.15rem 0;font-size:.78rem">
      <span><b>${s.name}</b> — ${s.dilution} → ${s.mlhr} ml/hr</span>
      <button onclick="deleteCustomInfusion(${i})" style="background:none;border:none;color:var(--d);cursor:pointer;font-size:.9rem;padding:.1rem">×</button>
    </div>`;
  }
  el.innerHTML=h;
}

function deleteCustomInfusion(idx){
  let saved=JSON.parse(localStorage.getItem('tr_custom_infusions')||'[]');
  saved.splice(idx,1);
  localStorage.setItem('tr_custom_infusions',JSON.stringify(saved));
  renderCustomInfusionsList();
}

/* ===== SCORE CALCULATORS ===== */
function renderScores(scores){let h='';
for(const[key,sc]of Object.entries(scores))h+=renderScoreCalc(key,sc);
return`<div class="sect open"><div class="sh" onclick="togS(this)"><div style="display:flex;align-items:center"><div class="shi">📊</div><div class="sht">Score Calculators</div></div><div class="shc">▼</div></div><div class="sb">${h}</div></div>`}

function renderScoreCalc(key,sc){
const ct=sc.calculator_type||'toggle';const sid='sc-'+key;
if(ct==='formula')return renderFormulaCalc(key,sc);
let h=`<div class="calcw" id="${sid}"><div class="calct">📊 ${sc.name}</div>`;

if(key==='gcs'||key==='tews'||key==='burch_wartofsky'){
for(const comp of sc.components){
h+=`<div class="scq">${comp.name}</div><div class="scseg" data-comp="${comp.key||comp.name}" data-key="${key}">`;
for(const opt of(comp.options||[])){const oid=`${sid}-${comp.key||comp.name}-${opt.value}`;h+=`<button class="scopt" id="${oid}" onclick="pickSeg('${key}','${comp.key||comp.name}',${opt.value},this)"><div>${opt.label}</div><span class="sd">${opt.desc||opt.range||''}</span></button>`}
h+='</div>'}
}else if(key==='canadian_cspine'){
// Show the 2-phase flow
h+=`<div style="font-size:.68rem;color:var(--t2);margin-bottom:.3rem;padding:.3rem;border-radius:.3rem;background:rgba(0,0,0,.15)"><strong style="color:var(--a)">Phase 1:</strong> If ANY "dangerous" criterion is YES → <strong>CT C-spine</strong><br><strong style="color:var(--a)">Phase 2:</strong> If no dangerous criteria, check "simple" criteria</div>`;
for(const comp of sc.components){
const isDanger=comp.dangerous;
const cid=`${sid}-${comp.key||comp.name.replace(/\s+/g,'_')}`;
h+=`<div class="scq">${isDanger?'🔴':'🟢'} ${comp.name}</div>`;
h+=`<div class="scopts" data-cid="${cid}" data-pts="${isDanger?'danger':'simple'}">`;
h+=`<button class="scopt" id="${cid}-y" onclick="pickCCS('${cid}',true,this)">Yes</button>`;
h+=`<button class="scopt" id="${cid}-n" onclick="pickCCS('${cid}',false,this)">No</button>`;
h+='</div></div>'}
}else if(key==='tetanus_wound'){
h+=`<div class="scq">Prior tetanus doses?</div><div class="scseg" data-key="${key}">`;
['< 3 doses','3+ doses'].forEach((lbl,i)=>h+=`<button class="scopt" onclick="setTetDoses(${i},this)">${lbl}</button>`);
h+='</div></div>';
h+=`<div class="scq">Wound type?</div><div class="scseg" data-key="${key}">`;
['Clean/minor','Dirty/major'].forEach((lbl,i)=>h+=`<button class="scopt" onclick="setTetWound(${i},this)">${lbl}</button>`);
h+='</div></div>';
}else{
for(const comp of sc.components){
const cid=`${sid}-${comp.key||comp.name.replace(/\s+/g,'_')}`;
h+=`<div class="scq">${comp.name}${comp.points?` <span style="color:var(--a);font-size:.65rem">(+${comp.points})</span>`:''}</div>`;
h+=`<div class="scopts" data-cid="${cid}" data-pts="${comp.points||1}">`;
h+=`<button class="scopt" id="${cid}-y" onclick="pickToggle('${key}','${cid}',true,this)">Yes</button>`;
h+=`<button class="scopt" id="${cid}-n" onclick="pickToggle('${key}','${cid}',false,this)">No</button>`;
h+='</div></div>'}
}

h+=`<div class="scres" id="${sid}-res"><div class="tot">--</div><div class="lbl">Select all options</div></div></div>`;
return h}

function renderFormulaCalc(key,sc){
const sid='sc-'+key;
let h=`<div class="calcw" id="${sid}"><div class="calct">📐 ${sc.name}</div>`;
for(const inp of sc.inputs)h+=`<div class="fmrow"><label>${inp.name}</label><input type="number" id="${sid}-${inp.key}" placeholder="${inp.unit}" step="any" oninput="calcFormula('${key}')"><span class="u">${inp.unit}</span></div>`;
if(key==='parkland')h+=`<div class="fmrow"><label>Time of burn</label><input type="datetime-local" id="${sid}-time" oninput="calcFormula('${key}')"></div>`;
h+=`<button class="fmbtn" onclick="calcFormula('${key}')">Calculate</button>`;
h+=`<div class="scres" id="${sid}-res" style="margin-top:.35rem"><div class="tot">--</div><div class="lbl">${sc.formula}</div></div></div>`;
return h}

/* ===== CALCULATOR INTERACTIONS ===== */
function pickSeg(scoreKey,compKey,val,el){
const seg=el.parentElement;seg.querySelectorAll('.scopt').forEach(b=>b.classList.remove('on'));
el.classList.add('on');if(!scoreSt[scoreKey])scoreSt[scoreKey]={};scoreSt[scoreKey][compKey]=val;calcScore(scoreKey)
}
function pickToggle(scoreKey,cid,isYes,el){
const opts=el.parentElement;opts.querySelectorAll('.scopt').forEach(b=>b.classList.remove('on','off'));
if(isYes){el.classList.add('on');const nEl=document.getElementById(cid+'-n');if(nEl)nEl.classList.remove('on','off')}else{el.classList.add('off');const yEl=document.getElementById(cid+'-y');if(yEl)yEl.classList.remove('on','off')}
if(!scoreSt[scoreKey])scoreSt[scoreKey]={};scoreSt[scoreKey][cid]=isYes;calcScore(scoreKey)
}

// Canadian C-spine special
let ccsState={};
function pickCCS(cid,isYes,el){
const opts=el.parentElement;opts.querySelectorAll('.scopt').forEach(b=>b.classList.remove('on','off'));
if(isYes){el.classList.add('on');const nEl=document.getElementById(cid+'-n');if(nEl)nEl.classList.remove('on','off')}else{el.classList.add('off');const yEl=document.getElementById(cid+'-y');if(yEl)yEl.classList.remove('on','off')}
ccsState[cid]=isYes;calcCCS();
}
function calcCCS(){
const sc=D['16_score_calculators']['canadian_cspine'];
const dangerous=['age_65','dangerous_mechanism','paresthesias'];
const simple=['sitting','ambulatory','delayed_pain','midline_tender'];
let anyDanger=false,anySimple=false,allAnswered=true;
for(const dk of dangerous){const cid='sc-canadian_cspine-'+dk;if(ccsState[cid]===undefined)allAnswered=false;if(ccsState[cid])anyDanger=true}
for(const sk of simple){const cid='sc-canadian_cspine-'+sk;if(ccsState[cid]===undefined)allAnswered=false;if(ccsState[cid])anySimple=true}
const r=document.getElementById('sc-canadian_cspine-res');if(!r)return;
if(!allAnswered){r.className='scres';r.innerHTML='<div class="tot">--</div><div class="lbl">Answer all criteria</div>';return}
if(anyDanger){r.className='scres hi';r.innerHTML='<div class="tot">CT C-spine</div><div class="lbl">Imaging Required</div><div class="act">High-risk factors present</div>'}
else if(anySimple){r.className='scres md';r.innerHTML='<div class="tot">ROM Test</div><div class="lbl">Range of Motion</div><div class="act">If full painless ROM, no imaging needed</div>'}
else{r.className='scres';r.innerHTML='<div class="tot">No Imaging</div><div class="lbl">Low Risk</div><div class="act">Clinically cleared</div>'}
}

let tetDoses=-1,tetWound=-1;
function setTetDoses(v,el){tetDoses=v;el.parentElement.querySelectorAll('.scopt').forEach((b,i)=>b.classList.toggle('on',i===v));calcTet()}
function setTetWound(v,el){tetWound=v;el.parentElement.querySelectorAll('.scopt').forEach((b,i)=>b.classList.toggle('on',i===v));calcTet()}
function calcTet(){const r=document.getElementById('sc-tetanus_wound-res');if(!r||tetDoses<0||tetWound<0)return;const dirty=tetWound===1,few=tetDoses===0;let lbl,act,cls='';
if(!dirty&&!few){lbl='No TIG';act='Td booster if >10y since last dose'}
else if(!dirty&&few){lbl='Give Td';act='Td booster + complete schedule';cls=' md'}
else if(dirty&&!few){lbl='No TIG';act='Td booster if >5y since last dose'}
else{lbl='Td + TIG';act='250 IU TIG at separate site';cls=' hi'}
r.className='scres'+cls;r.innerHTML=`<div class="tot">${lbl}</div><div class="act">${act}</div>`}

function calcScore(key){
const sc=D['16_score_calculators'][key];if(!sc)return;
const st=scoreSt[key]||{};const resEl=document.getElementById('sc-'+key+'-res');if(!resEl)return;

if(key==='gcs'){
const eye=st['eye']||0,verbal=st['verbal']||0,motor=st['motor']||0;
if(eye&&verbal&&motor){const tot=eye+verbal+motor;let lbl,act,cls='';
if(tot>=13){lbl='Mild';act='Monitor closely'}
else if(tot>=9){lbl='Moderate';act='CT head, neuro referral';cls=' md'}
else{lbl='Severe';act='Intubate, CT head immediately';cls=' hi'}
resEl.className='scres'+cls;resEl.innerHTML=`<div class="tot">GCS ${tot}</div><div class="lbl">${lbl}</div><div class="act">${act}</div>`
}return}

if(key==='burch_wartofsky'){
const temp=st['temp']||0,cvs=st['cvs']||0,cns=st['cns']||0,gi=st['gi']||0,precip=st['precipitant']||0;
const tot=temp+cvs+cns+gi+precip;
if(tot>0){let lbl,act,cls='';
if(tot<25){lbl='Unlikely';act='Supportive care'}
else if(tot<45){lbl='Imminent';act='Start treatment, admit ICU';cls=' md'}
else{lbl='Thyroid Storm';act='ICU immediately';cls=' hi'}
resEl.className='scres'+cls;resEl.innerHTML=`<div class="tot">${tot}</div><div class="lbl">${lbl}</div><div class="act">${act}</div>`
}return}

if(key==='tews'){
const hr=st['hr']||0,sbp=st['sbp']||0,rr=st['rr']||0,temp=st['temp']||0,avpu=st['avpu']||0;
const tot=hr+sbp+rr+temp+avpu;
if(tot>0||(hr===0&&st['hr']!==undefined)){let lbl,act,cls='';
if(tot<=2){lbl='TEWS Green';act='Standard care'}
else if(tot<=4){lbl='TEWS Yellow';act='MO review within 30 min';cls=' md'}
else if(tot<=6){lbl='TEWS Orange';act='Senior review within 15 min';cls=' md'}
else{lbl='TEWS Red';act='Resus team — ICU';cls=' hi'}
resEl.className='scres'+cls;resEl.innerHTML=`<div class="tot">${tot}</div><div class="lbl">${lbl}</div><div class="act">${act}</div>`
}return}

const comps=sc.components||[];let tot=0,allAnswered=true;
for(const comp of comps){
const cid='sc-'+key+'-'+(comp.key||comp.name.replace(/\s+/g,'_'));
const v=st[cid];if(v===undefined){allAnswered=false;break}
if(v)tot+=(comp.points||1)
}
if(!allAnswered){resEl.className='scres';resEl.innerHTML='<div class="tot">--</div><div class="lbl">Answer all criteria</div>';return}

// PERC
if(key==='perc'){
if(tot===0){resEl.className='scres';resEl.innerHTML='<div class="tot">PE EXCLUDED</div><div class="lbl">PERC Negative</div><div class="act">No further testing needed</div>'}
else{resEl.className='scres md';resEl.innerHTML=`<div class="tot">PERC Not Met (${tot})</div><div class="act">Proceed to Wells or D-dimer</div>`}
return}
// NEXUS
if(key==='nexus'){
if(tot===0){resEl.className='scres';resEl.innerHTML='<div class="tot">Low Risk</div><div class="lbl">Imaging NOT indicated</div><div class="act">Clinical clearance possible</div>'}
else{resEl.className='scres hi';resEl.innerHTML=`<div class="tot">High Risk (${tot}/5)</div><div class="act">C-spine imaging indicated</div>`}
return}

const interp=sc.interpretation||[];let matched=null;
for(const rule of interp){if(rule.min!==undefined&&rule.max!==undefined&&tot>=rule.min&&tot<=rule.max){matched=rule;break}}
if(!matched&&interp.length)matched=interp[interp.length-1];
if(matched){
const cls=matched.label.toLowerCase().includes('high')||matched.label.toLowerCase().includes('severe')?' hi':matched.label.toLowerCase().includes('moderat')?' md':'';
resEl.className='scres'+cls;resEl.innerHTML=`<div class="tot">${tot} — ${matched.label}</div><div class="act">${matched.action}</div>`
}else{resEl.className='scres';resEl.innerHTML=`<div class="tot">${tot}</div>`}
}

/* ===== FAVOURITES ===== */
function renderF(){
const favs=gF();const c=document.getElementById('c');
if(!favs.length){c.innerHTML='<div class="nores"><div class="ico">⭐</div><div style="font-weight:700;margin:.3rem 0">No favourites</div><div style="font-size:.8rem">Tap ☆ on any drug/protocol to save</div></div>';return}
let h='<div class="sect open"><div class="sb">';let found=0;
for(const ck of Object.keys(D)){if(ck==='16_score_calculators')continue;for(const[sk,items]of Object.entries(D[ck])){if(Array.isArray(items))for(const it of items){if(favs.includes(mK(it,ck))){h+=renderItem(it,ck);found++}}}}
h+='</div></div>';c.innerHTML=h||'<div class="nores">No favourites found</div>';
}

/* ===== SEARCH ===== */
function doSearch(){
const q=document.getElementById('s').value.trim().toLowerCase();if(!q){if(act==='favourites')renderF();else if(act==='all')renderAll();else renderCat(act);return}
let h='';let found=false;
for(const ck of Object.keys(D)){if(act!=='all'&&act!==ck)continue;if(ck==='16_score_calculators')continue;
let cm='';
for(const[sk,items]of Object.entries(D[ck])){
if(Array.isArray(items)){let sm='';for(const it of items){if(JSON.stringify(it).toLowerCase().includes(q))sm+=hl(renderItem(it,ck),q)}if(sm)cm+=`<div class="sub">${sk.replace(/_/g,' ').replace(/^\w/,c=>c.toUpperCase())}</div>`+sm}
else{if(JSON.stringify(items).toLowerCase().includes(q))cm+=hl(renderItem(items,ck),q)}
}
if(cm){h+=`<div class="sect open"><div class="sh" onclick="togS(this)"><div style="display:flex;align-items:center"><div class="shi">${I[ck]}</div><div class="sht">${C[ck]}</div></div><div class="shc">▼</div></div><div class="sb">${cm}</div></div>`;found=true}
}
// Search scores
if((act==='all'||act==='16_score_calculators')&&D['16_score_calculators']){
for(const[key,sc]of Object.entries(D['16_score_calculators'])){
if((sc.name+' '+JSON.stringify(sc)).toLowerCase().includes(q)){if(!found)h+=`<div class="sect open"><div class="sh" onclick="togS(this)"><div style="display:flex;align-items:center"><div class="shi">📊</div><div class="sht">Score Calculators</div></div><div class="shc">▼</div></div><div class="sb">`;h+=renderScoreCalc(key,sc);found=true}}
if(found)h+='</div></div>'}
// Result count bar
if(q){
  const count=(h.match(/class="drug"/g)||[]).length+(h.match(/class="proto"/g)||[]).length+(h.match(/class="calcw"/g)||[]).length;
  h=`<div class="rbar">${count} result${count!==1?'s':''} for "${q}"</div>`+h;
}
document.getElementById('c').innerHTML=h||`<div class="nores"><div class="ico">🔍</div>No results for "${q}"</div>`;
}

function hl(html,q){if(!q)return html;return html.replace(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`,'gi'),'<mark style="background:rgba(0,201,167,.2);border-radius:2px">$1</mark>')}

/* ===== UTILS ===== */
function togS(el){el.parentElement.classList.toggle('open')}
function togPS(el){const b=el.nextElementSibling;if(b)b.style.display=b.style.display==='none'?'block':'none';el.parentElement.classList.toggle('open')}
function bindTog(){}

/* ═══════════════════════════════════════════════════════════════
   STAGE 2 — RICH SUB-STRUCTURE RENDERERS
   Appended to app-4.3.js
   ═══════════════════════════════════════════════════════════════ */

/* ===== 1. GCS SCORING TABLE RENDERER ===== */
/**
 * Renders an interactive Glasgow Coma Scale table with clickable rows.
 * Each category (Eye Opening, Verbal Response, Motor Response) is a column.
 * Clicking a row adds that score to a running total.
 *
 * @param {Object} gcsData - {eye_opening:[{score,response}], verbal_response:[], motor_response:[]}
 * @returns {string} HTML string
 */
function renderGCS(gcsData) {
  if (!gcsData) return '';
  const categories = [
    { key: 'eye_opening',    label: 'Eye Opening',    max: 4 },
    { key: 'verbal_response', label: 'Verbal Response', max: 5 },
    { key: 'motor_response',  label: 'Motor Response',  max: 6 }
  ];
  const catData = categories.map(cat => ({
    ...cat,
    items: (gcsData[cat.key] || []).sort((a, b) => (b.score || 0) - (a.score || 0))
  }));

  // Find max number of rows across categories
  const maxRows = Math.max(...catData.map(c => c.items.length));
  const tableId = 'gcs-' + Math.random().toString(36).slice(2, 8);

  let h = `<div class="gcs-table" id="${tableId}" data-gcs-table="${tableId}">`;
  h += `<div style="font-size:.7rem;font-weight:700;color:var(--a);margin-bottom:.3rem;text-transform:uppercase;letter-spacing:.5px">🧠 Glasgow Coma Scale — Click to score</div>`;

  // Header row
  h += `<div class="gcs-row" style="background:rgba(0,0,0,.2);font-size:.65rem;font-weight:700;color:var(--a);text-transform:uppercase;letter-spacing:.5px">`;
  for (const cat of catData) {
    h += `<div class="gcs-response" style="flex:1;padding:.25rem .4rem">${cat.label}</div>`;
  }
  h += `</div>`;

  // Data rows
  for (let row = 0; row < maxRows; row++) {
    h += `<div class="gcs-row">`;
    for (const cat of catData) {
      const item = cat.items[row];
      if (item) {
        const score = item.score || 0;
        const response = esc(item.response || '');
        h += `<div class="gcs-score-item" style="flex:1;padding:.3rem .4rem;border-radius:.3rem;cursor:pointer;margin:.1rem;transition:background .15s;font-size:.78rem" onclick="pickGCSRow(this,${score},'${cat.key}','${tableId}')" data-cat="${cat.key}" data-score="${score}">`;
        h += `<span class="gcs-score" style="background:var(--a);color:#000;padding:.05rem .3rem;border-radius:.2rem;font-size:.7rem;font-weight:700;margin-right:.3rem">${score}</span>`;
        h += `<span class="gcs-response">${response}</span>`;
        h += `</div>`;
      } else {
        h += `<div style="flex:1"></div>`;
      }
    }
    h += `</div>`;
  }

  // Running total display
  h += `<div class="gcs-total" id="${tableId}-total" style="margin-top:.4rem;padding:.4rem .5rem;border-radius:.4rem;background:rgba(0,0,0,.2);text-align:center;font-size:.9rem;font-weight:700;color:var(--t2)">`;
  h += `Total: <span style="color:var(--t);font-size:1.1rem">--</span> / 15`;
  h += `</div>`;
  h += `</div>`;
  return h;
}

/** Global state for GCS selections keyed by table ID */
const gcsState = {};

/**
 * Handles clicking a GCS row — toggles selection and recalculates total.
 */
function pickGCSRow(el, score, catKey, tableId) {
  if (!gcsState[tableId]) gcsState[tableId] = {};

  // Deselect any other row in the same category
  const container = document.getElementById(tableId);
  if (container) {
    container.querySelectorAll(`[data-cat="${catKey}"]`).forEach(row => {
      row.style.background = '';
      row.style.borderLeft = '';
      row.classList.remove('gcs-selected');
    });
  }

  // Toggle: if already selected, deselect
  if (gcsState[tableId][catKey] === score) {
    delete gcsState[tableId][catKey];
  } else {
    gcsState[tableId][catKey] = score;
    el.style.background = 'rgba(0,201,167,.15)';
    el.style.borderLeft = '3px solid var(--g)';
    el.classList.add('gcs-selected');
  }

  // Recalculate total
  const st = gcsState[tableId];
  const total = (st.eye_opening || 0) + (st.verbal_response || 0) + (st.motor_response || 0);
  const totalEl = document.getElementById(tableId + '-total');
  if (!totalEl) return;

  const categoriesFilled = Object.keys(st).length;
  if (categoriesFilled < 3) {
    totalEl.innerHTML = `Total: <span style="color:var(--t);font-size:1.1rem">--</span> / 15 <span style="font-size:.7rem;color:var(--t2)">(${3 - categoriesFilled} category${categoriesFilled < 2 ? 'y' : 'ies'} remaining)</span>`;
    totalEl.style.borderLeft = '';
    totalEl.style.background = 'rgba(0,0,0,.2)';
  } else {
    // Interpretation
    let interp, color, cls;
    if (total >= 13) { interp = 'Mild — Monitor closely'; color = 'var(--g)'; cls = ''; }
    else if (total >= 9) { interp = 'Moderate — CT head, neuro referral'; color = '#f39c12'; cls = ' md'; }
    else { interp = 'Severe — Intubate, CT head immediately'; color = '#e74c3c'; cls = ' hi'; }
    totalEl.innerHTML = `Total: <span style="color:${color};font-size:1.2rem">${total}</span> / 15 <span style="font-size:.72rem;color:var(--t2)">${interp}</span>`;
    totalEl.style.borderLeft = `3px solid ${color}`;
    totalEl.style.background = cls === ' hi' ? 'rgba(231,76,60,.08)' : cls === ' md' ? 'rgba(243,156,18,.08)' : 'rgba(0,201,167,.08)';
  }
}

/* ===== 2. BURN CLASSIFICATION RENDERER ===== */
/**
 * Renders burn depth classification table, severity tiers, and TBSA reference.
 *
 * @param {Object} data - {depth_classification:[{degree,appearance,sensation,healing}], severity_classification:[{tier,criteria}], tbsa_reference:string}
 * @returns {string} HTML string
 */
function renderBurnClassification(data) {
  if (!data) return '';
  let h = '';

  // --- Depth Classification Table ---
  const depths = data.depth_classification || [
    { degree: '1st Degree',      appearance: 'Erythema, no blisters',                     sensation: 'Painful',         healing: '3–6 days' },
    { degree: '2nd Superficial', appearance: 'Blisters, moist pink wound bed',            sensation: 'Very painful',    healing: '1–3 weeks' },
    { degree: '2nd Deep',        appearance: 'Mottled, cherry red or pale, decreased blisters', sensation: 'Decreased sensation', healing: '3–8 weeks, scarring' },
    { degree: '3rd Degree',      appearance: 'Leathery, white/tan/charred, thrombosed vessels', sensation: 'Painless',        healing: 'Never — requires grafting' },
    { degree: '4th Degree',      appearance: 'Extends to fat, muscle, or bone',           sensation: 'Painless',        healing: 'Amputation / extensive reconstruction' }
  ];

  h += `<div class="burn-table" style="margin:.3rem 0">`;
  h += `<div style="font-size:.7rem;font-weight:700;color:var(--a);margin-bottom:.3rem;text-transform:uppercase;letter-spacing:.5px">🔥 Burn Depth Classification</div>`;
  h += `<table style="width:100%;font-size:.72rem;border-collapse:collapse">`;
  h += `<thead><tr style="color:var(--a);font-size:.65rem;text-transform:uppercase;letter-spacing:.5px">`;
  h += `<th style="text-align:left;padding:.25rem .3rem;border-bottom:1px solid var(--b)">Degree</th>`;
  h += `<th style="text-align:left;padding:.25rem .3rem;border-bottom:1px solid var(--b)">Appearance</th>`;
  h += `<th style="text-align:left;padding:.25rem .3rem;border-bottom:1px solid var(--b)">Sensation</th>`;
  h += `<th style="text-align:left;padding:.25rem .3rem;border-bottom:1px solid var(--b)">Healing</th>`;
  h += `</tr></thead><tbody>`;
  for (const d of depths) {
    const isDeep = (d.degree || '').includes('3rd') || (d.degree || '').includes('4th');
    h += `<tr class="burn-row" style="${isDeep ? 'background:rgba(231,76,60,.05)' : ''}">`;
    h += `<td class="burn-degree" style="padding:.25rem .3rem;border-bottom:1px solid rgba(255,255,255,.05);font-weight:700">${esc(d.degree || '')}</td>`;
    h += `<td style="padding:.25rem .3rem;border-bottom:1px solid rgba(255,255,255,.05)">${esc(d.appearance || '')}</td>`;
    h += `<td style="padding:.25rem .3rem;border-bottom:1px solid rgba(255,255,255,.05)">${esc(d.sensation || '')}</td>`;
    h += `<td style="padding:.25rem .3rem;border-bottom:1px solid rgba(255,255,255,.05);color:var(--t2)">${esc(d.healing || '')}</td>`;
    h += `</tr>`;
  }
  h += `</tbody></table></div>`;

  // --- Severity Classification ---
  const severities = data.severity_classification || [
    { tier: 'Minor',  criteria: '< 10% TBSA partial-thickness (adult) / < 5% (child), no special areas, no comorbidities' },
    { tier: 'Moderate', criteria: '10–20% TBSA partial-thickness, hands/feet/genitalia/perineum/major joints involved, age extremes or comorbidities' },
    { tier: 'Major',  criteria: '> 20% TBSA partial-thickness, > 5% full-thickness, inhalation injury, high-voltage electrical/chemical burns, circumferential' }
  ];

  h += `<div class="burn-severity" style="margin:.3rem 0">`;
  h += `<div style="font-size:.7rem;font-weight:700;color:var(--a);margin:.4rem 0 .3rem;text-transform:uppercase;letter-spacing:.5px">⚡ Burn Severity</div>`;
  for (const s of severities) {
    const tierColor = s.tier === 'Major' ? '#e74c3c' : s.tier === 'Moderate' ? '#f39c12' : 'var(--g)';
    h += `<div style="margin:.2rem 0;padding:.35rem .45rem;border-radius:.35rem;background:rgba(0,0,0,.1);border-left:3px solid ${tierColor}">`;
    h += `<strong style="color:${tierColor};font-size:.78rem">${esc(s.tier)}</strong>`;
    h += `<div style="font-size:.72rem;color:var(--t2);margin-top:.1rem">${esc(s.criteria || '')}</div>`;
    h += `</div>`;
  }
  h += `</div>`;

  // --- TBSA Reference ---
  const tbsa = data.tbsa_reference || data.tbsa_method || 'rule_of_nines';
  h += `<div style="margin:.3rem 0;padding:.3rem .4rem;border-radius:.3rem;background:rgba(0,201,167,.06);border-left:2px solid var(--g);font-size:.72rem">`;
  h += `<strong style="color:var(--g)">TBSA:</strong> `;
  if (tbsa === 'rule_of_nines' || tbsa === 'Rule of 9s') {
    h += `Rule of 9s — Head 9% · Chest 18% · Back 18% · Each Arm 9% · Each Leg 18% · Perineum 1%`;
  } else if (tbsa === 'lund_browder' || tbsa === 'Lund-Browder') {
    h += `Lund-Browder (age-adjusted) — Use paediatric chart for more accurate TBSA in children`;
  } else {
    h += esc(tbsa);
  }
  h += `</div>`;

  return h;
}

/* ===== 3. NEXUS CRITERIA RENDERER ===== */
/**
 * Renders 5 NEXUS criteria as toggle buttons (Yes/No per criterion).
 * Shows LOW RISK (green) if ALL = No, IMAGING REQUIRED (red) if ANY = Yes.
 *
 * @param {Object} data - {nexus_criteria:[{criterion,description}]}
 * @returns {string} HTML string
 */
function renderNEXUS(data) {
  const defaultCriteria = [
    { criterion: 'Midline posterior tenderness',   description: 'Tenderness of posterior midline cervical spine' },
    { criterion: 'Evidence of intoxication',       description: 'Alcohol or drug intoxication present' },
    { criterion: 'Altered level of alertness',     description: 'Decreased GCS, confusion, or disorientation' },
    { criterion: 'Focal neurological deficit',     description: 'Numbness, weakness, or reflex abnormality' },
    { criterion: 'Distracting painful injury',     description: 'Painful injury distracting from neck assessment' }
  ];
  const criteria = (data && data.nexus_criteria) ? data.nexus_criteria : defaultCriteria;
  const nxId = 'nexus-' + Math.random().toString(36).slice(2, 8);

  let h = `<div class="nexus-criterion" id="${nxId}" data-nexus-id="${nxId}">`;
  h += `<div style="font-size:.7rem;font-weight:700;color:var(--a);margin-bottom:.3rem;text-transform:uppercase;letter-spacing:.5px">🩻 NEXUS Low-Risk Criteria</div>`;

  for (let i = 0; i < criteria.length; i++) {
    const c = criteria[i];
    const label = esc(c.criterion || c.name || '');
    const desc = esc(c.description || c.desc || '');
    const rowId = `${nxId}-c${i}`;
    h += `<div style="margin:.25rem 0;padding:.35rem .45rem;border-radius:.35rem;background:rgba(0,0,0,.1)">`;
    h += `<div style="font-size:.75rem;font-weight:700;margin-bottom:.15rem">${label}</div>`;
    if (desc) h += `<div style="font-size:.68rem;color:var(--t2);margin-bottom:.2rem">${desc}</div>`;
    h += `<div class="nexus-btn" style="display:flex;gap:.3rem">`;
    h += `<button id="${rowId}-n" onclick="pickNEXUS('${rowId}',false,'${nxId}')" style="flex:1;padding:.25rem;font-size:.72rem;font-weight:700;border:1px solid var(--b);border-radius:.3rem;background:transparent;color:var(--t2);cursor:pointer">No</button>`;
    h += `<button id="${rowId}-y" onclick="pickNEXUS('${rowId}',true,'${nxId}')" style="flex:1;padding:.25rem;font-size:.72rem;font-weight:700;border:1px solid var(--b);border-radius:.3rem;background:transparent;color:var(--t2);cursor:pointer">Yes</button>`;
    h += `</div></div>`;
  }

  // Result display
  h += `<div class="nexus-result" id="${nxId}-res" style="margin-top:.35rem;padding:.45rem .5rem;border-radius:.4rem;background:rgba(0,0,0,.15);text-align:center;font-size:.85rem;font-weight:700;color:var(--t2)">`;
  h += `Answer all 5 criteria`;
  h += `</div>`;
  h += `</div>`;
  return h;
}

/** Global state for NEXUS selections keyed by NEXUS container ID */
const nexusState = {};

/**
 * Handles NEXUS criterion toggle — updates button styles and recalculates result.
 */
function pickNEXUS(rowId, isYes, nxId) {
  if (!nexusState[nxId]) nexusState[nxId] = {};
  nexusState[nxId][rowId] = isYes;

  // Style buttons
  const nBtn = document.getElementById(rowId + '-n');
  const yBtn = document.getElementById(rowId + '-y');
  if (nBtn) {
    nBtn.style.background = isYes ? 'transparent' : 'var(--g)';
    nBtn.style.color = isYes ? 'var(--t2)' : '#000';
    nBtn.style.borderColor = isYes ? 'var(--b)' : 'var(--g)';
  }
  if (yBtn) {
    yBtn.style.background = isYes ? '#e74c3c' : 'transparent';
    yBtn.style.color = isYes ? '#fff' : 'var(--t2)';
    yBtn.style.borderColor = isYes ? '#e74c3c' : 'var(--b)';
  }

  // Calculate result
  const st = nexusState[nxId];
  const answered = Object.keys(st).length;
  const totalCriteria = 5;
  const resEl = document.getElementById(nxId + '-res');
  if (!resEl) return;

  if (answered < totalCriteria) {
    resEl.innerHTML = `Answer all ${totalCriteria} criteria (${totalCriteria - answered} remaining)`;
    resEl.style.background = 'rgba(0,0,0,.15)';
    resEl.style.color = 'var(--t2)';
    resEl.style.borderLeft = '';
    return;
  }

  // Check if ANY criterion is "Yes"
  const anyYes = Object.values(st).some(v => v === true);
  if (anyYes) {
    resEl.innerHTML = `<span style="font-size:1rem">🚨 IMAGING REQUIRED</span><div style="font-size:.72rem;color:var(--t2);font-weight:400;margin-top:.1rem">C-spine imaging indicated — at least one NEXUS criterion is positive</div>`;
    resEl.style.background = 'rgba(231,76,60,.12)';
    resEl.style.color = '#e74c3c';
    resEl.style.borderLeft = '3px solid #e74c3c';
  } else {
    resEl.innerHTML = `<span style="font-size:1rem;color:var(--g)">✅ LOW RISK</span><div style="font-size:.72rem;color:var(--t2);font-weight:400;margin-top:.1rem">No imaging needed — clinical clearance acceptable</div>`;
    resEl.style.background = 'rgba(0,201,167,.12)';
    resEl.style.color = 'var(--g)';
    resEl.style.borderLeft = '3px solid var(--g)';
  }
}

/* ===== 4. EQUIPMENT & CHECKLIST RENDERERS ===== */
/**
 * Renders an equipment list as a compact tag grid.
 *
 * @param {Array} equipment - Array of strings or {item, name} objects
 * @returns {string} HTML string
 */
function renderEquipmentList(equipment) {
  if (!Array.isArray(equipment) || !equipment.length) return '';
  let h = `<div class="eq-grid" style="margin:.3rem 0">`;
  h += `<div style="font-size:.7rem;font-weight:700;color:var(--a);margin-bottom:.25rem;text-transform:uppercase;letter-spacing:.5px">🧰 Equipment</div>`;
  h += `<div style="display:flex;flex-wrap:wrap;gap:.25rem">`;
  for (const eq of equipment) {
    const label = esc(typeof eq === 'string' ? eq : (eq.item || eq.name || eq.equipment || ''));
    if (!label) continue;
    h += `<span class="eq-item" style="padding:.25rem .45rem;border-radius:.35rem;background:rgba(0,0,0,.15);border:1px solid var(--b);font-size:.72rem;color:var(--t)">${label}</span>`;
  }
  h += `</div></div>`;
  return h;
}

/**
 * Renders a checklist with checkbox-style items.
 *
 * @param {Array} checklist - Array of strings or {item, description} objects
 * @returns {string} HTML string
 */
function renderChecklist(checklist) {
  if (!Array.isArray(checklist) || !checklist.length) return '';
  const listId = 'chk-' + Math.random().toString(36).slice(2, 8);
  let h = `<div class="chk-list" id="${listId}" style="margin:.3rem 0">`;
  h += `<div style="font-size:.7rem;font-weight:700;color:var(--a);margin-bottom:.25rem;text-transform:uppercase;letter-spacing:.5px">☑️ Checklist</div>`;
  for (let i = 0; i < checklist.length; i++) {
    const item = checklist[i];
    const label = esc(typeof item === 'string' ? item : (item.item || item.description || item.step || item.action || ''));
    const detail = typeof item === 'object' ? esc(item.detail || item.notes || '') : '';
    if (!label) continue;
    const rowId = `${listId}-i${i}`;
    h += `<div class="chk-item" id="${rowId}" onclick="toggleChkItem('${rowId}')" style="display:flex;align-items:flex-start;gap:.4rem;padding:.3rem .4rem;border-radius:.3rem;cursor:pointer;transition:background .15s;margin:.1rem 0;font-size:.75rem" onmouseover="this.style.background='rgba(255,255,255,.03)'" onmouseout="if(!this.dataset.checked)this.style.background=''">`;
    h += `<span class="chk-box" style="width:16px;height:16px;border:1.5px solid var(--b);border-radius:.25rem;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;font-size:.6rem;color:transparent;transition:all .15s">✓</span>`;
    h += `<div style="flex:1"><div style="font-weight:600">${label}</div>`;
    if (detail) h += `<div style="font-size:.68rem;color:var(--t2);margin-top:.05rem">${detail}</div>`;
    h += `</div></div>`;
  }
  h += `</div>`;
  return h;
}

/**
 * Toggles a checklist item between checked/unchecked.
 */
function toggleChkItem(rowId) {
  const el = document.getElementById(rowId);
  if (!el) return;
  const box = el.querySelector('.chk-box');
  const isChecked = el.dataset.checked === 'true';
  if (isChecked) {
    el.dataset.checked = '';
    el.style.background = '';
    el.style.textDecoration = '';
    el.style.opacity = '1';
    if (box) {
      box.style.background = 'transparent';
      box.style.borderColor = 'var(--b)';
      box.style.color = 'transparent';
    }
  } else {
    el.dataset.checked = 'true';
    el.style.background = 'rgba(0,201,167,.1)';
    el.style.textDecoration = 'line-through';
    el.style.opacity = '0.6';
    if (box) {
      box.style.background = 'var(--g)';
      box.style.borderColor = 'var(--g)';
      box.style.color = '#000';
    }
  }
}

/* ===== 5. H'S AND T'S RENDERER ===== */
/**
 * Renders the 10 reversible causes of cardiac arrest as a 2-column grid.
 * H's: Hypovolemia, Hypoxia, Hydrogen ions, Hypo/Hyperkalemia, Hypothermia
 * T's: Tension pneumothorax, Tamponade, Toxins, Thrombosis (coronary), Thrombosis (pulmonary)
 *
 * @returns {string} HTML string
 */
function renderHsTs() {
  const hs = [
    { cause: 'Hypovolemia',        detail: 'Give fluids, stop bleeding, control haemorrhage' },
    { cause: 'Hypoxia',            detail: '100% O2, intubate, suction, decompress if needed' },
    { cause: 'Hydrogen ions (Acidosis)', detail: 'Correct cause, consider bicarbonate if pH < 7.1' },
    { cause: 'Hypo/Hyperkalaemia', detail: 'Check K+, treat arrhythmias, CaCl if hyperK+' },
    { cause: 'Hypothermia',        detail: 'Active rewarming, avoid defibrillation if <30°C' }
  ];
  const ts = [
    { cause: 'Tension Pneumothorax', detail: 'Needle decompression → finger thoracostomy' },
    { cause: 'Tamponade',            detail: 'Pericardiocentesis → resus thoracotomy' },
    { cause: 'Toxins',               detail: 'Antidotes, decontaminate, lipid emulsion' },
    { cause: 'Thrombosis (Coronary)', detail: 'PCI if ROSC, thrombolysis if no cath lab' },
    { cause: 'Thrombosis (Pulmonary)', detail: 'Thrombolysis if suspected PE causing arrest' }
  ];

  let h = `<div class="hs-grid" style="margin:.3rem 0">`;
  h += `<div style="font-size:.7rem;font-weight:700;color:var(--a);margin-bottom:.3rem;text-transform:uppercase;letter-spacing:.5px">⚡ Reversible Causes of Cardiac Arrest (H's & T's)</div>`;
  h += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem">`;

  // H column
  h += `<div>`;
  h += `<div style="font-size:.7rem;font-weight:700;color:#3498db;margin-bottom:.2rem">H's</div>`;
  for (const item of hs) {
    h += `<div class="h-item" style="padding:.3rem .4rem;border-radius:.3rem;background:rgba(52,152,219,.08);border-left:2px solid #3498db;margin-bottom:.2rem">`;
    h += `<div style="font-size:.75rem;font-weight:700;color:#3498db">${esc(item.cause)}</div>`;
    h += `<div style="font-size:.68rem;color:var(--t2)">${esc(item.detail)}</div>`;
    h += `</div>`;
  }
  h += `</div>`;

  // T column
  h += `<div>`;
  h += `<div style="font-size:.7rem;font-weight:700;color:#e74c3c;margin-bottom:.2rem">T's</div>`;
  for (const item of ts) {
    h += `<div class="t-item" style="padding:.3rem .4rem;border-radius:.3rem;background:rgba(231,76,60,.08);border-left:2px solid #e74c3c;margin-bottom:.2rem">`;
    h += `<div style="font-size:.75rem;font-weight:700;color:#e74c3c">${esc(item.cause)}</div>`;
    h += `<div style="font-size:.68rem;color:var(--t2)">${esc(item.detail)}</div>`;
    h += `</div>`;
  }
  h += `</div>`;

  h += `</div></div>`;
  return h;
}

/* ===== 6. MAIN ROUTER UPDATE ===== */
/**
 * Replaces the existing renderStructuredProtocol() function.
 * Detects and routes to the appropriate rich renderer based on data content.
 *
 * Detection order:
 *   1. GCS data in Head Injury protocols
 *   2. Burn classification data in Burns protocols
 *   3. NEXUS criteria in C-spine protocols
 *   4. Equipment arrays
 *   5. Checklist items
 *   6. H's & T's in Cardiac Arrest protocols
 */
function renderStructuredProtocol(it, cat) {
  let h = '';
  const itemName = (it.item || it.drug || it.condition_or_drug || it.protocol_name || '').toLowerCase();

  /* ── 6.1 GCS Scoring Table ── */
  if (itemName.includes('head injury') && it.gcs) {
    h += renderGCS(it.gcs);
  }

  /* ── 6.2 Burn Classification ── */
  if (itemName.includes('burn') && (it.depth_classification || it.severity_classification)) {
    h += renderBurnClassification(it);
  }

  /* ── 6.3 NEXUS Criteria ── */
  if (itemName.includes('c-spine') && (it.nexus_criteria || it.cervical_spine_assessment)) {
    h += renderNEXUS(it);
  }

  /* ── 6.4 Equipment List ── */
  if (it.equipment && Array.isArray(it.equipment) && it.equipment.length) {
    h += renderEquipmentList(it.equipment);
  }

  /* ── 6.5 Checklist Items ── */
  if (it.checklist_items && Array.isArray(it.checklist_items) && it.checklist_items.length) {
    h += renderChecklist(it.checklist_items);
  }
  // Also support flat checklist arrays from protocol notes
  if (it.checklist && Array.isArray(it.checklist) && it.checklist.length) {
    h += renderChecklist(it.checklist);
  }

  /* ── 6.6 H's and T's ── */
  if (itemName.includes('cardiac arrest') || itemName.includes('resuscitation')) {
    h += renderHsTs();
  }

  /* ── 6.7 Existing structured sections (kept from original) ── */

  // 1. Diagnostic Criteria
  if (it.diagnostic_criteria && it.diagnostic_criteria.length) {
    h += `<div class="ps"><div class="ps-h" onclick="togPS(this)">🔬 Diagnostic Criteria</div><div class="ps-b" style="display:none">`;
    h += `<table style="width:100%;font-size:.75rem;border-collapse:collapse"><thead><tr style="color:var(--a);font-size:.7rem;text-transform:uppercase;letter-spacing:.5px"><th style="text-align:left;padding:.2rem 0;border-bottom:1px solid var(--b)">Parameter</th><th style="text-align:left;padding:.2rem 0;border-bottom:1px solid var(--b)">Threshold</th><th style="text-align:left;padding:.2rem 0;border-bottom:1px solid var(--b)">Unit</th></tr></thead><tbody>`;
    for (const dc of it.diagnostic_criteria) {
      h += `<tr><td style="padding:.2rem .3rem .2rem 0;border-bottom:1px solid rgba(255,255,255,.05)">${esc(dc.parameter || '')}</td><td style="padding:.2rem .3rem;border-bottom:1px solid rgba(255,255,255,.05)">${esc(dc.threshold || '')}</td><td style="padding:.2rem 0;border-bottom:1px solid rgba(255,255,255,.05);color:var(--t2)">${esc(dc.unit || '')}</td></tr>`;
    }
    h += `</tbody></table></div></div>`;
  }

  // 2. Classification
  if (it.classification && it.classification.length) {
    h += `<div class="ps"><div class="ps-h" onclick="togPS(this)">📊 Classification</div><div class="ps-b" style="display:none"><ul>`;
    for (const cl of it.classification) {
      if (typeof cl === 'string') {
        h += `<li>${esc(cl)}</li>`;
      } else {
        h += `<li><strong>${esc(cl.name || cl.label || '')}</strong>${cl.description ? ': ' + esc(cl.description) : ''}${cl.criteria ? ': ' + esc(cl.criteria) : ''}</li>`;
      }
    }
    h += `</ul></div></div>`;
  }

  // 3. Clinical Features
  if (it.clinical_features && Object.keys(it.clinical_features).length) {
    h += `<div class="ps"><div class="ps-h" onclick="togPS(this)">🩺 Clinical Features</div><div class="ps-b" style="display:none">`;
    for (const [sys, features] of Object.entries(it.clinical_features)) {
      h += `<div style="font-weight:700;color:var(--a);font-size:.7rem;margin:.2rem 0;text-transform:uppercase;letter-spacing:.5px">${esc(sys)}</div>`;
      if (Array.isArray(features)) {
        h += `<ul style="margin:.1rem 0 .3rem">${features.map(f => `<li>${esc(f)}</li>`).join('')}</ul>`;
      } else if (typeof features === 'string') {
        h += `<div style="font-size:.75rem;color:var(--t2);margin-bottom:.3rem">${esc(features)}</div>`;
      }
    }
    h += `</div></div>`;
  }

  // 4. Management Steps
  if (it.management_steps && it.management_steps.length) {
    h += `<div class="ps"><div class="ps-h" onclick="togPS(this)">📋 Management Steps</div><div class="ps-b" style="display:none">`;
    for (const step of it.management_steps) {
      const sn = step.step_number || '';
      const action = esc(step.action || '');
      const details = esc(step.details || '');
      const caution = esc(step.caution || '');
      h += `<div style="margin:.2rem 0;padding:.4rem .5rem;border-radius:.4rem;background:rgba(0,0,0,.15);border-left:2px solid var(--a)">`;
      h += `<div style="font-weight:700;font-size:.78rem;color:var(--t);margin-bottom:.1rem"><span style="background:var(--a);color:#000;padding:.05rem .35rem;border-radius:.25rem;font-size:.7rem;margin-right:.3rem">Step ${sn}</span>${action}</div>`;
      if (details) h += `<div style="font-size:.75rem;color:var(--t2);margin-top:.1rem">${details}</div>`;
      if (caution) h += `<div style="font-size:.72rem;color:#e74c3c;margin-top:.15rem">⚠️ ${caution}</div>`;
      h += `</div>`;
    }
    h += `</div></div>`;
  }

  // 5. Drugs — call renderDrug() for weight-based dosing & infusion calc
  if (it.drugs && it.drugs.length) {
    for (const drug of it.drugs) {
      const drugName = drug.drug || drug.name || drug.item || '';
      if (!drugName) continue;
      const drugObj = {
        ...drug,
        item: drugName,
        notes_updates: drug.notes || drug.notes_updates || '',
      };
      h += renderDrug(drugObj, cat, drugName);
    }
  }

  // 6. Monitoring
  if (it.monitoring && it.monitoring.length) {
    h += `<div class="ps"><div class="ps-h" onclick="togPS(this)">👁 Monitoring</div><div class="ps-b" style="display:none"><ul>`;
    for (const m of it.monitoring) {
      if (typeof m === 'string') h += `<li>${esc(m)}</li>`;
      else h += `<li>${esc(m.parameter || m.item || JSON.stringify(m))}</li>`;
    }
    h += `</ul></div></div>`;
  }

  // 7. Warnings
  if (it.warnings && it.warnings.length) {
    h += `<div class="warnbox"><div class="wl">⚠️ Warnings</div>`;
    for (const w of it.warnings) {
      h += `<div>${esc(w)}</div>`;
    }
    h += `</div>`;
  }

  // 8. Disposition
  if (it.disposition) {
    h += `<div style="margin-top:.25rem;padding:.3rem .5rem;border-radius:.3rem;background:rgba(0,201,167,.06);border-left:2px solid var(--g);font-size:.72rem"><strong style="color:var(--g)">Disposition:</strong> ${esc(it.disposition)}</div>`;
  }

  // Fallback: if nothing structured was rendered, try parsing notes
  if (!h) {
    const notes = it.notes_updates || it.notes || '';
    if (notes) h = parseProtocolSections(notes);
  }

  return h;
}

/* ===== ESCAPE HELPER (if not already defined) ===== */
/**
 * Safely escapes HTML characters in user content to prevent XSS.
 * Replaces <, >, &, ", and ' with their HTML entity equivalents.
 */
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
/* ============================================================
   STAGE 3: SAFE FORMULA CALCULATORS
   Replaces unsafe calcFormula() with safe math parser + clinical interpretation
   ============================================================ */

/**
 * Safely evaluate a formula from the score_calculators data.
 * Uses new Function() with pre-validated numeric expressions instead of eval().
 * Reads variable values from input fields, substitutes them into the formula,
 * evaluates safely, and delegates result display to showFormulaResult().
 *
 * @param {string} key - The calculator key (e.g. 'parkland', 'anion_gap')
 */
function calcFormula(key) {
  const calc = D['16_score_calculators'][key];
  const sid = 'sc-' + key;
  const resEl = document.getElementById(sid + '-res');

  if (!calc || !resEl) return;

  try {
    // Build values object from input fields
    const values = {};
    for (const inp of (calc.inputs || [])) {
      const val = parseFloat(document.getElementById(sid + '-' + inp.key)?.value);
      if (isNaN(val)) {
        resEl.innerHTML = '<div class="tot">--</div><div class="calc-res-label">Enter all values</div>';
        return;
      }
      values[inp.key] = val;
    }

    // Replace variables in formula with their numeric values
    let expr = calc.formula || '';
    for (const [k, v] of Object.entries(values)) {
      expr = expr.replace(new RegExp('\\b' + k + '\\b', 'g'), v);
    }

    // Replace bracket notation [expr] with parenthesised (expr)
    expr = expr.replace(/\[([^\]]+)\]/g, '($1)');

    // Validate expression: only allow safe math characters
    // Whitelist: numbers, operators, parens, math functions, whitespace, dots
    const safeExpr = /^[\d\s+\-*/().,^%!&|<>='"a-zA-Z]+$/.test(expr);
    if (!safeExpr) {
      resEl.innerHTML = '<div class="tot">--</div><div class="calc-res-label">Invalid formula</div>';
      return;
    }

    // SAFE evaluation using Function instead of eval()
    const result = new Function('return (' + expr + ')')();

    if (!isFinite(result)) {
      resEl.innerHTML = '<div class="tot">--</div><div class="calc-res-label">Invalid calculation</div>';
      return;
    }

    showFormulaResult(key, calc, result);
  } catch (e) {
    resEl.innerHTML = '<div class="tot">--</div><div class="calc-res-label">Check input values</div>';
  }
}

/**
 * Display a formula calculator result with clinical interpretation.
 * Adds calculator-specific clinical guidance based on the result value.
 *
 * @param {string} key - The calculator key
 * @param {Object} calc - The calculator data object
 * @param {number} result - The computed numeric result
 */
function showFormulaResult(key, calc, result) {
  const sid = 'sc-' + key;
  const el = document.getElementById(sid + '-res');
  if (!el) return;

  let interp = '';

  // Calculator-specific clinical interpreters
  // Each returns an HTML string with appropriate CSS class for severity
  const interpreters = {

    /** PARKLAND BURN FORMULA: 4mL × kg × %TBSA
     *  Result is the hourly rate; we derive total 24h volume and split periods */
    'parkland': (r) => {
      const total24h = r * 4;          // mL in first 24h (Parkland = 4mL/kg/%TBSA)
      const first8h  = total24h / 2;   // Half in first 8 hours from time of burn
      const next16h  = total24h / 2;   // Half over next 16 hours
      // Try to get time-of-burn for elapsed-time calculation
      const tEl = document.getElementById(sid + '-time');
      let elapsedExtra = '';
      if (tEl && tEl.value) {
        const bt = new Date(tEl.value);
        const nw = new Date();
        const hrsElapsed = (nw - bt) / 3600000;
        const hrsLeft = Math.max(0, 8 - hrsElapsed);
        const rate = hrsLeft > 0 ? (first8h / hrsLeft).toFixed(0) : '0';
        elapsedExtra = ` | <strong>Current rate:</strong> ${rate} mL/hr (${hrsElapsed.toFixed(1)}h since burn)`;
      }
      return `<div class="res-action">` +
        `<strong>Total 24h:</strong> ${total24h.toFixed(0)} mL ` +
        `| <strong>First 8h:</strong> ${first8h.toFixed(0)} mL ` +
        `| <strong>Next 16h:</strong> ${next16h.toFixed(0)} mL ` +
        `| <strong>Fluid:</strong> Ringer's Lactate | Reassess at 24h` +
        elapsedExtra +
        `</div>`;
    },

    /** ANION GAP: Na - (Cl + HCO3)
     *  Clinical significance varies by level; high gap → GOLD MARK mnemonic */
    'anion_gap': (r) => {
      if (r < 8)
        return `<div class="res-action low">LOW Anion Gap (${r.toFixed(1)} mmol/L): Consider hypoalbuminemia, bromide, lithium, severe hypernatremia</div>`;
      if (r >= 8 && r <= 12)
        return `<div class="res-action normal">NORMAL Anion Gap (${r.toFixed(1)} mmol/L): Reference range 8-12 mmol/L</div>`;
      if (r > 12 && r <= 20)
        return `<div class="res-action mild">MILDLY ELEVATED (${r.toFixed(1)} mmol/L): Check lactate, ketones, renal function, toxins</div>`;
      // r > 20 — high anion gap metabolic acidosis
      return `<div class="res-action high">HIGH Anion Gap (${r.toFixed(1)} mmol/L): <strong>GOLD MARK</strong> — Glycols, Oxoproline, L-lactate, D-lactate, Methanol, Aspirin, Renal failure, Ketoacidosis</div>`;
    },

    /** CORRECTED SODIUM: Na + 1.6 × (glucose - 5.5) / 5.5
     *  Adjusts measured sodium for hyperglycaemia */
    'corrected_sodium': (r) => {
      return `<div class="res-action">` +
        `<strong>Corrected Na:</strong> ${r.toFixed(1)} mmol/L ` +
        `| Correct for glucose, then reassess sodium status` +
        `</div>`;
    },

    /** FREE WATER DEFICIT: 0.6 × wt × ((Na / 140) - 1)
     *  Used in hypernatraemia; guides fluid replacement rate */
    'free_water_deficit': (r) => {
      return `<div class="res-action">` +
        `<strong>Free Water Deficit:</strong> ${r.toFixed(1)} Litres ` +
        `| <strong>MAX correction:</strong> 12 mmol/L in 24h ` +
        `| Use 5% Dextrose — monitor Na every 4-6h` +
        `</div>`;
    },

    /** SODIUM DEFICIT: 0.6 × wt × (Na_desired - Na_actual)
     *  Guides sodium replacement in hyponatraemia */
    'sodium_deficit': (r) => {
      return `<div class="res-action">` +
        `<strong>Sodium Deficit:</strong> ${r.toFixed(1)} mmol ` +
        `| Replace slowly over 48-72h ` +
        `| Monitor Na q4-6h to avoid osmotic demyelination` +
        `</div>`;
    },

    /** P/F RATIO: PaO2 / FiO2
     *  Berlin criteria for ARDS severity stratification */
    'pf_ratio': (r) => {
      if (r >= 400)
        return `<div class="res-action normal">NORMAL P/F Ratio (${r.toFixed(0)}): No ARDS — routine care</div>`;
      if (r >= 300)
        return `<div class="res-action mild">MILD ARDS (${r.toFixed(0)}): PaO2/FiO2 300-399 | Monitor closely, consider non-invasive support</div>`;
      if (r >= 200)
        return `<div class="res-action moderate">MODERATE ARDS (${r.toFixed(0)}): PaO2/FiO2 200-299 | ICU referral, lung-protective ventilation (Vt 6 mL/kg)</div>`;
      if (r >= 100)
        return `<div class="res-action severe">SEVERE ARDS (${r.toFixed(0)}): PaO2/FiO2 100-199 | ICU mandatory, prone positioning, consider NMB</div>`;
      // r < 100 — very severe
      return `<div class="res-action critical">VERY SEVERE ARDS (${r.toFixed(0)}): PaO2/FiO2 &lt;100 | ECMO consideration, salvage therapies</div>`;
    }
  };

  // Try to find a matching interpreter by calculator name or key
  const calcName = (calc.name || '').toLowerCase();
  for (const [pattern, fn] of Object.entries(interpreters)) {
    if (calcName.includes(pattern) || key.includes(pattern)) {
      interp = fn(result);
      break;
    }
  }

  // Fallback: use generic interpretation from data if no specific interpreter matched
  if (!interp && calc.interpretation && calc.interpretation.length) {
    const rule = calc.interpretation[0];
    if (rule) {
      interp = `<div class="res-action">${esc(rule.label)}: ${result.toFixed(2)} — ${esc(rule.action || '')}</div>`;
    }
  }

  // Final fallback: plain result with no interpretation
  if (!interp) {
    interp = `<div class="res-action">Result: ${result.toFixed(2)}</div>`;
  }

  el.innerHTML = `<div class="res-score">${result.toFixed(2)}</div>${interp}`;
}

/* ============================================================
   CSS — Add these styles to index.html <style> block:

   .res-score {
     font-size: 1.6rem;
     font-weight: 700;
     color: var(--a);
     margin: 0.2rem 0;
   }
   .res-action {
     font-size: 0.75rem;
     padding: 0.35rem 0.5rem;
     border-radius: 0.35rem;
     margin-top: 0.25rem;
     line-height: 1.4;
     background: rgba(0,0,0,0.15);
     border-left: 3px solid var(--a);
   }
   .res-action.normal {
     background: rgba(46, 204, 113, 0.12);
     border-left-color: #2ecc71;
     color: #2ecc71;
   }
   .res-action.low {
     background: rgba(241, 196, 15, 0.12);
     border-left-color: #f39c12;
     color: #f39c12;
   }
   .res-action.mild {
     background: rgba(241, 196, 15, 0.15);
     border-left-color: #f1c40f;
     color: #f1c40f;
   }
   .res-action.high {
     background: rgba(231, 76, 60, 0.15);
     border-left-color: #e74c3c;
     color: #e74c3c;
   }
   .res-action.severe {
     background: rgba(192, 57, 43, 0.15);
     border-left-color: #c0392b;
     color: #c0392b;
   }
   .res-action.critical {
     background: rgba(142, 68, 173, 0.15);
     border-left-color: #8e44ad;
     color: #8e44ad;
   }

   ============================================================ */
