window.Player = (() => {
  function makeCharacter(scene,type){
    const g=new THREE.Group();g.position.set(0,0,8);scene.add(g);
    const isGojo=type==='gojo', bodyColor=isGojo?0x171824:0x171216, accent=isGojo?0xdfe9ff:0x6f1725, energy=isGojo?0x77aaff:0xff3152;
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(.55,1.25,6,10),new THREE.MeshStandardMaterial({color:bodyColor,roughness:.7}));
    body.position.y=1.05;body.castShadow=true;g.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.43,12,10),new THREE.MeshStandardMaterial({color:isGojo?0xf0c7a5:0xc58c72,roughness:.8}));
    head.position.y=2.0;head.castShadow=true;g.add(head);
    const hairMat=new THREE.MeshStandardMaterial({color:isGojo?0xf4f7ff:0x211118,roughness:.65});
    for(let i=0;i<(isGojo?9:7);i++){
      const h=new THREE.Mesh(new THREE.ConeGeometry(.15,.55,6),hairMat);
      const a=i/(isGojo?9:7)*Math.PI*2;h.position.set(Math.cos(a)*.25,2.34,Math.sin(a)*.25);h.rotation.z=Math.cos(a)*.5;h.rotation.x=Math.sin(a)*.5;g.add(h);
    }
    const eye=new THREE.Mesh(new THREE.BoxGeometry(.62,.08,.04),new THREE.MeshBasicMaterial({color:isGojo?0x6fdcff:0xff334f}));
    eye.position.set(0,2.02,.41);g.add(eye);
    const aura=Effects.aura(scene,g,energy,1.15);aura.visible=false;
    const weapon=new THREE.Mesh(new THREE.BoxGeometry(.08,.8,.08),new THREE.MeshStandardMaterial({color:accent,emissive:accent,emissiveIntensity:.4}));
    weapon.position.set(.65,1.15,.15);weapon.rotation.z=-.3;g.add(weapon);
    return {group:g,type,body,aura,weapon};
  }
  function create(game){
    const base=makeCharacter(game.scene,'gojo');
    Object.assign(base,{hp:100,energy:100,maxHp:100,maxEnergy:100,type:'gojo',velocity:new THREE.Vector3(),invuln:0,stagger:0,dead:false,infinity:false,sixEyes:false,sixTimer:0,charging:false,charge:0,cooldowns:{blue:0,red:0,purple:0,teleport:0,six:0,infinity:0,void:0},attackTimer:0,dodgeTimer:0,sprint:false});
    return base;
  }
  function update(game,dt){
    const p=game.player;if(p.dead)return;
    p.invuln=Math.max(0,p.invuln-dt);p.stagger=Math.max(0,p.stagger-dt);p.dodgeTimer=Math.max(0,p.dodgeTimer-dt);
    if(!p.infinity && !p.charging)p.energy=Math.min(p.maxEnergy,p.energy+dt*(p.sixEyes?13:7));
    const move=new THREE.Vector3(Input.down('d')?1:0,0,Input.down('s')?1:0).sub(new THREE.Vector3(Input.down('a')?1:0,0,Input.down('w')?1:0));
    if(Input.touch.moveX||Input.touch.moveY)move.set(Input.touch.moveX,0,Input.touch.moveY);
    if(move.lengthSq()>1)move.normalize();
    const speed=(Input.down('shift')||Input.touch.sprint)?8.5:5.2;
    const forward=new THREE.Vector3(Math.sin(game.camera.yaw),0,Math.cos(game.camera.yaw));
    const right=new THREE.Vector3(Math.cos(game.camera.yaw),0,-Math.sin(game.camera.yaw));
    const worldMove=right.multiplyScalar(move.x).add(forward.multiplyScalar(move.z));
    if(worldMove.lengthSq()>0 && !p.charging){worldMove.normalize();p.velocity.x=worldMove.x*speed;p.velocity.z=worldMove.z*speed;p.group.rotation.y=Math.atan2(worldMove.x,worldMove.z);}
    else {p.velocity.x*=Math.pow(.001,dt);p.velocity.z*=Math.pow(.001,dt);}
    if(Input.pressed(' ')){Input.consume(' ');if(p.dodgeTimer<=0){p.dodgeTimer=.8;p.invuln=.28;p.velocity.add(worldMove.lengthSq()?worldMove.normalize().multiplyScalar(12):new THREE.Vector3(0,0,-12));Effects.burst(game.scene,p.group.position,0x8a8dff,20,6,.08);game.audio.beep(520,.07,'triangle');}}
    if(p.stagger<=0){p.group.position.addScaledVector(p.velocity,dt);}
    p.velocity.y=0;Arena.resolve(p.group.position,.8,game.arena.boundary);Arena.collide(p.group.position,.8,game.arena.colliders);
    p.attackTimer=Math.max(0,p.attackTimer-dt);
    if((Input.mouse.down||Input.touch.attack)&&p.attackTimer<=0&&!p.charging){basicAttack(game);p.attackTimer=.32;}
    if(Input.pressed('q')){Input.consume('q');Abilities.fireBlue(game)}
    if(Input.pressed('e')){Input.consume('e');Abilities.fireRed(game)}
    if(Input.pressed('r')){Input.consume('r');if(!p.charging)Abilities.startPurple(game)}
    if(Input.pressed('f')){Input.consume('f');Abilities.teleport(game)}
    if(Input.pressed('x')){Input.consume('x');Abilities.toggleSix(game)}
    if(Input.pressed('c')){Input.consume('c');Abilities.toggleInfinity(game)}
    if(Input.pressed('v')){Input.consume('v');Abilities.voidDomain(game)}
    if(Input.down('r')===false && p.charging)Abilities.releasePurple(game);
    if(p.infinity){p.aura.visible=true;p.aura.scale.setScalar(1.15+Math.sin(performance.now()/150)*.08);}else p.aura.visible=false;
    if(p.sixEyes){p.aura.visible=true;p.aura.material.color.setHex(0x75d6ff);p.aura.material.opacity=.07;}
  }
  function basicAttack(game){
    const p=game.player;if(p.energy<2)return;p.energy-=2;
    const hit=Combat.targetInCrosshair(game,game.sukuna,18,.13);
    const dir=Combat.aimDirection(game);
    Effects.burst(game.scene,p.group.position.clone().addScaledVector(dir,1.5),0xb3d9ff,10,4,.06);
    if(hit)Combat.damage(game.sukuna,7,p,{stagger:.08,knockback:dir.multiplyScalar(2)});
    game.audio.beep(hit?260:170,.05,'square');
  }
  return {create,update};
})();
