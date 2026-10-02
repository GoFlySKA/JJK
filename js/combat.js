window.Combat = (() => {
  function rayFromCamera(camera,ndcX=0,ndcY=0){
    const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(ndcX,ndcY),camera);return ray;
  }
  function aimPoint(game,max=60){
    const ray=rayFromCamera(game.camera);
    const plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
    const p=new THREE.Vector3();
    if(ray.ray.intersectPlane(plane,p) && p.distanceTo(game.player.group.position)<max)return p;
    return ray.ray.origin.clone().add(ray.ray.direction.multiplyScalar(max));
  }
  function aimDirection(game){
    const ray=rayFromCamera(game.camera);
    return ray.ray.direction.clone().normalize();
  }
  function targetInCrosshair(game,target,maxRange,cone=.09){
    const origin=game.camera.getWorldPosition(new THREE.Vector3());
    const dir=aimDirection(game);
    const to=target.group.position.clone().add(new THREE.Vector3(0,1.3,0)).sub(origin);
    const dist=to.length();
    if(dist>maxRange)return false;
    return dir.dot(to.normalize())>1-cone;
  }
  function damage(target,amount,source,opts={}){
    if(!target || target.dead)return false;
    let final=amount;
    if(target.type==='sukuna' && target.blocking) final*=.35;
    if(target.type==='gojo' && target.infinity) final*=.12;
    if(target.invuln>0)return false;
    if(target.type==='gojo' && window.__GAME && window.__GAME.aiScale) final*=window.__GAME.aiScale.damage;
    target.hp=Math.max(0,target.hp-final);
    target.invuln=opts.invuln??.08;
    target.stagger=Math.max(target.stagger||0,opts.stagger||0);
    if(opts.knockback){
      target.velocity.add(opts.knockback);
    }
    Effects.flash(target.type==='gojo'?'#6e8cff':'#ff335d');
    if(target.hp<=0){target.hp=0;target.dead=true;}
    return true;
  }
  function updateProjectiles(game,dt){
    for(let i=game.projectiles.length-1;i>=0;i--){
      const p=game.projectiles[i];p.life-=dt;p.mesh.position.addScaledVector(p.velocity,dt);
      const target=p.target;
      if(target && !target.dead && p.mesh.position.distanceTo(target.group.position.clone().add(new THREE.Vector3(0,1,0)))<p.hitRadius){
        p.onHit(target);game.scene.remove(p.mesh);game.projectiles.splice(i,1);continue;
      }
      if(p.life<=0 || Math.abs(p.mesh.position.x)>60 || Math.abs(p.mesh.position.z)>60 || p.mesh.position.y<-.5 || p.mesh.position.y>30){
        game.scene.remove(p.mesh);game.projectiles.splice(i,1);
      }
    }
  }
  return {rayFromCamera,aimPoint,aimDirection,targetInCrosshair,damage,updateProjectiles};
})();
