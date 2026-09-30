(()=>{
if(typeof engine==='undefined')return;
const ENABLE_KEY='air_vocabulary_enabled',MAP_KEY='air_vocabulary_map';
const dictionary=[
 {token:'PALM',label:'Palm',symbol:'✋'},
 {token:'FIST',label:'Fist',symbol:'✊'},
 {token:'POINT',label:'Point',symbol:'☝'},
 {token:'V_SIGN',label:'V Sign',symbol:'✌'},
 {token:'PINCH',label:'Pinch',symbol:'🤏'},
 {token:'SWIPE_LEFT',label:'Swipe Left',symbol:'←'},
 {token:'SWIPE_RIGHT',label:'Swipe Right',symbol:'→'}
];
const defaults={PALM:'BACK',FIST:'PAUSE',POINT:'POINT',V_SIGN:'SCROLL',PINCH:'SELECT',SWIPE_LEFT:'PREVIOUS',SWIPE_RIGHT:'NEXT'};
const actions=['NONE','SELECT','BACK','NEXT','PREVIOUS','PAUSE','POINT','SCROLL','HOME','TRIGGER_1','TRIGGER_2'];
let enabled=localStorage.getItem(ENABLE_KEY)==='1',mapping=loadMap(),candidate='NEUTRAL',candidateAt=0,candidateFired=false,lastCenter=null,lastTrigger=null;
const listeners=new Set(),triggerListeners=new Set(),HOLD_MS=650,MAX_MOVE=.035;
function loadMap(){try{const m=JSON.parse(localStorage.getItem(MAP_KEY)||'null');return m&&typeof m==='object'?{...defaults,...m}:{...defaults}}catch(e){return{...defaults}}}
function save(){try{localStorage.setItem(ENABLE_KEY,enabled?'1':'0');localStorage.setItem(MAP_KEY,JSON.stringify(mapping))}catch(e){}}
function snapshot(){return{enabled,mapping:{...mapping},dictionary:dictionary.map(x=>({...x})),candidate,lastTrigger:lastTrigger?{...lastTrigger}:null}}
function emitState(){const s=snapshot();for(const fn of listeners){try{fn(s)}catch(e){}}try{window.dispatchEvent(new CustomEvent('airvocabularychange',{detail:s}))}catch(e){}renderState();return s}
function fire(token,source,extra={}){if(!enabled)return null;const action=mapping[token]||token;if(action==='NONE')return null;const payload={token,action,source,timestamp:Date.now(),...extra};lastTrigger=payload;for(const fn of triggerListeners){try{fn({...payload})}catch(e){}}try{window.dispatchEvent(new CustomEvent('airvocabularytrigger',{detail:{...payload}}))}catch(e){}renderTrigger(payload);return payload}
function resetPose(){candidate='NEUTRAL';candidateAt=0;candidateFired=false;lastCenter=null}
function setEnabled(v){enabled=!!v;resetPose();save();return emitState()}
function classify(l){if(engine.isPalm?.(l))return'PALM';if(engine.isFist?.(l))return'FIST';const sf=engine.adaptiveScale?engine.scaleFactor:1,pf=engine.personal?.pinchFactor||1,pOut=(engine.o?.pinchOut||.083)*sf*pf;if(engine.dist?.(l[4],l[8])<pOut*1.03)return'PINCH';if(engine.isScrollPose?.(l))return'V_SIGN';if(engine.isPointerPose?.(l))return'POINT';return'NEUTRAL'}
function centerOf(l){return engine.palmCenter?engine.palmCenter(l):{x:(l[0].x+l[9].x)/2,y:(l[0].y+l[9].y)/2}}
function observe(l){if(!enabled||!Array.isArray(l)||l.length<21)return;const token=classify(l),now=performance.now(),center=centerOf(l),move=lastCenter?Math.hypot(center.x-lastCenter.x,center.y-lastCenter.y):0;lastCenter=center;if(token!=='POINT'&&token!=='V_SIGN'){if(candidate!=='NEUTRAL')resetPose();return}if(token!==candidate){candidate=token;candidateAt=now;candidateFired=false;return}if(move>MAX_MOVE){candidateAt=now;candidateFired=false;return}const held=now-candidateAt;if(!candidateFired&&held>=HOLD_MS){candidateFired=true;fire(token,'pose',{held,stable:true})}}
function onGesture(g){if(!enabled||!g)return;if(g.type==='pinch')fire('PINCH','gesture',{gesture:g});else if(g.type==='palm')fire('PALM','gesture',{gesture:g});else if(g.type==='fist')fire('FIST','gesture',{gesture:g});else if(g.type==='swipe'&&g.direction==='left')fire('SWIPE_LEFT','gesture',{gesture:g});else if(g.type==='swipe'&&g.direction==='right')fire('SWIPE_RIGHT','gesture',{gesture:g})}
const baseProcess=engine.process.bind(engine);engine.process=function(l){observe(l);return baseProcess(l)};engine.on('gesture',onGesture);
function ensureUi(){if(document.querySelector('#airSettingsButton'))return;const btn=document.createElement('button');btn.id='airSettingsButton';btn.type='button';btn.setAttribute('aria-label','Impostazioni Air Gesture');btn.textContent='⚙';document.body.appendChild(btn);const overlay=document.createElement('div');overlay.id='airSettingsOverlay';overlay.hidden=true;overlay.innerHTML=`<section id="airSettingsPanel"><header><div><small>IMPOSTAZIONI</small><h2>Air Gesture</h2></div><button type="button" id="airSettingsClose" aria-label="Chiudi">×</button></header><div class="airSettingRow"><div><b>Air Gesture Vocabulary</b><small>Disattivato di default. Quando è OFF non interpreta né genera trigger del vocabolario.</small></div><button type="button" id="airVocabularyToggle" role="switch" aria-checked="false"><span></span><em>OFF</em></button></div><div id="airVocabularySection"><p class="airSettingsNote">Vocabolario neutro e trasversale. Le pose producono trigger astratti; l'app ospite decide se e come usarli.</p><div id="airVocabularyGrid"></div><button type="button" id="airVocabularyReset">RIPRISTINA MAPPING STANDARD</button></div></section>`;document.body.appendChild(overlay);const status=document.createElement('div');status.id='airVocabularyStatus';status.hidden=true;status.innerHTML='<span>VOCABULARY</span><b id="airVocabularyStatusName">ON</b><small id="airVocabularyLast">IN ATTESA</small>';document.body.appendChild(status);btn.addEventListener('click',()=>{overlay.hidden=false;renderState()});overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.hidden=true});document.querySelector('#airSettingsClose').addEventListener('click',()=>overlay.hidden=true);document.querySelector('#airVocabularyToggle').addEventListener('click',()=>setEnabled(!enabled));document.querySelector('#airVocabularyReset').addEventListener('click',()=>{mapping={...defaults};save();renderGrid();emitState()});renderGrid();renderState()}
function renderGrid(){const grid=document.querySelector('#airVocabularyGrid');if(!grid)return;grid.innerHTML='';for(const item of dictionary){const row=document.createElement('div');row.className='airVocabularyItem';row.innerHTML=`<span class="airVocabularyShape">${item.symbol}</span><div><b>${item.label}</b><small>${item.token}</small></div><select aria-label="Azione ${item.label}">${actions.map(a=>`<option value="${a}"${(mapping[item.token]||defaults[item.token])===a?' selected':''}>${a}</option>`).join('')}</select>`;row.querySelector('select').addEventListener('change',e=>{mapping[item.token]=e.target.value;save();emitState()});grid.appendChild(row)}}
function renderState(){const toggle=document.querySelector('#airVocabularyToggle'),section=document.querySelector('#airVocabularySection'),status=document.querySelector('#airVocabularyStatus');if(toggle){toggle.setAttribute('aria-checked',enabled?'true':'false');toggle.classList.toggle('on',enabled);const em=toggle.querySelector('em');if(em)em.textContent=enabled?'ON':'OFF'}if(section)section.classList.toggle('disabled',!enabled);if(status)status.hidden=!enabled}
function renderTrigger(t){const el=document.querySelector('#airVocabularyLast');if(el)el.textContent=`${t.token} → ${t.action}`}
ensureUi();
window.AirGestureVocabulary=Object.freeze({
 get enabled(){return enabled},
 get state(){return snapshot()},
 dictionary:dictionary.map(x=>({...x})),
 enable:()=>setEnabled(true),disable:()=>setEnabled(false),setEnabled,
 setMapping(token,action){if(!dictionary.some(x=>x.token===token)||!actions.includes(String(action).toUpperCase()))return false;mapping[token]=String(action).toUpperCase();save();emitState();renderGrid();return true},
 resetMapping(){mapping={...defaults};save();renderGrid();return emitState()},
 snapshot,
 subscribe(fn){if(typeof fn!=='function')return()=>{};listeners.add(fn);try{fn(snapshot())}catch(e){}return()=>listeners.delete(fn)},
 onTrigger(fn){if(typeof fn!=='function')return()=>{};triggerListeners.add(fn);return()=>triggerListeners.delete(fn)}
});
emitState();
})();
