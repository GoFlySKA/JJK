window.GameCamera = (() => {
  function create(){
    const c=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.05,120);return {camera:c,yaw:0,pitch:-.12,distance:5.4,shake:0};
  }
  function update(game,dt){
    const c=game.cameraObj,p=game.player;
    const dx=Input.mouse.dx+Input.touch.lookDX,dy=Input.mouse.dy+Input.touch.lookDY;
    c.yaw-=dx*.0025;c.pitch-=dy*.0025;c.pitch=Math.max(-.9,Math.min(.35,c.pitch));
    const target=p.group.position.clone().add(new THREE.Vector3(0,1.55,0));
    const off=new THREE.Vector3(
      Math.sin(c.yaw)*Math.cos(c.pitch)*c.distance,
      -Math.sin(c.pitch)*c.distance+.7,
      Math.cos(c.yaw)*Math.cos(c.pitch)*c.distance
    );
    const desired=target.clone().add(off);
    // Cheap camera collision: keep camera above ground and inside arena.
    desired.y=Math.max(.6,desired.y);
    desired.x=Math.max(-47,Math.min(47,desired.x));desired.z=Math.max(-47,Math.min(47,desired.z));
    c.camera.position.lerp(desired,1-Math.pow(.0001,dt));
    c.camera.lookAt(target);
    if(c.shake>0){c.shake=Math.max(0,c.shake-dt);c.camera.position.x+=(Math.random()-.5)*c.shake;c.camera.position.y+=(Math.random()-.5)*c.shake;}
  }
  return {create,update};
})();
