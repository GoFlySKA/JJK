window.Effects = (() => {
  const particles=[], shockwaves=[];
  function mat(color, opacity=1, additive=true){return new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending,depthWrite:false});}
  function burst(scene,pos,color,count=22,speed=8,size=.08){
    for(let i=0;i<count;i++){
      const m=new THREE.Mesh(new THREE.SphereGeometry(size*(.6+Math.random()),5,5),mat(color,.9));
      m.position.copy(pos); scene.add(m);
      const v=new THREE.Vector3((Math.random()-.5),(Math.random()-.35),(Math.random()-.5)).normalize().multiplyScalar(speed*(.5+Math.random()));
      particles.push({m,v,life:.35+Math.random()*.5,max:.85});
    }
  }
  function ring(scene,pos,color,size=2,duration=.45){
    const g=new THREE.RingGeometry(.2,size,48); const m=new THREE.Mesh(g,mat(color,.7));
    m.rotation.x=-Math.PI/2;m.position.copy(pos);scene.add(m);shockwaves.push({m,life:duration,max:duration});
  }
  function aura(scene,target,color,scale=1){
    const g=new THREE.SphereGeometry(1.3,20,14),m=mat(color,.12);
    const s=new THREE.Mesh(g,m);s.scale.setScalar(scale);target.add(s);return s;
  }
  function projectile(scene,pos,dir,color,size=.3,trailColor=color){
    const g=new THREE.SphereGeometry(size,12,8),m=mat(color,1),o=new THREE.Mesh(g,m);o.position.copy(pos);scene.add(o);
    const trail=new THREE.Mesh(new THREE.ConeGeometry(size*.45,size*2.5,8),mat(trailColor,.55));
    trail.rotation.x=Math.PI/2;trail.position.z=-size*1.2;o.add(trail);
    return o;
  }
  function beam(scene,start,end,color,width=.4){
    const d=end.clone().sub(start),len=d.length(),g=new THREE.CylinderGeometry(width,width,len,12),m=mat(color,.8),o=new THREE.Mesh(g,m);
    o.position.copy(start).add(end).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());scene.add(o);
    return o;
  }
  function update(dt){
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.m.position.addScaledVector(p.v,dt);p.v.multiplyScalar(Math.max(0,1-dt*2));p.m.scale.setScalar(Math.max(.05,p.life/p.max));if(p.life<=0){p.m.parent.remove(p.m);particles.splice(i,1);}}
    for(let i=shockwaves.length-1;i>=0;i--){const s=shockwaves[i];s.life-=dt;s.m.scale.multiplyScalar(1+dt*5);s.m.material.opacity=Math.max(0,s.life/s.max);if(s.life<=0){s.m.parent.remove(s.m);shockwaves.splice(i,1);}}
  }
  function flash(color='#ffffff',duration=.12){const el=document.getElementById('damageFlash');el.style.background=color;el.style.opacity=.18;setTimeout(()=>el.style.opacity=0,duration*1000);}
  return {burst,ring,aura,projectile,beam,update,flash};
})();
