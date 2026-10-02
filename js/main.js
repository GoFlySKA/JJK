(() => {
  const $=id=>document.getElementById(id);
  let game=null, renderer=null, scene=null, cameraObj=null, audioCtx=null;

  // Wire the interface before touching the 3D engine. This keeps menus clickable even
  // if WebGL/CDN initialization fails, and makes the failure visible instead of silent.
  $('controlsBtn').onclick=()=>$('controlsBox').classList.toggle('hidden');
  let selectedDifficulty='normal';
  document.querySelectorAll('[data-difficulty]').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('[data-difficulty]').forEach(x=>x.classList.remove('selected'));
    b.classList.add('selected'); selectedDifficulty=b.dataset.difficulty;
  });
  $('startBtn').onclick=()=>start();
  $('restartBtn').onclick=()=>location.reload();
  $('restartPauseBtn').onclick=()=>pause(false);
  $('resumeBtn').onclick=()=>pause(false);
  $('pauseBtn').onclick=()=>pause(true);
  addEventListener('keydown',e=>{if(e.key==='Escape')pause(!game?.paused);});

  function showError(err){
    console.error(err);
    const p=document.querySelector('#startScreen .panel');
    const box=document.createElement('div');
    box.style.cssText='margin-top:16px;padding:12px;border:1px solid #a44;background:rgba(120,20,30,.2);font-size:11px;color:#ffd5d8;text-align:left';
    box.textContent='Game startup failed. Make sure you are online so Three.js can load from the CDN, then refresh. Error: '+(err?.message||err);
    p.appendChild(box);
  }

  function boot(){
    try{
      const canvas=document.getElementById('gameCanvas');
      scene=new THREE.Scene();
      renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
      renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<800?1.25:1.7));renderer.setSize(innerWidth,innerHeight);
      renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      cameraObj=GameCamera.create();
      game={scene,camera:cameraObj.camera,projectiles:[],audio:{},running:false,paused:false,difficulty:selectedDifficulty,time:0,domain:null,domainMesh:null};window.__GAME=game;
      game.cameraObj=cameraObj;game.arena=Arena.build(scene);game.player=Player.create(game);game.sukuna=SukunaAI.make(game);
      let audioReady=false;
      game.audio.beep=(freq,dur,type='sine')=>{try{audioCtx??=new (window.AudioContext||window.webkitAudioContext)();audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.0001,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.06,audioCtx.currentTime+.01);g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+dur);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur+.02);audioReady=true;}catch(e){}};
      game.audio.domain=()=>{game.audio.beep(70,.8,'sawtooth');setTimeout(()=>game.audio.beep(180,.45,'sine'),80);};
      const ds=selectedDifficulty==='easy'?{hp:.82,damage:.72,think:1.25}:selectedDifficulty==='hard'?{hp:1.08,damage:1.25,think:.72}:{hp:1,damage:1,think:1};
      game.sukuna.maxHp*=ds.hp;game.sukuna.hp=game.sukuna.maxHp;game.aiScale=ds;
      wireMobileActions();
      return true;
    }catch(err){showError(err);return false;}
  }

  function start(){
    if(!game){if(!boot())return;}
    game.running=true;game.paused=false;$('startScreen').classList.add('hidden');$('hud').classList.remove('hidden');
    try{audioCtx?.resume();}catch(e){}
  }
  function pause(v){if(!game||!game.running||game.player.dead||game.sukuna.dead)return;game.paused=v;$('pauseScreen').classList.toggle('hidden',!v);}

  function wireMobileActions(){
    document.querySelectorAll('[data-action]').forEach(btn=>{
      btn.addEventListener('pointerdown',e=>{
        e.preventDefault();const a=btn.dataset.action;
        if(a==='attack'||a==='sprint')return;
        if(a==='dodge'){Input.press(' ');setTimeout(()=>Input.release(' '),30);return;}
        const map={blue:'q',red:'e',purple:'r',teleport:'f',six:'x',infinity:'c',void:'v'};
        if(map[a]){Input.press(map[a]);setTimeout(()=>Input.release(map[a]),30);}
      });
    });
  }

  function updateHUD(){
    const p=game.player,s=game.sukuna;
    $('gojoHp').style.width=(p.hp/p.maxHp*100)+'%';$('gojoEnergy').style.width=(p.energy/p.maxEnergy*100)+'%';
    $('sukunaHp').style.width=(s.hp/s.maxHp*100)+'%';$('sukunaEnergy').style.width=(s.energy/s.maxEnergy*100)+'%';
    $('infinityStatus').textContent=p.infinity?'INFINITY ON':'INFINITY OFF';$('sixEyesStatus').textContent=p.sixEyes?'SIX EYES ON':'SIX EYES OFF';$('aiState').textContent=s.blocking?'DEFEND':s.state;
    const map={blue:'cdBlue',red:'cdRed',purple:'cdPurple',teleport:'cdTeleport',six:'cdSix',infinity:'cdInfinity',void:'cdVoid'};
    for(const k in map){const el=$(map[k]),v=p.cooldowns[k]||0;el.parentElement.classList.toggle('cooling',v>0);el.textContent=v>0?v.toFixed(1):'';}
    $('chargeUI').classList.toggle('hidden',!p.charging);$('chargeFill').style.width=(p.charge*100)+'%';$('stateText').textContent=p.charging?'CHARGING':p.infinity?'INFINITY':p.sixEyes?'SIX EYES':'FIGHT';$('battleTimer').textContent=new Date(game.time*1000).toISOString().substring(14,19);
  }
  function end(win){game.running=false;$('hud').classList.add('hidden');$('endScreen').classList.remove('hidden');$('endTitle').textContent=win?'VICTORY':'DEFEAT';$('endText').textContent=win?'Sukuna has been defeated. The arena falls silent.':'Gojo has fallen. Restart to fight again.';}
  function checkEnd(){if(game.player.dead){end(false);return true}if(game.sukuna.dead){end(true);return true}return false;}

  function animate(t){
    requestAnimationFrame(animate);const dt=Math.min(.033,(t-(animate.last||t))/1000);animate.last=t;
    if(game&&game.running&&!game.paused){game.time+=dt;Player.update(game,dt);Abilities.update(game,dt);game.sukuna.think=Math.min(game.sukuna.think,game.aiScale.think);SukunaAI.update(game,dt);Combat.updateProjectiles(game,dt);Effects.update(dt);GameCamera.update(game,dt);updateHUD();if(checkEnd())return;}
    if(renderer&&cameraObj)renderer.render(scene,cameraObj.camera);Input.frameReset();
  }
  addEventListener('resize',()=>{if(!cameraObj||!renderer)return;cameraObj.camera.aspect=innerWidth/innerHeight;cameraObj.camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<800?1.25:1.7));renderer.setSize(innerWidth,innerHeight);});
  animate(0);
})();
