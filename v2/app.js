"use strict";
// BiRAGAS Cancer Optimizer v2 — static, data-driven atlas.
const $=(s,r=document)=>r.querySelector(s); const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>(s||"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
let PATHS=[], BYCAT={};
const GROUPS=[["solid","Solid tumors"],["heme","Hematologic (non-solid)"],["pan","Pan-cancer"]];

function toast(m){const t=$("#toast");t.textContent=m;t.classList.remove("hidden");clearTimeout(t._h);t._h=setTimeout(()=>t.classList.add("hidden"),2600);}

async function init(){
  PATHS = await (await fetch("assets/pathways.json")).json();
  // group
  BYCAT={};
  PATHS.forEach(p=>{ (BYCAT[p.category]=BYCAT[p.category]||[]).push(p); });
  buildSidebar();
  buildPatterns();
  // hero fallback
  const hero=$("#heroFig"); hero.onerror=()=>{ const f=PATHS.find(p=>p.img); if(f) hero.src=f.img; };
  // default category
  const first = (BYCAT["Lung — NSCLC"] ? "Lung — NSCLC" : Object.keys(BYCAT).sort()[0]);
  selectCategory(first);
  $("#q").addEventListener("input", onSearch);
}

function groupOf(cat){ const any=BYCAT[cat][0]; return any.group; }

function buildSidebar(){
  const side=$("#side"); side.innerHTML="";
  const cats={}; PATHS.forEach(p=>{ cats[p.group]=cats[p.group]||{}; cats[p.group][p.category]=(cats[p.group][p.category]||0)+1; });
  GROUPS.forEach(([g,lbl])=>{
    if(!cats[g]) return;
    side.appendChild(Object.assign(document.createElement("div"),{className:"gt",textContent:lbl}));
    Object.keys(cats[g]).sort().forEach(c=>{
      const row=document.createElement("div"); row.className="cat"; row.dataset.cat=c;
      row.innerHTML=`<span>${esc(c)}</span><span class="n">${cats[g][c]}</span>`;
      row.onclick=()=>{ $("#q").value=""; selectCategory(c); };
      side.appendChild(row);
    });
  });
}

function figCard(p){
  const nct=String(p.nct||"").startsWith("NCT")?`<a href="https://clinicaltrials.gov/study/${p.nct}" target="_blank" rel="noopener">${esc(p.nct)}</a>`:"";
  const cite=esc(p.citation.replace(/,?\s*(NCT\d+.*)$/,""));
  const img = p.img
    ? `<div class="imgbx" data-full="${p.img}"><img loading="lazy" src="${p.img}" alt="${esc(p.drug)} mechanism"></div>`
    : `<div class="noimg">Illustration coming soon</div>`;
  const dl = p.img ? `<div class="dl">
      <button class="btn btn-teal btn-sm" data-png="${p.img}" data-name="${esc(slug(p))}">PNG</button>
      <a class="btn btn-ghost btn-sm" href="${p.img}" download="BiRAGAS_${esc(slug(p))}.jpg">JPEG</a>
    </div>` : "";
  return `<div class="fig">
    ${img}
    <div class="body">
      <div class="drug">${esc(p.drug)}</div>
      <div class="ct">${esc(p.cancer_type)}</div>
      <div class="mech"><b>Mechanism:</b> ${esc((p.resistance_mechanism||"").slice(0,150))}${(p.resistance_mechanism||"").length>150?"…":""}</div>
      <div class="cite">${cite} ${nct}</div>
      <div class="tags"><span class="tag pat">Pattern ${esc(p.biragas_pattern)}</span><span class="tag cls">${esc(p.resistance_class)}</span><span class="tag mod">${esc(p.modality)}</span></div>
      ${dl}
    </div></div>`;
}
function slug(p){ return (p.drug+"_"+p.cancer_type).replace(/[^A-Za-z0-9]+/g,"_").slice(0,48); }

function renderGrid(cat, list){
  const main=$("#main");
  main.innerHTML=`<div class="cat-title"><h3>${esc(cat)}</h3><span style="color:var(--slate)">${list.length} cited pathway${list.length!=1?"s":""}</span></div>
    <div class="grid">${list.map(figCard).join("")}</div>`;
  wire(main);
}
function selectCategory(cat){
  $$(".cat").forEach(r=>r.classList.toggle("on", r.dataset.cat===cat));
  renderGrid(cat, BYCAT[cat]||[]);
}
function onSearch(e){
  const q=e.target.value.trim().toLowerCase();
  if(!q){ const on=$(".cat.on"); selectCategory(on?on.dataset.cat:Object.keys(BYCAT).sort()[0]); return; }
  $$(".cat").forEach(r=>r.classList.remove("on"));
  const hit=PATHS.filter(p=>[p.drug,p.cancer_type,p.target_mechanism,p.resistance_mechanism,p.resistance_class,p.category,p.citation].join(" ").toLowerCase().includes(q));
  const main=$("#main");
  main.innerHTML=`<div class="cat-title"><h3>Search: “${esc(q)}”</h3><span style="color:var(--slate)">${hit.length} match${hit.length!=1?"es":""}</span></div>
    <div class="grid">${hit.map(figCard).join("")}</div>`;
  wire(main);
}
function wire(root){
  $$(".imgbx",root).forEach(b=>b.onclick=()=>lightbox(b.dataset.full, b.closest(".fig")));
  $$("[data-png]",root).forEach(btn=>btn.onclick=()=>downloadPNG(btn.dataset.png, "BiRAGAS_"+btn.dataset.name));
}

function downloadPNG(src,name){
  const img=new Image();
  img.onload=()=>{ const cv=document.createElement("canvas"); cv.width=img.naturalWidth; cv.height=img.naturalHeight;
    cv.getContext("2d").drawImage(img,0,0);
    cv.toBlob(b=>{ const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download=name+".png"; document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1500); toast("PNG downloaded."); },"image/png");
  };
  img.onerror=()=>toast("Could not load image."); img.src=src;
}

