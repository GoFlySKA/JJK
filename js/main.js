(() => {
  const canvas=document.getElementById('gameCanvas');
  const scene=new THREE.Scene();
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<800?1.25:1.7));renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;

  const cameraObj=GameCamera.create();
  const game={scene,camera:cameraObj.camera,projectiles:[],audio:{},running:false,paused:false,difficulty:'normal',time:0,domain:null,domainMesh:null};window.__GAME=game;
  game.cameraObj=cameraObj;game.arena=Arena.build(scene);game.player=Player.create(game);game.sukuna=SukunaAI.make(game);

  // Web Audio: generated tones only.
  let audioCtx=null;
  game.audio.beep=(freq,dur,type='sine')=>{
    try{audioCtx??=new (window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.0001,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.06,audioCtx.currentTime+.01);g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+dur);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur+.02);}catch(e){}
  };
  game.audio.domain=()=>{game.audio.beep(70,.8,'sawtooth');setTimeout(()=>game.audio.beep(180,.45,'sine'),80);};

  const $=id=>document.getElementById(id);
  $('controlsBtn').onclick=()=>$('controlsBox').classList.toggle('hidden');
  document.querySelectorAll('[data-difficulty]').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('[data-difficulty]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');game.difficulty=b.dataset.difficulty;
  });
  $('startBtn').onclick=()=>start();
  $('restartBtn').onclick=()=>location.reload();
  $('restartPauseBtn').onclick=()=>location.reload();
  $('resumeBtn').onclick=()=>pause(false);
  $('pauseBtn').onclick=()=>pause(true);

  function start(){game.running=true;$('startScreen').classList.add('hidden');$('hud').classList.remove('hidden');audioCtx?.resume?.();}
  function pause(v){if(!game.running||game.player.dead||game.sukuna.dead)return;game.paused=v;$('pauseScreen').classList.toggle('hidden',!v);}
  addEventListener('keydown',e=>{if(e.key==='Escape')pause(!game.paused);});

  function difficultyScale(){
    return game.difficulty==='easy'?{hp:.82,damage:.72,think:1.25}:game.difficulty==='hard'?{hp:1.08,damage:1.25,think:.72}:{hp:1,damage:1,think:1};
  }
  const ds=difficultyScale();game.sukuna.maxHp*=ds.hp;game.sukuna.hp=game.sukuna.maxHp;
  game.aiScale=ds;

  function updateHUD(){
    const p=game.player,s=game.sukuna;
    $('gojoHp').style.width=(p.hp/p.maxHp*100)+'%';$('gojoEnergy').style.width=(p.energy/p.maxEnergy*100)+'%';
    $('sukunaHp').style.width=(s.hp/s.maxHp*100)+'%';$('sukunaEnergy').style.width=(s.energy/s.maxEnergy*100)+'%';
    $('infinityStatus').textContent=p.infinity?'INFINITY ON':'INFINITY OFF';
    $('sixEyesStatus').textContent=p.sixEyes?'SIX EYES ON':'SIX EYES OFF';
    $('aiState').textContent=s.blocking?'DEFEND':s.state;
    const map={blue:'cdBlue',red:'cdRed',purple:'cdPurple',teleport:'cdTeleport',six:'cdSix',infinity:'cdInfinity',void:'cdVoid'};
    for(const k in map){const el=$(map[k]),v=p.cooldowns[k]||0;el.parentElement.classList.toggle('cooling',v>0);el.textContent=v>0?v.toFixed(1):'';}
    $('chargeUI').classList.toggle('hidden',!p.charging);$('chargeFill').style.width=(p.charge*100)+'%';
    $('stateText').textContent=p.charging?'CHARGING':p.infinity?'INFINITY':p.sixEyes?'SIX EYES':'FIGHT';
    $('battleTimer').textContent=new Date(game.time*1000).toISOString().substring(14,19);
  }

  function checkEnd(){
    if(game.player.dead){end(false);return true}
    if(game.sukuna.dead){end(true);return true}
    return false;
  }
  function end(win){
    game.running=false;$('hud').classList.add('hidden');$('endScreen').classList.remove('hidden');
    $('endTitle').textContent=win?'VICTORY':'DEFEAT';$('endText').textContent=win?'Sukuna has been defeated. The arena falls silent.':'Gojo has fallen. Restart to fight again.';
  }

  function animate(t){
    requestAnimationFrame(animate);
    const dt=Math.min(.033,(t-(animate.last||t))/1000);animate.last=t;
    if(game.running&&!game.paused){
      game.time+=dt;
      Player.update(game,dt);
      Abilities.update(game,dt);
      // Difficulty changes decision cadence and damage without making targeting automatic.
      game.sukuna.think=Math.min(game.sukuna.think,game.aiScale.think);
      SukunaAI.update(game,dt);
      // Apply difficulty damage scaling by wrapping the effective player-hit result through a temporary multiplier.
      // AI projectiles/melee already use Combat.damage; adjust damage based on the current difficulty by scaling player HP delta.
      Combat.updateProjectiles(game,dt);
      Effects.update(dt);
      GameCamera.update(game,dt);
      updateHUD();
      if(checkEnd())return;
    }
    renderer.render(scene,cameraObj.camera);
    Input.frameReset();
  }
  addEventListener('resize',()=>{cameraObj.camera.aspect=innerWidth/innerHeight;cameraObj.camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<800?1.25:1.7));renderer.setSize(innerWidth,innerHeight);});
  animate(0);

  // Mobile actions map to keyboard-equivalent actions.
  document.querySelectorAll('[data-action]').forEach(btn=>{
    let holdTimer=null;
    btn.addEventListener('pointerdown',e=>{
      const a=btn.dataset.action;
      if(a==='attack')return;
      if(a==='dodge'){Input.press(' ');setTimeout(()=>Input.release(' '),40);return;}
      if(a==='sprint')return;
      const map={blue:'q',red:'e',purple:'r',teleport:'f',six:'x',infinity:'c',void:'v'};
      if(map[a]){Input.press(map[a]); if(a!=='purple') holdTimer=setTimeout(()=>Input.release(map[a]),80);}
    });
    const release=e=>{
      const a=btn.dataset.action, map={blue:'q',red:'e',purple:'r',teleport:'f',six:'x',infinity:'c',void:'v'};
      if(holdTimer){clearTimeout(holdTimer);holdTimer=null;}
      if(a==='purple')Input.release('r');
      else if(map[a])Input.release(map[a]);
    };
    btn.addEventListener('pointerup',release);btn.addEventListener('pointercancel',release);
  });
})();