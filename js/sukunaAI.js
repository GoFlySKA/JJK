window.SukunaAI = (() => {
  const STATES={IDLE:'IDLE',APPROACH:'APPROACH',STRAFE:'STRAFE',ATTACK:'ATTACK',DODGE:'DODGE',DEFEND:'DEFEND',RETREAT:'RETREAT',COUNTER:'COUNTER',PUNISH:'PUNISH',RECOVER:'RECOVER',ULTIMATE:'ULTIMATE'};
  function make(game){
    const b=Player.makeCharacter?null:null;
    // Reuse the same procedural builder through a compact local model.
    const g=new THREE.Group();g.position.set(0,0,-8);game.scene.add(g);
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(.56,1.3,6,10),new THREE.MeshStandardMaterial({color:0x24131b,roughness:.7}));body.position.y=1.05;body.castShadow=true;g.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.44,12,10),new THREE.MeshStandardMaterial({color:0xc58c72,roughness:.8}));head.position.y=2.02;head.castShadow=true;g.add(head);
    const hairMat=new THREE.MeshStandardMaterial({color:0x160c12});
    for(let i=0;i<8;i++){const h=new THREE.Mesh(new THREE.ConeGeometry(.16,.55,6),hairMat);const a=i/8*Math.PI*2;h.position.set(Math.cos(a)*.25,2.35,Math.sin(a)*.25);h.rotation.z=Math.cos(a)*.5;h.rotation.x=Math.sin(a)*.5;g.add(h);}
    const marks=new THREE.Mesh(new THREE.BoxGeometry(.08,.9,.04),new THREE.MeshBasicMaterial({color:0xff324f}));marks.position.set(.2,1.75,.42);marks.rotation.z=-.5;g.add(marks);
    const aura=Effects.aura(game.scene,g,0xff203e,1.2);aura.visible=true;aura.material.opacity=.035;
    return {group:g,type:'sukuna',hp:125,energy:100,maxHp:125,maxEnergy:100,velocity:new THREE.Vector3(),invuln:0,stagger:0,stun:0,slow:1,dead:false,blocking:false,state:STATES.APPROACH,cooldowns:{slash:0,fire:0,dodge:0,ultimate:0},think:0,attackTimer:0,strafeDir:1,recentCharges:0,chargeSeen:0};
  }
  function update(game,dt){
    const s=game.sukuna;if(s.dead)return;
    s.invuln=Math.max(0,s.invuln-dt);s.stagger=Math.max(0,s.stagger-dt);s.stun=Math.max(0,s.stun-dt);s.think-=dt;s.attackTimer=Math.max(0,s.attackTimer-dt);
    for(const k in s.cooldowns)s.cooldowns[k]=Math.max(0,s.cooldowns[k]-dt);
    s.energy=Math.min(s.maxEnergy,s.energy+dt*5);
    const p=game.player;if(p.charging)s.chargeSeen+=dt;else s.chargeSeen=Math.max(0,s.chargeSeen-dt*.6);
    if(s.stun>0){s.blocking=false;s.velocity.multiplyScalar(Math.pow(.02,dt));s.group.position.addScaledVector(s.velocity,dt);return;}
    const to=p.group.position.clone().sub(s.group.position);to.y=0;const dist=to.length();const dir=to.normalize();const away=dir.clone().multiplyScalar(-1);
    // Continuous evaluation, with short decision windows and randomness.
    if(s.think<=0){
      s.think=.16+Math.random()*.22;
      if(p.charging && dist<26 && s.cooldowns.dodge<=0 && Math.random()<.75)s.state=STATES.DODGE;
      else if(p.infinity && dist<10 && s.energy>25 && Math.random()<.35)s.state=STATES.RETREAT;
      else if(s.hp<s.maxHp*.25)s.state=Math.random()<.55?STATES.RETREAT:STATES.DEFEND;
      else if(p.hp<p.maxHp*.3 && dist<18 && s.energy>20)s.state=STATES.PUNISH;
      else if(dist>24)s.state=STATES.APPROACH;
      else if(dist<6 && s.cooldowns.slash<=0)s.state=STATES.ATTACK;
      else if(p.charging && dist<15)s.state=STATES.COUNTER;
      else s.state=Math.random()<.65?STATES.STRAFE:STATES.ATTACK;
      if(s.energy>65 && s.cooldowns.ultimate<=0 && dist<15 && Math.random()<.08)s.state=STATES.ULTIMATE;
    }
    const speed=5.0*(s.state===STATES.RETREAT?1.15:1)*s.slow;
    if(s.state===STATES.DODGE){
      s.cooldowns.dodge=2.2;s.invuln=.32;s.velocity.copy(away).add(new THREE.Vector3(-dir.z,0,dir.x).multiplyScalar((Math.random()-.5)*10)).normalize().multiplyScalar(13);
      s.state=STATES.STRAFE;Effects.burst(game.scene,s.group.position,0xff4d68,18,6,.08);
    } else if(s.state===STATES.DEFEND){
      s.blocking=true;s.velocity.multiplyScalar(.2);
    } else {
      s.blocking=false;
      let desired=new THREE.Vector3();
      if(s.state===STATES.APPROACH||s.state===STATES.PUNISH||s.state===STATES.COUNTER) desired=dir;
      else if(s.state===STATES.RETREAT) desired=away;
      else if(s.state===STATES.STRAFE) desired=new THREE.Vector3(-dir.z,0,dir.x).multiplyScalar(s.strafeDir);
      else desired.set(0,0,0);
      if(s.state===STATES.STRAFE && Math.random()<dt*.35)s.strafeDir*=-1;
      if(desired.lengthSq()){desired.normalize();s.velocity.x=desired.x*speed;s.velocity.z=desired.z*speed;}
      else{s.velocity.x*=.02;s.velocity.z*=.02;}
      s.group.position.addScaledVector(s.velocity,dt);
      s.group.rotation.y=Math.atan2(dir.x,dir.z);
      Arena.resolve(s.group.position,.9,game.arena.boundary);Arena.collide(s.group.position,.9,game.arena.colliders);
    }
    if((s.state===STATES.ATTACK||s.state===STATES.PUNISH||s.state===STATES.COUNTER)&&s.attackTimer<=0)attack(game,dist,dir);
    if(s.state===STATES.ULTIMATE)ultimate(game,dist);
    s.group.rotation.y=Math.atan2(dir.x,dir.z);
  }
  function attack(game,dist,dir){
    const s=game.sukuna;if(dist<7 && s.cooldowns.slash<=0){
      s.cooldowns.slash=1.0;s.attackTimer=.3;
      const hit=Combat.damage(game.player,11,s,{stagger:.16,knockback:dir.clone().multiplyScalar(4)});
      Effects.burst(game.scene,s.group.position.clone().addScaledVector(dir,1.2),0xff3b57,18,6,.06);game.audio.beep(hit?130:80,.08,'square');
    } else if(dist<32 && s.cooldowns.fire<=0 && s.energy>=14){
      s.cooldowns.fire=3.4;s.energy-=14;
      const origin=s.group.position.clone().add(new THREE.Vector3(0,1.5,0)).addScaledVector(dir,1.3);
      const aim=game.player.group.position.clone().add(new THREE.Vector3(0,1.2,0)).sub(origin).normalize();
      const mesh=Effects.projectile(game.scene,origin,aim,0xff234c,.34,0xff8094);
      game.projectiles.push({mesh,velocity:aim.multiplyScalar(24),life:2.5,hitRadius:1.2,target:game.player,onHit:t=>{
        Combat.damage(t,14,s,{stagger:.12,knockback:aim.clone().multiplyScalar(3)});Effects.burst(game.scene,mesh.position,0xff2f50,20,8,.08);
      }});
      game.audio.beep(105,.1,'sawtooth');
    }
  }
  function ultimate(game,dist){
    const s=game.sukuna;if(dist>14||s.cooldowns.ultimate>0||s.energy<55){s.state=STATES.STRAFE;return;}
    s.energy-=55;s.cooldowns.ultimate=18;s.state=STATES.RECOVER;
    const dir=game.player.group.position.clone().sub(s.group.position).normalize();
    const mesh=Effects.projectile(game.scene,s.group.position.clone().add(new THREE.Vector3(0,1.5,0)),dir,0xff174b,.9,0xff7788);
    game.projectiles.push({mesh,velocity:dir.multiplyScalar(18),life:2.5,hitRadius:2,target:game.player,onHit:t=>{
      Combat.damage(t,28,s,{stagger:.7,knockback:dir.clone().multiplyScalar(12)});Effects.ring(game.scene,t.group.position,0xff1f4f,6);
    }});
  }
  return {make,update,STATES};
})();
