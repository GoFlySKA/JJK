window.Arena = (() => {
  function build(scene){
    scene.background=new THREE.Color(0x070611);
    scene.fog=new THREE.FogExp2(0x090716,.012);
    const hemi=new THREE.HemisphereLight(0x9a8cff,0x120d18,1.3);scene.add(hemi);
    const moon=new THREE.DirectionalLight(0xb9b7ff,2.1);moon.position.set(-30,45,20);moon.castShadow=true;
    moon.shadow.mapSize.set(1024,1024);moon.shadow.camera.left=-45;moon.shadow.camera.right=45;moon.shadow.camera.top=45;moon.shadow.camera.bottom=-45;scene.add(moon);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0x17151e,roughness:.94,metalness:.05}));
    ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
    const grid=new THREE.GridHelper(100,50,0x3b3151,0x201b2c);grid.position.y=.015;grid.material.transparent=true;grid.material.opacity=.23;scene.add(grid);

    const colliders=[];
    const box=(x,y,z,w,h,d,c=0x24212b,rot=0)=>{
      const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:c,roughness:.9}));
      m.position.set(x,y+h/2,z);m.rotation.y=rot;m.castShadow=m.receiveShadow=true;scene.add(m);
      colliders.push({x,z,w,d,rot});
      return m;
    };
    // Ruined city / temple silhouette.
    for(let i=0;i<22;i++){
      const side=i%4, a=-42+Math.random()*84, h=4+Math.random()*14, w=3+Math.random()*8;
      if(side===0) box(a,0,-35,w,h,4,0x211e2a,Math.random()*.3);
      if(side===1) box(a,0,35,w,h,4,0x211e2a,Math.random()*.3);
      if(side===2) box(-35,0,a,4,h,w,0x211e2a,Math.random()*.3);
      if(side===3) box(35,0,a,4,h,w,0x211e2a,Math.random()*.3);
    }
    for(let i=0;i<30;i++){
      const x=(Math.random()-.5)*70,z=(Math.random()-.5)*70;
      if(Math.hypot(x,z)<10)continue;
      const s=.3+Math.random()*1.3;
      const m=new THREE.Mesh(new THREE.BoxGeometry(s*2,s*.6,s),new THREE.MeshStandardMaterial({color:0x302c39,roughness:1}));
      m.position.set(x,s*.3,z);m.rotation.set(Math.random(),Math.random(),Math.random());m.castShadow=true;scene.add(m);
    }
    // Central broken pillars.
    for(const p of [[-8,0,-10],[9,0,-9],[-12,0,12],[12,0,11]]){
      box(p[0],0,p[2],2.2,4+Math.random()*4,2.2,0x2c2635);
    }
    const boundary=45;
    return {colliders,boundary};
  }
  function resolve(pos,r,boundary){
    pos.x=Math.max(-boundary+r,Math.min(boundary-r,pos.x));pos.z=Math.max(-boundary+r,Math.min(boundary-r,pos.z));
  }
  function collide(pos,r,colliders){
    for(const c of colliders){
      // Approximate rotated boxes with radius; cheap and robust for gameplay.
      const cx=c.x,cz=c.z, rr=Math.max(c.w,c.d)*.52+r;
      const dx=pos.x-cx,dz=pos.z-cz,dist=Math.hypot(dx,dz);
      if(dist<rr && dist>.001){pos.x=cx+dx/dist*rr;pos.z=cz+dz/dist*rr;}
    }
  }
  return {build,resolve,collide};
})();
