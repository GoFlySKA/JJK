window.Abilities = (() => {
  const defs={
    blue:{cd:4,cost:18,range:38},
    red:{cd:6,cost:24,range:45},
    purple:{cd:22,cost:65,range:65},
    teleport:{cd:5,cost:12,range:10},
    six:{cd:12,cost:0,duration:7},
    infinity:{cd:1,cost:4},
    void:{cd:35,cost:80,range:16}
  };
  function ready(p,k){return (p.cooldowns[k]||0)<=0 && p.energy>=defs[k].cost;}
  function spend(p,k){p.energy-=defs[k].cost;p.cooldowns[k]=defs[k].cd;}
  function fireBlue(game){
    const p=game.player;if(!ready(p,'blue'))return false;
    const dir=Combat.aimDirection(game),origin=p.group.position.clone().add(new THREE.Vector3(0,1.45,0)).addScaledVector(dir,1.5);
    const mesh=Effects.projectile(game.scene,origin,dir,0x4199ff,.42,0x8ad7ff);
    spend(p,'blue');game.projectiles.push({mesh,velocity:dir.multiplyScalar(28),life:2.0,hitRadius:1.7,target:game.sukuna,onHit:t=>{
      if(!Combat.targetInCrosshair({camera:{getWorldPosition:()=>mesh.position},player:p},t,999,1)){}
      Combat.damage(t,20,p,{stagger:.2,knockback:dir.clone().multiplyScalar(4)});
      const pull=t.group.position.clone().sub(mesh.position).normalize().multiplyScalar(-8);t.velocity.add(pull);
      Effects.burst(game.scene,mesh.position,0x55aaff,30,7,.09);Effects.ring(game.scene,t.group.position,0x55aaff,3);
    }});
    game.audio.beep(180,.14,'sine');return true;
  }
  function fireRed(game){
    const p=game.player;if(!ready(p,'red'))return false;
    const dir=Combat.aimDirection(game),origin=p.group.position.clone().add(new THREE.Vector3(0,1.5,0)).addScaledVector(dir,1.6);
    const mesh=Effects.projectile(game.scene,origin,dir,0xff304f,.5,0xffa0aa);
    spend(p,'red');game.projectiles.push({mesh,velocity:dir.multiplyScalar(34),life:2,hitRadius:1.5,target:game.sukuna,onHit:t=>{
      Combat.damage(t,32,p,{stagger:.45,knockback:dir.clone().multiplyScalar(13)});
      Effects.burst(game.scene,mesh.position,0xff3c52,38,10,.1);Effects.ring(game.scene,t.group.position,0xff314f,4);
    }});game.audio.beep(95,.18,'sawtooth');return true;
  }
  function startPurple(game){
    const p=game.player;if(!ready(p,'purple')||p.charging)return false;
    p.charging=true;p.charge=0;p.cooldowns.purple=defs.purple.cd;game.audio.beep(220,.12,'triangle');return true;
  }
  function releasePurple(game){
    const p=game.player;if(!p.charging)return false;p.charging=false;
    if(p.charge<.65){p.cooldowns.purple=Math.max(2,p.cooldowns.purple);return false;}
    p.energy-=defs.purple.cost;
    const dir=Combat.aimDirection(game),origin=p.group.position.clone().add(new THREE.Vector3(0,1.5,0)).addScaledVector(dir,2);
    const mesh=Effects.projectile(game.scene,origin,dir,0xc55cff,1.0,0x647dff);mesh.scale.set(1.8,1.8,1.8);
    game.projectiles.push({mesh,velocity:dir.multiplyScalar(22),life:3.2,hitRadius:2.7,target:game.sukuna,onHit:t=>{
      Combat.damage(t,78,p,{stagger:1,knockback:dir.clone().multiplyScalar(20)});
      Effects.burst(game.scene,mesh.position,0xd25cff,90,15,.13);Effects.ring(game.scene,t.group.position,0xa66cff,8);game.camera.shake=.8;
    }});
    game.audio.beep(55,.55,'sawtooth');return true;
  }
  function teleport(game){
    const p=game.player;if(!ready(p,'teleport'))return false;
    const dir=Combat.aimDirection(game),dest=p.group.position.clone().add(new THREE.Vector3(dir.x,0,dir.z).normalize().multiplyScalar(defs.teleport.range));
    dest.y=0;Arena.resolve(dest,1,game.arena.boundary);Arena.collide(dest,1,game.arena.colliders);
    Effects.burst(game.scene,p.group.position,0x6a9cff,25,7,.08);p.group.position.copy(dest);p.invuln=.35;spend(p,'teleport');Effects.burst(game.scene,p.group.position,0xa66cff,30,7,.08);game.audio.beep(420,.1,'sine');return true;
  }
  function toggleSix(game){
    const p=game.player;
    if(p.sixEyes){p.sixEyes=false;p.sixTimer=0;return true;}
    if(!ready(p,'six'))return false;spend(p,'six');p.sixEyes=true;p.sixTimer=defs.six.duration;return true;
  }
  function toggleInfinity(game){
    const p=game.player;
    if(p.infinity){p.infinity=false;return true;}
    if(p.energy<defs.infinity.cost)return false;p.infinity=true;return true;
  }
  function voidDomain(game){
    const p=game.player;if(!ready(p,'void')||game.sukuna.dead)return false;
    const dist=p.group.position.distanceTo(game.sukuna.group.position);if(dist>defs.void.range)return false;
    spend(p,'void');game.domain={time:5.5};game.sukuna.stun=4.8;game.sukuna.velocity.multiplyScalar(0);
    game.domainMesh=new THREE.Mesh(new THREE.SphereGeometry(17,32,20),new THREE.MeshBasicMaterial({color:0x28134f,transparent:true,opacity:.22,side:THREE.BackSide,depthWrite:false}));
    game.domainMesh.position.copy(p.group.position);game.scene.add(game.domainMesh);
    Effects.ring(game.scene,p.group.position,0x9b5cff,16);Effects.burst(game.scene,p.group.position,0x8e5cff,80,10,.1);game.audio.domain();return true;
  }
  function update(game,dt){
    const p=game.player;
    for(const k in p.cooldowns)p.cooldowns[k]=Math.max(0,p.cooldowns[k]-dt);
    if(p.sixEyes){p.sixTimer-=dt;if(p.sixTimer<=0)p.sixEyes=false;}
    if(p.infinity){p.energy-=defs.infinity.cost*dt;if(p.energy<=0){p.energy=0;p.infinity=false;}}
    if(p.charging){p.charge=Math.min(1,p.charge+dt/.95);}
    if(game.domain){game.domain.time-=dt;game.sukuna.slow=.15;if(game.domain.time<=0){game.domain=null;game.sukuna.slow=1;if(game.domainMesh){game.scene.remove(game.domainMesh);game.domainMesh=null;}}}
  }
  return {fireBlue,fireRed,startPurple,releasePurple,teleport,toggleSix,toggleInfinity,voidDomain,update,defs};
})();
