window.Input = (() => {
  const keys = new Set();
  const justPressed = new Set();
  const mouse = {x:0,y:0,dx:0,dy:0,down:false};
  const touch = {moveX:0,moveY:0,lookDX:0,lookDY:0,attack:false,sprint:false};
  let locked = false;
  let joystickPointer = null, lookPointer = null, joyOrigin = {x:0,y:0};

  addEventListener('keydown', e => {
    const k=e.key.toLowerCase();
    if(!keys.has(k)) justPressed.add(k);
    keys.add(k);
    if([' ','shift','arrowup','arrowdown','arrowleft','arrowright'].includes(k)) e.preventDefault();
  });
  addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  addEventListener('mousedown', e => { if(e.button===0) mouse.down=true; });
  addEventListener('mouseup', e => { if(e.button===0) mouse.down=false; });
  addEventListener('mousemove', e => { if(document.pointerLockElement) {mouse.dx+=e.movementX; mouse.dy+=e.movementY;} });
  addEventListener('click', e => {
    if(e.target.closest('button')) return;
    if(!locked && innerWidth>800 && document.body.requestPointerLock) document.body.requestPointerLock().catch(()=>{});
  });
  document.addEventListener('pointerlockchange',()=>locked=document.pointerLockElement===document.body);

  const joy=document.getElementById('joystick'), stick=document.getElementById('stick'), look=document.getElementById('touchLook');
  if(joy){
    joy.addEventListener('pointerdown',e=>{joystickPointer=e.pointerId; joyOrigin={x:e.clientX,y:e.clientY}; joy.setPointerCapture(e.pointerId);});
    joy.addEventListener('pointermove',e=>{
      if(e.pointerId!==joystickPointer)return;
      let dx=e.clientX-joyOrigin.x,dy=e.clientY-joyOrigin.y, len=Math.hypot(dx,dy), max=48;
      if(len>max){dx=dx/len*max;dy=dy/len*max;}
      stick.style.transform=`translate(${dx}px,${dy}px)`;
      touch.moveX=dx/max; touch.moveY=dy/max;
    });
    const end=()=>{joystickPointer=null;touch.moveX=touch.moveY=0;stick.style.transform='translate(0,0)'};
    joy.addEventListener('pointerup',end); joy.addEventListener('pointercancel',end);
  }
  if(look){
    look.addEventListener('pointerdown',e=>{lookPointer=e.pointerId;look.setPointerCapture(e.pointerId);});
    look.addEventListener('pointermove',e=>{if(e.pointerId===lookPointer){touch.lookDX+=e.movementX||0;touch.lookDY+=e.movementY||0;}});
    const end=()=>lookPointer=null;
    look.addEventListener('pointerup',end);look.addEventListener('pointercancel',end);
  }
  document.querySelectorAll('[data-action]').forEach(btn=>{
    const act=btn.dataset.action;
    const down=e=>{e.preventDefault(); btn.classList.add('active'); if(act==='attack')touch.attack=true; if(act==='sprint')touch.sprint=true;};
    const up=e=>{e.preventDefault();btn.classList.remove('active');if(act==='attack')touch.attack=false;if(act==='sprint')touch.sprint=false;};
    btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);btn.addEventListener('pointercancel',up);
  });

  return {
    down:k=>keys.has(k), pressed:k=>justPressed.has(k),
    mouse, touch,
    consume(k){justPressed.delete(k)},
    press(k){justPressed.add(k);keys.add(k)},
    release(k){keys.delete(k)},
    frameReset(){mouse.dx=mouse.dy=touch.lookDX=touch.lookDY=0;justPressed.clear();}
  };
})();
