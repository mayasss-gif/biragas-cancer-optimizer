"use strict";
// BiRAGAS Cancer Optimizer v2, static, data-driven atlas.
const $=(s,r=document)=>r.querySelector(s); const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>(s||"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
let PATHS=[], BYCAT={};
const GROUPS=[["solid","Solid tumors"],["heme","Hematologic (non-solid)"],["pan","Pan-cancer"]];

function toast(m){const t=$("#toast");t.textContent=m;t.classList.remove("hidden");clearTimeout(t._h);t._h=setTimeout(()=>t.classList.add("hidden"),2600);}

async function init(){
  PATHS = await (await fetch("assets/pathways.json?v=32")).json();
  // group
  BYCAT={};
  PATHS.forEach(p=>{ (BYCAT[p.category]=BYCAT[p.category]||[]).push(p); });
  buildSidebar();
  buildPatterns();
  buildTaxonomy();
  // hero fallback
  const hero=$("#heroFig"); hero.onerror=()=>{ const f=PATHS.find(p=>p.img); if(f) hero.src=f.img; };
  // default category
  const first = (BYCAT["Lung, NSCLC"] ? "Lung, NSCLC" : Object.keys(BYCAT).sort()[0]);
  selectCategory(first);
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
      row.onclick=()=>{ selectCategory(c); scrollToFigures(); };
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
  const gen = `<a class="btn btn-gold btn-sm" href="https://biragasillustrator.ai" target="_blank" rel="noopener" title="Create or regenerate this figure on the live BiRAGAS Illustrator engine">Generate ↗</a>`;
  const dl = `<div class="dl">
      ${p.img ? `<button class="btn btn-teal btn-sm" data-png="${p.img}" data-name="${esc(slug(p))}">PNG</button>
      <a class="btn btn-ghost btn-sm" href="${p.img}" download="BiRAGAS_${esc(slug(p))}.jpg">JPEG</a>` : ""}
      ${gen}
    </div>`;
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
// on phones the sidebar sits above the figures, so jump the page down to the images
function scrollToFigures(){
  if(window.matchMedia("(max-width:960px)").matches)
    document.getElementById("main").scrollIntoView({behavior:"smooth",block:"start"});
}
function backToAll(){
  selectCategory(BYCAT["Lung, NSCLC"] ? "Lung, NSCLC" : Object.keys(BYCAT).sort()[0]);
  document.getElementById("main").scrollIntoView({behavior:"smooth",block:"start"});
}
function showFiltered(titleHtml, hit, opts={}){
  const sub = opts.sub || `${hit.length} pathway${hit.length!=1?"s":""} across all cancers`;
  const main=$("#main");
  main.innerHTML=`<div class="cat-title"><h3>${titleHtml}</h3><span style="color:var(--slate)">${sub}</span>
    <button class="backall" id="backAll">← Back to all cancers</button></div>
    <div class="grid">${hit.map(figCard).join("")}</div>`;
  wire(main);
  const ba=$("#backAll"); if(ba) ba.onclick=backToAll;
  if(opts.scroll!==false) document.getElementById("main").scrollIntoView({behavior:"smooth",block:"start"});
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
  b.innerHTML=`<span class="x">×</span><div><img src="${src}"><div class="cap"><b>${esc(drug)}</b>, ${esc(ct)}</div>
     <div class="lbdl"><button class="btn btn-teal btn-sm" id="lbpng">Download PNG</button>
     <a class="btn btn-ghost btn-sm" href="${src}" download="BiRAGAS_${name}.jpg">Download JPEG</a></div></div>`;
  b.onclick=e=>{ if(e.target===b||e.target.className==="x") b.remove(); };
  document.body.append(b);
  $("#lbpng",b).onclick=()=>downloadPNG(src,"BiRAGAS_"+name);
}

const PATTERNS=[
 ["P1 · Correlate, not a causal driver","The target is associated with the disease but is not the node whose perturbation changes the outcome, blocking it moves a biomarker, not the disease.","Causal-driver identification separates the driver from the correlated noise, with an evidence trail, the false positive down-ranked before a $100M Phase 3.","#3DBB6B"],
 ["P2 · Single-node blockade bypassed by a parallel route","The blocked node stays inhibited, but the biology reroutes around it: a bypass receptor or downstream mutation, a compensatory feedback loop, or a lineage switch that abandons the target dependency, so the phenotype persists despite target engagement.","In-silico perturbation across the causal network tests whether knocking out one node collapses the phenotype or the flux simply reroutes, and names the compensatory node to co-target.","var(--teal)"],
 ["P3 · Unstratified / biomarker-diluted population","The drug works in a molecularly-defined subset, but an all-comers trial dilutes the signal below the endpoint threshold.","Patient stratification identifies the causal subgroup in whom the target is the driver, converting an efficacy failure into a smaller, winnable evaluation.","var(--sky)"],
 ["P4 · Mechanism-based toxicity / benefit-risk","Efficacy may be real, but an on-mechanism safety liability sinks the benefit-risk, sometimes only visible at Phase-3 scale.","Multi-evidence validation reasons about adverse-event biology in the target's neighbourhood, turning a late surprise into an earlier go / no-go.","var(--violet)"],
 ["P5 · Endpoint / placebo heterogeneity (PFS-OS discordance)","A surrogate improves but survival does not; mixed endophenotypes and a variable placebo response swamp a genuine effect.","Endophenotype stratification ties the endpoint to the active molecular driver, tightening both the population and the readout.","var(--green)"],
 ["P6 · Combination without a causal rationale","Two agents are combined on additive hope rather than predicted synergy, adding toxicity without adding efficacy.","Counterfactual combination design predicts where a second perturbation adds non-redundant leverage versus where it only stacks toxicity.","var(--gold-deep)"],
 ["P7 · Acquired on-target escape (resistance mutation or antigen loss)","The target stays the real driver, but the tumor alters the target itself so the drug no longer engages it: an acquired on-target resistance mutation (a gatekeeper or binding-site substitution that restores the target's activity) or loss of the targeted antigen after immune pressure.","Escape-aware target design, the causal model flags escape-prone residues and epitopes so a next-generation binder or a multi-antigen strategy is chosen before the resistant clone emerges.","#1E3A8A"],
];
function buildPatterns(){
  const counts={}; PATHS.forEach(p=>counts[p.biragas_pattern]=(counts[p.biragas_pattern]||0)+1);
  const grid=$("#patterns");
  grid.innerHTML=PATTERNS.map(([t,fail,fix,col])=>{
    const code=t.split(" ")[0]; const n=counts[code]||0;
    return `<div class="pat-card" style="border-left-color:${col}">
      <h4>${esc(t)}</h4>
      <div class="fail">The failure: ${esc(fail)}</div>
      <div class="fix"><b>Where a causal framework helps:</b> ${esc(fix)}</div>
      <button class="pat-filter" data-pat="${code}" style="color:${col}">See ${n} ${code} pathways in the atlas →</button>
    </div>`;
  }).join("");
  $$(".pat-filter",grid).forEach(btn=>btn.onclick=()=>filterByPattern(btn.dataset.pat));
}
function filterByPattern(code){
  $$(".cat").forEach(r=>r.classList.remove("on"));
  const hit=PATHS.filter(p=>p.biragas_pattern===code);
  showFiltered(`BiRAGAS pattern: ${esc(code)}`, hit);
}

const TAXONOMY=[
 ["correlate-not-driver",28,"Target/biomarker robustly associated with disease but not the causal dependency (IGF-1R, IDO1, MET-IHC, Hedgehog in CRC, cancer vaccines to passenger antigens)."],
 ["target-mutation",26,"Secondary/gatekeeper/solvent-front mutation in the drug target restores signaling or blocks binding (e.g. EGFR T790M/C797S, BCR-ABL1 T315I, ALK G1202R, BTK C481S, ESR1, AR-V7)."],
 ["TME/immune-exclusion",22,"A cold, T-cell-excluded or immunosuppressive microenvironment (low TMB, MDSC/TAM, WNT/beta-catenin, PTEN loss, desmoplasia, hypoxia)."],
 ["on-mechanism-toxicity",21,"An on-target/on-mechanism safety liability (paradoxical MAPK SCC, cardiac/CNS off-tumor T-cell attack, arterial thrombosis, checkpoint autoimmunity)."],
 ["bypass/parallel-pathway",19,"A parallel RTK/effector reactivates downstream signaling around the blocked node (e.g. MET/HER2 amplification, RAS/PI3K, CDK2/CCNE1)."],
 ["combination-no-rationale",19,"Agents combined on additive hope; add toxicity/no synergy (IDO1+PD-1, checkpoint+chemo unselected, vaccine+chemo)."],
 ["pharmacologic/efflux-metabolism",18,"Drug efflux (P-gp/ABCB1, MRP, BCRP) or altered uptake/metabolism reduces intracellular exposure."],
 ["population-dilution",13,"Right drug, wrong (unenriched) population; responders averaged away below the endpoint threshold."],
 ["antigen-escape",11,"Loss/downregulation of the targeted antigen or its presentation (CD19 loss, EGFRvIII loss, BCMA loss, B2M/HLA loss)."],
 ["pathway-redundancy",10,"Multiple parallel routes to the same phenotype make single-node blockade insufficient (integrins, angiogenic ligands, lymphocyte homing)."],
 ["DNA-repair/apoptosis-evasion",10,"Enhanced DNA-damage repair or blocked apoptosis (ERCC1/HR, BRCA reversion, DNA-PK/ATM, TP53/BCL2 family)."],
 ["feedback-reactivation",8,"Blocking one node relieves feedback and reactivates the pathway (BRAF→EGFR in colon, MEK→RTK, adaptive checkpoint upregulation)."],
 ["lineage-plasticity/transformation",4,"Cells switch identity to escape target dependence (adeno-to-SCLC, neuroendocrine prostate, B-ALL to myeloid lineage switch)."],
];
function buildTaxonomy(){
  const tb=$("#tax"); if(!tb) return;
  tb.innerHTML=TAXONOMY.map(([c,n,d])=>`<tr><td><button class="cls-link" data-cls="${esc(c)}" title="Show all ${n} pathways in this class">${esc(c)}</button></td><td><span class="n">${n}</span></td><td class="def">${esc(d)}</td></tr>`).join("");
  $$(".cls-link",tb).forEach(btn=>btn.onclick=()=>filterByClass(btn.dataset.cls));
}
function filterByClass(cls){
  $$(".cat").forEach(r=>r.classList.remove("on"));
  const hit=PATHS.filter(p=>p.resistance_class===cls);
  showFiltered(`Resistance class: ${esc(cls)}`, hit);
}

// --- page chrome: always open at the top + mobile nav drawer ---
if("scrollRestoration" in history) history.scrollRestoration="manual";
function scrollTop(){ try{ window.scrollTo({top:0,left:0,behavior:"instant"}); }catch(_){ window.scrollTo(0,0); } }
function setupNav(){
  const t=$("#navToggle"), n=$("#navLinks");
  if(!t||!n) return;
  const close=()=>{ n.classList.remove("open"); t.setAttribute("aria-expanded","false"); };
  t.onclick=()=>{ const open=n.classList.toggle("open"); t.setAttribute("aria-expanded",open?"true":"false"); };
  $$("a",n).forEach(a=>a.addEventListener("click",close));
  window.addEventListener("resize",()=>{ if(window.innerWidth>820) close(); });
}
setupNav();
scrollTop();
window.addEventListener("load",scrollTop);

init().then(scrollTop).catch(e=>{ $("#main").innerHTML=`<p style="color:#c00">Failed to load atlas: ${esc(e.message)}</p>`; });
