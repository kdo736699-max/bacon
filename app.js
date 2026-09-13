'use strict';
(() => {
  const $=s=>document.querySelector(s);
  const entrance=$('#entrance'),house=$('#house'),stage=$('#stage'),world=$('#world'),roomView=$('#room-view'),roomContent=$('#room-content');
  const petWrap=$('#pet-wrap'),petSprite=$('#pet-sprite'),petSpeech=$('#pet-speech'),menu=$('#room-menu');
  const MIN_CAM=350,MAX_CAM=7100;
  let view='gate',current=null,cam=MIN_CAM,camTarget=MIN_CAM,lastFrame=0,scrollPosition=0,transitionTimer=0,observer=null,flightTimer=0,flightTimeouts=new Set(),flightPaused=false,noteIndex=0,planeBusy=false,restoredFocus=null;
  let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let petHidden=false,petX=70,petTarget=70,petState='idle',petFrame=0,petElapsed=0,petUntil=0,walkUntil=0,manualPetUntil=0,lastPaintCam=-1;
  const roomPositions=new Map();
  const petFrames={idle:[0,6,240],'running-right':[1,8,105],'running-left':[2,8,105],waving:[3,4,170],jumping:[4,5,150],waiting:[6,6,270],running:[7,6,110],review:[8,6,380]};
  const timers={set(fn,ms){const id=setTimeout(()=>{flightTimeouts.delete(id);fn()},ms);flightTimeouts.add(id);return id},clear(){flightTimeouts.forEach(clearTimeout);flightTimeouts.clear()}};
  function toast(text){const t=$('#toast');t.textContent=text;t.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('visible'),2500)}
  function setView(next){view=next;document.body.dataset.view=next;house.inert=next!=='corridor';roomView.hidden=next!=='room';entrance.inert=next!=='gate';petWrap.hidden=next==='gate'||petHidden;petSpeech.hidden=true;$('#restore-pet').hidden=!petHidden||next==='gate'}
  function setReduced(value){reduced=value;document.body.classList.toggle('reduced-motion',value);$('#motion-toggle').setAttribute('aria-pressed',String(value));$('#motion-toggle').textContent=value?'动起来':'静一静';if(value){cam=camTarget;stopFlights();petTarget=petX;setPetState(view==='room'?'review':'idle')}else if(current==='window')scheduleFlight();lastPaintCam=-1}
  setReduced(reduced);
  try{const theme=localStorage.getItem('bacon-room-theme');if(theme==='night'){document.body.dataset.theme='night';$('#theme-toggle').textContent='日光'}}catch{}
  $('#theme-toggle').addEventListener('click',()=>{const theme=document.body.dataset.theme==='night'?'day':'night';document.body.dataset.theme=theme;$('#theme-toggle').textContent=theme==='night'?'日光':'夜晚';try{localStorage.setItem('bacon-room-theme',theme)}catch{}});
  $('#motion-toggle').addEventListener('click',()=>setReduced(!reduced));
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>setReduced(e.matches));

  const doorElements=[];
  for(const r of ROOMS){
    if(r.side!=='end'){
      const door=document.createElement('button');door.className='corridor-door';door.dataset.room=r.id;door.setAttribute('aria-label',`进入${r.name}`);door.style.setProperty('--z',r.z);door.style.setProperty('--door-color',r.color);
      door.innerHTML=`<span class="door-leaf"><svg viewBox="0 0 120 206" aria-hidden="true"><use href="assets/doors.svg#d-${r.id}"/></svg><span class="door-plate">${r.name}</span><span class="door-knob"></span></span>`;
      $(`#wall-${r.side}`).append(door);doorElements.push({room:r,door});
    } else doorElements.push({room:r,door:$('.end-window')});
    const label=document.createElement('button');label.className='door-label';label.dataset.room=r.id;label.innerHTML=`<b>${r.name}</b><span>${r.no} · ${r.sub}</span>`;label.setAttribute('aria-label',`进入${r.name}`);label.tabIndex=-1;label.style.pointerEvents='none';$('#door-labels').append(label);doorElements.at(-1).label=label;
    const nav=document.createElement('button');nav.dataset.room=r.id;nav.innerHTML=`<i>${r.no}</i>${r.name}`;menu.append(nav);
  }
  // Every picture is bound to its project; captions never depend on array position.
  const wallPictures=[
    {key:'summer',side:'right',z:650,width:340,height:340,top:210},
    {key:'portrait',side:'left',z:550,width:220,height:285,top:230},
    {key:'roadTitle',side:'right',z:2800,width:230,height:365,top:220},
    {key:'coconut',side:'left',z:4200,width:360,height:275,top:250},
    {key:'autumn',side:'right',z:4950,width:330,height:255,top:280},
    {key:'sunset',side:'left',z:5800,width:200,height:355,top:220}
  ];
  for(const p of wallPictures){const button=document.createElement('button');button.className='wall-art';button.dataset.image=p.key;button.setAttribute('aria-label',`放大：${ASSETS[p.key].title}`);button.style.cssText=`width:${p.width}px;height:${p.height}px;top:${p.top}px;left:${p.side==='left'?p.z-p.width/2:8400-p.z-p.width/2}px`;button.innerHTML=`<img src="${ASSETS[p.key].src}" alt="${ASSETS[p.key].title}" loading="lazy">`;$(`#wall-${p.side}`).append(button)}
  function getMaxScroll(){return Math.max(1,$('#track').offsetHeight-innerHeight)}
  function readScroll(){if(view==='corridor'){camTarget=MIN_CAM+Math.min(1,Math.max(0,scrollY/getMaxScroll()))*(MAX_CAM-MIN_CAM);walkUntil=performance.now()+250}}
  addEventListener('scroll',readScroll,{passive:true});
  addEventListener('resize',()=>{if(view==='corridor')readScroll();lastPaintCam=-1;const maxX=innerWidth-petWrap.offsetWidth-12;petX=Math.min(petX,maxX);petTarget=Math.min(petTarget,maxX)});
  function walkTo(room,instant=false){const desired=Math.max(MIN_CAM,Math.min(MAX_CAM,room.z-600));scrollTo({top:(desired-MIN_CAM)/(MAX_CAM-MIN_CAM)*getMaxScroll(),behavior:instant||reduced?'instant':'smooth'});if(instant){camTarget=desired;cam=desired;lastPaintCam=-1}}
  function nearest(){return ROOMS.reduce((best,r)=>Math.abs(r.z-cam-600)<Math.abs(best.z-cam-600)?r:best,ROOMS[0])}
  function stepCorridor(dir){const r=nearest();let index=ROOMS.indexOf(r)+dir;index=Math.max(0,Math.min(ROOMS.length-1,index));walkTo(ROOMS[index])}
  $('#previous-door').addEventListener('click',()=>stepCorridor(-1));$('#next-door').addEventListener('click',()=>stepCorridor(1));
  function enterHouse(){if(view!=='gate'||entrance.classList.contains('opening'))return;entrance.classList.add('opening');clearTimeout(transitionTimer);transitionTimer=setTimeout(()=>{entrance.classList.add('gone');setView('corridor');scrollTo({top:0,behavior:'instant'});cam=camTarget=MIN_CAM;setPetState('waving',1100);$('#home').focus({preventScroll:true})},reduced?0:850)}
  $('#enter').addEventListener('click',enterHouse);
  function showMenu(value){menu.hidden=!value;$('#room-menu-button').setAttribute('aria-expanded',String(value));if(value)menu.querySelector('button').focus({preventScroll:true})}
  $('#room-menu-button').addEventListener('click',()=>showMenu(menu.hidden));
  document.addEventListener('click',e=>{if(!menu.hidden&&!menu.contains(e.target)&&!$('#room-menu-button').contains(e.target))showMenu(false)});
  $('#home').addEventListener('click',()=>{stopFlights();clearTimeout(transitionTimer);current=null;setView('gate');entrance.classList.remove('gone','opening');history.pushState({},'',location.pathname+location.search);$('#enter').focus({preventScroll:true})});

  function mountReveals(){if(observer)observer.disconnect();if(reduced)return;roomContent.classList.add('motion-ready');const nodes=[...roomContent.querySelectorAll('.reveal')];const rootRect=roomView.getBoundingClientRect();nodes.forEach(el=>{if(el.getBoundingClientRect().top>rootRect.bottom-25)el.classList.add('pending')});observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.remove('pending');observer.unobserve(entry.target)}}),{root:roomView,threshold:.08,rootMargin:'0px 0px -20px 0px'});nodes.forEach(el=>observer.observe(el))}
  function openRoom(id,{push=true,animated=true,anchor=null}={}){
    const room=ROOMS.find(r=>r.id===id);if(!room)return;
    if(view==='room'&&current===id){if(anchor)document.getElementById(anchor)?.scrollIntoView({block:'start'});return;}
    const oldCurrent=current;if(oldCurrent)roomPositions.set(oldCurrent,roomView.scrollTop);
    if(view==='corridor')scrollPosition=scrollY;
    const triggeringDoor=doorElements.find(x=>x.room.id===id)?.door;
    if(view==='corridor'&&animated&&!reduced)triggeringDoor?.classList.add('entering');
    clearTimeout(transitionTimer);stopFlights();showMenu(false);
    const finish=()=>{document.querySelectorAll('.entering').forEach(el=>el.classList.remove('entering'));entrance.classList.add('gone');current=id;roomContent.innerHTML=CONTENT[id]();roomView.dataset.room=id;roomContent.style.setProperty('--accent',room.color);$('#room-current').textContent=room.name;const index=ROOMS.indexOf(room);$('#previous-room').disabled=index===0;$('#next-room').disabled=index===ROOMS.length-1;setView('room');roomView.scrollTop=roomPositions.get(id)||0;petTarget=innerWidth-petWrap.offsetWidth-22;setPetState('review');if(id==='fire')renderInsights('说人话');if(id==='window')initWindow();if(anchor)document.getElementById(anchor)?.scrollIntoView({block:'start'});mountReveals();$('#back-corridor').focus({preventScroll:true});if(push&&location.hash!=='#'+id)history.pushState({room:id},'','#'+id)};
    if(view==='corridor'&&animated&&!reduced)transitionTimer=setTimeout(finish,360);else finish();
  }
  function closeRoom(push=true){if(view!=='room')return;roomPositions.set(current,roomView.scrollTop);const room=ROOMS.find(r=>r.id===current);stopFlights();if(observer)observer.disconnect();current=null;setView('corridor');if(push)history.pushState({},'',location.pathname+location.search);if(room)walkTo(room,true);else scrollTo({top:scrollPosition,behavior:'instant'});setPetState('idle');doorElements.find(x=>x.room.id===room?.id)?.door.focus({preventScroll:true})}
  $('#back-corridor').addEventListener('click',()=>closeRoom());
  function stepRoom(dir){const index=ROOMS.findIndex(r=>r.id===current)+dir;if(ROOMS[index])openRoom(ROOMS[index].id,{animated:false})}
  $('#previous-room').addEventListener('click',()=>stepRoom(-1));$('#next-room').addEventListener('click',()=>stepRoom(1));
  addEventListener('popstate',()=>{clearTimeout(transitionTimer);const id=location.hash.slice(1);if(CONTENT[id])openRoom(id,{push:false,animated:false});else if(view==='room')closeRoom(false)});
  // Navigation belongs to an explicit button, never to the room-view container.
  document.addEventListener('click',e=>{const control=e.target.closest('button[data-room]');if(control)openRoom(control.dataset.room,{anchor:control.dataset.section||null})});
  roomContent.addEventListener('toggle',e=>{if(e.target.matches('details.drawer')&&e.target.open&&!reduced)e.target.animate([{translate:'-5px 0',opacity:.7},{translate:'0 0',opacity:1}],{duration:350,easing:'ease-out'})},true);

  const dossier=$('#dossier-viewer');
  let dossierFocus=null;
  document.addEventListener('click',e=>{
    const button=e.target.closest('button[data-dossier]');if(!button)return;
    const [type,id]=button.dataset.dossier.split(':');const data=dossierContent(type,id);if(!data)return;
    dossierFocus=button;$('#dossier-title').textContent=data.title;$('#dossier-meta').textContent=data.meta;
    $('#dossier-body').innerHTML=data.html;dossier.showModal();$('#dossier-body').scrollTop=0;
    $('#close-dossier').focus({preventScroll:true});
  });
  $('#close-dossier').addEventListener('click',()=>dossier.close());
  dossier.addEventListener('close',()=>dossierFocus?.focus({preventScroll:true}));
  dossier.addEventListener('click',e=>{
    const node=e.target.closest('[data-mechanism-node]');if(!node)return;
    const diagram=node.closest('[data-mechanism]');const paper=PAPERS.find(p=>p.id===diagram.dataset.mechanism);
    diagram.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===node)));
    diagram.nextElementSibling.textContent=paper.mechanism[Number(node.dataset.mechanismNode)][1];
  });
  const viewer=$('#image-viewer');
  function openImage(key){const item=ASSETS[key];if(!item)return;restoredFocus=document.activeElement;$('#full-image').src=item.src;$('#full-image').alt=item.title;$('#image-title').textContent=item.title;viewer.showModal();$('.image-scroll').scrollTop=0;petSpeech.hidden=true}
  document.addEventListener('click',e=>{const control=e.target.closest('[data-image]');if(control)openImage(control.dataset.image)});
  $('#close-image').addEventListener('click',()=>viewer.close());viewer.addEventListener('click',e=>{if(e.target===viewer){const rect=viewer.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)viewer.close()}});viewer.addEventListener('close',()=>restoredFocus?.focus({preventScroll:true}));
  document.addEventListener('click',async e=>{const btn=e.target.closest('[data-copy]');if(!btn)return;const label=btn.dataset.copyLabel||'内容';try{await navigator.clipboard.writeText(btn.dataset.copy);toast(label+'已复制')}catch{const input=document.createElement('textarea');input.value=btn.dataset.copy;input.style.cssText='position:fixed;opacity:0';document.body.append(input);input.select();const ok=document.execCommand('copy');input.remove();btn.focus();toast(ok?label+'已复制':'请选中'+label+'文字复制')}});
  function renderInsights(name){const list=INSIGHTS[name];if(!list)return;const tabs=[...roomContent.querySelectorAll('[data-insight]')];tabs.forEach(tab=>{const selected=tab.dataset.insight===name;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1});const pane=$('#insight-content');pane.innerHTML=list.map(([title,text],i)=>`<article class="insight-entry" style="--i:${i}"><h3>${title}</h3><p>${text}</p></article>`).join('');pane.setAttribute('aria-labelledby',tabs.find(x=>x.dataset.insight===name).id)}
  roomContent.addEventListener('click',e=>{const tab=e.target.closest('[data-insight]');if(tab)renderInsights(tab.dataset.insight)});
  roomContent.addEventListener('keydown',e=>{const tab=e.target.closest('[data-insight]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();const tabs=[...roomContent.querySelectorAll('[data-insight]')];let index=tabs.indexOf(tab);index=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;renderInsights(tabs[index].dataset.insight);tabs[index].focus()});

  function stopFlights(){clearTimeout(flightTimer);flightTimer=0;timers.clear();planeBusy=false;document.querySelectorAll('.paper-plane,.paper-fold').forEach(n=>{n.getAnimations().forEach(a=>a.cancel());n.remove()})}
  function showNote(index){noteIndex=(index+PORTRAIT_NOTES.length)%PORTRAIT_NOTES.length;const copy=$('#personal-copy');if(!copy)return;copy.innerHTML=`<h2>${PORTRAIT_NOTES[noteIndex][0]}</h2><p>${PORTRAIT_NOTES[noteIndex][1]}</p>`;$('#note-count').textContent=`${String(noteIndex+1).padStart(2,'0')} / 06`;if(!reduced)copy.animate([{opacity:0,transform:'translateY(7px)'},{opacity:1,transform:'none'}],{duration:350,easing:'ease-out'})}
  function scheduleFlight(){clearTimeout(flightTimer);if(view!=='room'||current!=='window'||flightPaused||reduced||document.hidden)return;flightTimer=setTimeout(()=>{const scene=$('#window-scene');if(scene){const r=scene.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight&&!planeBusy)launchPlane(false)}scheduleFlight()},10000)}
  function launchPlane(manual=true){if(current!=='window'||planeBusy)return;if(reduced){if(manual)showNote(noteIndex+1);return}const scene=$('#window-scene'),layer=$('#flight-layer'),outside=$('#window-outside');if(!scene||!layer||!outside)return;if(manual){planeBusy=true;clearTimeout(flightTimer)}
    const bounds=scene.getBoundingClientRect(),w=bounds.width,h=bounds.height;
    const plane=document.createElement('span');plane.className='paper-plane';plane.setAttribute('aria-hidden','true');
    const startX=-Math.min(w*.6,160),startY=h*.48;
    function fly(){if(current!=='window')return;layer.append(plane);const animation=plane.animate([
      {transform:`translate(${startX}px,${startY}px) rotate(-12deg) scale(1)`,opacity:1,offset:0},
      {transform:`translate(${w*.05}px,${h*.30}px) rotate(-25deg) scale(.85)`,opacity:1,offset:.35},
      {transform:`translate(${w*.32}px,${h*.27}px) rotate(-8deg) scale(.6)`,opacity:1,offset:.65},
      {transform:`translate(${w*.50}px,${h*.19}px) rotate(2deg) scale(.36)`,opacity:.85,offset:1}
    ],{duration:2100,easing:'cubic-bezier(.25,.45,.35,1)',fill:'forwards'});
    timers.set(()=>{if(!plane.isConnected)return;animation.cancel();plane.remove();outside.append(plane);const ow=outside.clientWidth,oh=outside.clientHeight;plane.animate([{transform:`translate(${ow*.48}px,${oh*.21}px) rotate(2deg) scale(.36)`,opacity:.8},{transform:`translate(${ow*.75}px,${oh*.10}px) rotate(-8deg) scale(.1)`,opacity:0}],{duration:1450,easing:'ease-out',fill:'forwards'});timers.set(()=>{plane.remove();planeBusy=false;scheduleFlight()},1450)},2100)}
    if(manual){const fold=document.createElement('span');fold.className='paper-fold';layer.append(fold);fold.animate([{transform:`translate(${startX}px,${startY}px) rotate(-3deg) scale(1.2)`},{transform:`translate(${startX}px,${startY}px) rotate(-12deg) scaleX(.4) scaleY(.6)`,borderRadius:'0'}],{duration:550,easing:'ease-in-out',fill:'forwards'});timers.set(()=>{fold.remove();fly();showNote(noteIndex+1)},550)}else fly();
  }
  function initWindow(){noteIndex=0;flightPaused=false;showNote(0);$('#fly-note').addEventListener('click',()=>launchPlane(true));$('#previous-note').addEventListener('click',()=>showNote(noteIndex-1));$('#pause-flights').addEventListener('click',()=>{flightPaused=!flightPaused;const btn=$('#pause-flights');btn.setAttribute('aria-pressed',String(flightPaused));btn.textContent=flightPaused?'继续放飞':'暂停放飞';if(flightPaused)stopFlights();else scheduleFlight()});if(reduced){$('#pause-flights').hidden=true;$('#fly-note').innerHTML='下一张 <span>→</span>'}scheduleFlight()}
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(flightTimer);lastFrame=0}else if(current==='window')scheduleFlight()});

  function setPetState(state,duration=0){if(!petFrames[state])return;if(petState!==state){petState=state;petFrame=0;petElapsed=0}petUntil=duration?performance.now()+duration:0}
  $('#pet').addEventListener('click',e=>{e.stopPropagation();petSpeech.hidden=!petSpeech.hidden;setPetState('waving',850);manualPetUntil=performance.now()+1500});
  $('#hide-pet').addEventListener('click',()=>{petHidden=true;petWrap.hidden=true;$('#restore-pet').hidden=false;petSpeech.hidden=true});$('#restore-pet').addEventListener('click',()=>{petHidden=false;petWrap.hidden=view==='gate';$('#restore-pet').hidden=true;setPetState('waving',850)});
  document.querySelectorAll('[data-pet-go]').forEach(btn=>btn.addEventListener('click',()=>{petSpeech.hidden=true;const id=btn.dataset.petGo;petTarget=Math.max(12,Math.min(innerWidth-petWrap.offsetWidth-12,id==='archive'?innerWidth*.34:innerWidth*.68));manualPetUntil=performance.now()+1500;setPetState(petTarget>petX?'running-right':'running-left');clearTimeout(transitionTimer);transitionTimer=setTimeout(()=>openRoom(id,{animated:false}),reduced?0:600)}));
  stage.addEventListener('click',e=>{if(view!=='corridor'||e.target.closest('button')||petHidden||e.clientY<innerHeight*.62)return;petSpeech.hidden=true;petTarget=Math.max(12,Math.min(innerWidth-petWrap.offsetWidth-12,e.clientX-petWrap.offsetWidth/2));manualPetUntil=performance.now()+4000;const mark=document.createElement('span');mark.className='pet-target';mark.style.left=(e.clientX-12)+'px';mark.style.top=(innerHeight-80)+'px';document.body.append(mark);setTimeout(()=>mark.remove(),850);if(reduced)petX=petTarget});
  document.addEventListener('keydown',e=>{if(viewer.open||dossier.open)return;if(e.key==='Escape'){if(!petSpeech.hidden){petSpeech.hidden=true;$('#pet').focus();return}if(!menu.hidden){showMenu(false);$('#room-menu-button').focus();return}if(view==='room')closeRoom();return}if(e.defaultPrevented||e.target.closest('input,textarea,select,[role=tablist]')||e.ctrlKey||e.metaKey||e.altKey)return;if(['ArrowRight','ArrowLeft'].includes(e.key)&&view==='corridor'&&menu.hidden){e.preventDefault();stepCorridor(e.key==='ArrowRight'?1:-1)}});

  function paintCorridor(){world.style.transform=`translate3d(0,0,${cam.toFixed(2)}px)`;const near=nearest();$('#nearby').textContent=near.name;$('#progress').style.width=`${((cam-MIN_CAM)/(MAX_CAM-MIN_CAM)*100).toFixed(1)}%`;const pool=doorElements.filter(x=>x.room.z-cam>-120&&x.room.z-cam<2600);const visible=[];for(const side of ['left','right','end']){const pick=pool.filter(x=>x.room.side===side).sort((a,b)=>Math.abs(a.room.z-cam-550)-Math.abs(b.room.z-cam-550))[0];if(pick)visible.push(pick)}for(const item of doorElements){const {label,door,room}=item;if(!visible.includes(item)){label.style.opacity='0';label.style.pointerEvents='none';continue}const r=door.getBoundingClientRect();const within=r.width>5&&r.right>0&&r.left<innerWidth&&r.bottom>90;const labelHalf=Math.min(120,label.offsetWidth/2+6);const x=Math.max(labelHalf+8,Math.min(innerWidth-labelHalf-8,r.left+r.width/2));const y=Math.max(145,Math.min(innerHeight-165,r.top-18));label.style.left=x+'px';label.style.top=y+'px';label.style.opacity=within?'1':'0';label.style.pointerEvents=within?'auto':'none'}lastPaintCam=cam}
  function animate(now){const dt=lastFrame?Math.min(50,now-lastFrame):16;lastFrame=now;
    if(!document.hidden){if(view==='corridor'){cam+= (camTarget-cam)*(reduced?1:1-Math.exp(-dt/95));if(Math.abs(camTarget-cam)<.15)cam=camTarget;if(Math.abs(cam-lastPaintCam)>.1)paintCorridor()}
    if(view!=='gate'&&!petHidden){if(view==='corridor'&&now>manualPetUntil&&now<walkUntil){petTarget=innerWidth*.14+(cam-MIN_CAM)/(MAX_CAM-MIN_CAM)*innerWidth*.53}
      const distance=petTarget-petX;if(reduced)petX=petTarget;else if(Math.abs(distance)>3){petX+=Math.sign(distance)*Math.min(Math.abs(distance),200*dt/1000);if(now>petUntil)setPetState(distance>0?'running-right':'running-left')}
      else if(now>petUntil&&['running-right','running-left','running','waving','jumping'].includes(petState))setPetState(view==='room'?'review':'idle');
      if(now>petUntil&&view==='corridor'&&now<walkUntil&&Math.abs(distance)<3&&!reduced)setPetState('running');
      petWrap.style.transform=`translateX(${petX.toFixed(1)}px)`;petWrap.classList.toggle('at-right',petX>innerWidth/2);if(!reduced){petElapsed+=dt;const[row,count,interval]=petFrames[petState];if(petElapsed>=interval){petFrame=(petFrame+Math.floor(petElapsed/interval))%count;petElapsed%=interval}petSprite.style.backgroundPosition=`${petFrame/7*100}% ${row/8*100}%`}else petSprite.style.backgroundPosition='0 0';
    }}requestAnimationFrame(animate)}
  requestAnimationFrame(animate);
  // For shared room links, open the actual room without an extra entry click.
  const initial=location.hash.slice(1);if(CONTENT[initial])openRoom(initial,{push:false,animated:false});
})();