function lightbox(src, figEl){
  const drug=figEl?$(".drug",figEl).textContent:""; const ct=figEl?$(".ct",figEl).textContent:"";
  const name=src.split("/").pop().replace(".jpg","");
  const b=document.createElement("div"); b.className="lb";
  b.innerHTML=`<span class="x">×</span><div><img src="${src}"><div class="cap"><b>${esc(drug)}</b> — ${esc(ct)}</div>
     <div class="lbdl"><button class="btn btn-teal btn-sm" id="lbpng">Download PNG</button>
     <a class="btn btn-ghost btn-sm" href="${src}" download="BiRAGAS_${name}.jpg">Download JPEG</a></div></div>`;
  b.onclick=e=>{ if(e.target===b||e.target.className==="x") b.remove(); };
  document.body.append(b);
  $("#lbpng",b).onclick=()=>downloadPNG(src,"BiRAGAS_"+name);
}

const PATTERNS=[
 ["P1 · Correlate, not a causal driver","The target is associated with the disease but is not the node whose perturbation changes the outcome — blocking it moves a biomarker, not the disease.","Causal-driver identification separates the driver from the correlated noise, with an evidence trail — the false positive down-ranked before a $100M Phase 3.","var(--coral)"],
 ["P2 · Single-node blockade of a redundant pathway","The biology routes around a single blocked node through parallel / compensatory pathways — target engagement without efficacy.","In-silico perturbation across the causal network tests whether knocking out one node collapses the phenotype or the flux simply reroutes.","var(--teal)"],
 ["P3 · Unstratified / biomarker-diluted population","The drug works in a molecularly-defined subset, but an all-comers trial dilutes the signal below the endpoint threshold.","Patient stratification identifies the causal subgroup in whom the target is the driver — converting an efficacy failure into a smaller, winnable evaluation.","var(--sky)"],
 ["P4 · Mechanism-based toxicity / benefit-risk","Efficacy may be real, but an on-mechanism safety liability sinks the benefit-risk — sometimes only visible at Phase-3 scale.","Multi-evidence validation reasons about adverse-event biology in the target's neighbourhood, turning a late surprise into an earlier go / no-go.","var(--violet)"],
 ["P5 · Endpoint / placebo heterogeneity (PFS–OS discordance)","A surrogate improves but survival does not; mixed endophenotypes and a variable placebo response swamp a genuine effect.","Endophenotype stratification ties the endpoint to the active molecular driver, tightening both the population and the readout.","var(--green)"],
 ["P6 · Combination without a causal rationale","Two agents are combined on additive hope rather than predicted synergy — adding toxicity without adding efficacy.","Counterfactual combination design predicts where a second perturbation adds non-redundant leverage versus where it only stacks toxicity.","var(--gold-deep)"],
];
function buildPatterns(){
  $("#patterns").innerHTML=PATTERNS.map(([t,fail,fix,col])=>`
    <div class="pat-card" style="border-left-color:${col}">
      <h4>${esc(t)}</h4>
      <div class="fail">The failure: ${esc(fail)}</div>
      <div class="fix"><b>Where a causal framework helps:</b> ${esc(fix)}</div>
    </div>`).join("");
}

init().catch(e=>{ $("#main").innerHTML=`<p style="color:#c00">Failed to load atlas: ${esc(e.message)}</p>`; });
