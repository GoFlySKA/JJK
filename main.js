(() => {
"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const menu = document.getElementById("menu");
const hud = document.getElementById("hud");
const mobile = document.getElementById("mobile");
const endScreen = document.getElementById("endScreen");
const endTitle = document.getElementById("endTitle");
const endText = document.getElementById("endText");
const errorBox = document.getElementById("error");
const msg = document.getElementById("message");
const stateEl = document.getElementById("state");

let W = 0;
let H = 0;
let dpr = 1;

let running = false;
let paused = false;
let last = 0;
let shake = 0;

let difficulty = "normal";
let game = null;

const keys = new Set();
const just = new Set();

const mouse = {
  x: 0,
  y: 0,
  down: false
};

const touch = {
  moveX: 0,
  moveY: 0,
  lookId: null,
  lastX: 0,
  lastY: 0,
  stickId: null
};

const TAU = Math.PI * 2;


// ============================================================
// BASIC UTILITIES
// ============================================================

const clamp = (v, a, b) =>
  Math.max(a, Math.min(b, v));

const dist = (a, b) =>
  Math.hypot(a.x - b.x, a.y - b.y);

const norm = (x, y) => {
  const l = Math.hypot(x, y) || 1;

  return {
    x: x / l,
    y: y / l
  };
};

const ang = (a, b) =>
  Math.atan2(b.y - a.y, b.x - a.x);


// ============================================================
// RESIZE
// ============================================================

function resize() {

  dpr = Math.min(devicePixelRatio || 1, 2);

  W = innerWidth;
  H = innerHeight;

  canvas.width = W * dpr;
  canvas.height = H * dpr;

  canvas.style.width = W + "px";
  canvas.style.height = H + "px";

  ctx.setTransform(
    dpr,
    0,
    0,
    dpr,
    0,
    0
  );
}

addEventListener("resize", resize);

resize();


// ============================================================
// KEYBOARD INPUT
// ============================================================

function press(k) {

  k = k.toUpperCase();

  if (!keys.has(k)) {
    just.add(k);
  }

  keys.add(k);
}

function release(k) {

  keys.delete(k);
}

addEventListener("keydown", e => {

  if (
    ["INPUT", "TEXTAREA", "BUTTON"]
      .includes(e.target.tagName)
  ) {
    return;
  }

  const k =
    e.key === " "
      ? "SPACE"
      : e.key.toUpperCase();

  press(k);

  if (
    [
      "SPACE",
      "SHIFT",
      "Q",
      "E",
      "R",
      "F",
      "X",
      "C",
      "V"
    ].includes(k)
  ) {
    e.preventDefault();
  }
});

addEventListener("keyup", e => {

  release(
    e.key === " "
      ? "SPACE"
      : e.key.toUpperCase()
  );

});


// ============================================================
// MOUSE
// ============================================================

canvas.addEventListener("mousemove", e => {

  mouse.x = e.clientX;
  mouse.y = e.clientY;

});

canvas.addEventListener("mousedown", e => {

  if (e.button === 0) {
    mouse.down = true;
  }

});

addEventListener("mouseup", e => {

  if (e.button === 0) {
    mouse.down = false;
  }

});

canvas.addEventListener(
  "contextmenu",
  e => e.preventDefault()
);


// ============================================================
// MOBILE BUTTONS
// ============================================================

function bindHold(el, key) {

  el.addEventListener(
    "pointerdown",
    e => {

      e.preventDefault();

      press(key);

      if (el.setPointerCapture) {
        el.setPointerCapture(e.pointerId);
      }

    }
  );

  el.addEventListener(
    "pointerup",
    e => {

      e.preventDefault();

      release(key);

    }
  );

  el.addEventListener(
    "pointercancel",
    () => release(key)
  );
}


document
  .querySelectorAll("[data-key]")
  .forEach(button => {

    const key = button.dataset.key;

    /*
      R is held while charging Hollow Purple.
    */

    if (key === "R") {

      bindHold(button, key);

    } else {

      button.addEventListener(
        "pointerdown",
        e => {

          e.preventDefault();

          press(key);

          setTimeout(
            () => release(key),
            45
          );

        }
      );

    }

  });


// ============================================================
// MOBILE JOYSTICK
// ============================================================

const stickBase =
  document.getElementById("stickBase");

const stick =
  document.getElementById("stick");


stickBase.addEventListener(
  "pointerdown",
  e => {

    touch.stickId = e.pointerId;

    stickBase.setPointerCapture(
      e.pointerId
    );

    moveStick(e);

  }
);


stickBase.addEventListener(
  "pointermove",
  e => {

    if (
      e.pointerId === touch.stickId
    ) {
      moveStick(e);
    }

  }
);


stickBase.addEventListener(
  "pointerup",
  resetStick
);

stickBase.addEventListener(
  "pointercancel",
  resetStick
);


function moveStick(e) {

  const r =
    stickBase.getBoundingClientRect();

  const cx =
    r.left + r.width / 2;

  const cy =
    r.top + r.height / 2;

  let x =
    e.clientX - cx;

  let y =
    e.clientY - cy;

  const m =
    Math.min(
      44,
      Math.hypot(x, y)
    );

  const n =
    norm(x, y);

  touch.moveX =
    n.x * (m / 44);

  touch.moveY =
    n.y * (m / 44);

  stick.style.transform =
    `translate(${n.x * m}px,${n.y * m}px)`;
}


function resetStick() {

  touch.stickId = null;

  touch.moveX = 0;
  touch.moveY = 0;

  stick.style.transform = "";

}


// ============================================================
// MOBILE AIM
// ============================================================

canvas.addEventListener(
  "pointerdown",
  e => {

    if (
      e.pointerType !== "mouse" &&
      e.clientX > W * 0.45
    ) {

      touch.lookId = e.pointerId;

      touch.lastX = e.clientX;
      touch.lastY = e.clientY;

      canvas.setPointerCapture(
        e.pointerId
      );

    }

  }
);


canvas.addEventListener(
  "pointermove",
  e => {

    if (
      e.pointerId === touch.lookId
    ) {

      const dx =
        e.clientX - touch.lastX;

      const dy =
        e.clientY - touch.lastY;

      touch.lastX = e.clientX;
      touch.lastY = e.clientY;

      if (game) {

        game.player.aim +=
          dx * 0.012;

      }

    }

  }
);


canvas.addEventListener(
  "pointerup",
  e => {

    if (
      e.pointerId === touch.lookId
    ) {

      touch.lookId = null;

    }

  }
);


// ============================================================
// DIFFICULTY
// ============================================================

const DIFF = {

  easy: {
    enemyHp: 105,
    enemyDamage: 0.72,
    enemySpeed: 0.92,
    think: 0.38
  },

  normal: {
    enemyHp: 125,
    enemyDamage: 1,
    enemySpeed: 1,
    think: 0.27
  },

  hard: {
    enemyHp: 145,
    enemyDamage: 1.28,
    enemySpeed: 1.1,
    think: 0.18
  }

};


// ============================================================
// REGENERATION SETTINGS
// ============================================================

/*
  Both characters can regenerate HP.

  HP regeneration:
      3 HP per second

  Cursed energy cost:
      7 CE per second
*/

const REGEN_HP_PER_SEC = 3;
const REGEN_ENERGY_PER_SEC = 7;


// ============================================================
// CREATE / RESET GAME
// ============================================================

function resetGame() {

  const d = DIFF[difficulty];

  game = {

    t: 0,

    world: {
      w: 2400,
      h: 1500
    },


    // ========================================================
    // GOJO
    // ========================================================

    player: {

      x: 650,
      y: 750,

      r: 28,

      hp: 100,
      maxHp: 100,

      energy: 100,
      maxEnergy: 100,

      aim: 0,

      speed: 245,

      inv: 0,
      dodge: 0,

      infinity: false,

      six: false,
      sixTime: 0,

      purple: 0,

      stagger: 0,

      regenActive: false,

      cool: {
        blue: 0,
        red: 0,
        tp: 0,
        six: 0,
        void: 0
      },

      attackCd: 0

    },


    // ========================================================
    // SUKUNA
    // ========================================================

    enemy: {

      x: 1750,
      y: 750,

      r: 31,

      hp: d.enemyHp,
      maxHp: d.enemyHp,

      energy: 100,
      maxEnergy: 100,

      aim: Math.PI,

      inv: 0,

      stagger: 0,

      state: "APPROACH",

      think: 0,

      attackCd: 0,

      regenActive: false,

      cool: {
        slash: 0,
        cleave: 0,
        ult: 0
      },

      strafe: 1,

      retreat: 0

    },


    projectiles: [],

    particles: [],

    rings: [],

    obstacles: makeArena(),

    difficulty: d

  };

  centerCamera();

  msg.textContent = "";

}


// ============================================================
// ARENA
// ============================================================

function makeArena() {

  const o = [];

  for (let i = 0; i < 22; i++) {

    const x =
      250 + (i * 331) % 1900;

    const y =
      160 + (i * 227) % 1180;

    if (
      Math.hypot(
        x - 650,
        y - 750
      ) < 250
    ) {
      continue;
    }

    if (
      Math.hypot(
        x - 1750,
        y - 750
      ) < 250
    ) {
      continue;
    }

    o.push({

      x,
      y,

      w: 55 + (i % 3) * 25,

      h: 55 + (i % 4) * 18

    });

  }

  return o;

}


// ============================================================
// CAMERA
// ============================================================

let cam = {
  x: 650,
  y: 750
};


function centerCamera() {

  cam.x = game.player.x;
  cam.y = game.player.y;

}


function worldToScreen(x, y) {

  return {

    x: x - cam.x + W / 2,

    y: y - cam.y + H / 2

  };

}


function screenToWorld(x, y) {

  return {

    x: x + cam.x - W / 2,

    y: y + cam.y - H / 2

  };

}


// ============================================================
// COLLISION
// ============================================================

function circleRectHit(x, y, r, o) {

  const qx =
    clamp(
      x,
      o.x - o.w / 2,
      o.x + o.w / 2
    );

  const qy =
    clamp(
      y,
      o.y - o.h / 2,
      o.y + o.h / 2
    );

  return (
    Math.hypot(
      x - qx,
      y - qy
    ) < r
  );

}


function resolve(p) {

  p.x =
    clamp(
      p.x,
      p.r,
      game.world.w - p.r
    );

  p.y =
    clamp(
      p.y,
      p.r,
      game.world.h - p.r
    );


  for (const o of game.obstacles) {

    if (
      circleRectHit(
        p.x,
        p.y,
        p.r,
        o
      )
    ) {

      const dx =
        p.x - o.x;

      const dy =
        p.y - o.y;

      if (
        Math.abs(dx / o.w) >
        Math.abs(dy / o.h)
      ) {

        p.x =
          o.x +
          Math.sign(dx) *
          (o.w / 2 + p.r);

      } else {

        p.y =
          o.y +
          Math.sign(dy) *
          (o.h / 2 + p.r);

      }

    }

  }

}


// ============================================================
// PARTICLE EFFECTS
// ============================================================

function burst(
  x,
  y,
  color,
  n = 14,
  pow = 130
) {

  for (let i = 0; i < n; i++) {

    const a =
      Math.random() * TAU;

    const s =
      pow *
      (
        0.35 +
        Math.random()
      );

    game.particles.push({

      x,
      y,

      vx:
        Math.cos(a) * s,

      vy:
        Math.sin(a) * s,

      life:
        0.45 +
        0.5 * Math.random(),

      max: 1,

      color,

      size:
        2 +
        Math.random() * 4

    });

  }

}


function ring(
  x,
  y,
  color,
  r = 20
) {

  game.rings.push({

    x,
    y,

    r,

    life: 0.5,

    color

  });

}


// ============================================================
// DAMAGE
// ============================================================

function damage(
  target,
  amount,
  source,
  knock = 0
) {

  if (target.inv > 0) {
    return false;
  }

  let dmg = amount;


  // Gojo's Infinity
  if (
    target === game.player &&
    game.player.infinity
  ) {

    dmg *= 0.22;

  }


  // Difficulty damage multiplier
  if (target === game.player) {

    dmg *=
      game.difficulty.enemyDamage;

  }


  target.hp =
    Math.max(
      0,
      target.hp - dmg
    );


  target.stagger =
    Math.max(
      target.stagger,
      0.12
    );


  if (knock) {

    const a =
      source
        ? ang(source, target)
        : 0;

    target.x +=
      Math.cos(a) * knock;

    target.y +=
      Math.sin(a) * knock;

    resolve(target);

  }


  burst(
    target.x,
    target.y,

    target === game.player
      ? "#a89aff"
      : "#e95b69",

    8,
    90
  );


  shake =
    Math.max(
      shake,
      4
    );


  return true;

}


// ============================================================
// PROJECTILES
// ============================================================

function fire(owner, type) {

  const p =
    owner === game.player
      ? game.player
      : game.enemy;

  const a = p.aim;


  const speed = {

    blue: 580,

    red: 690,

    purple: 820,

    slash: 620,

    cleave: 500,

    ult: 760

  }[type] || 600;


  /*
    GOJO IS 2× STRONGER

    Original:
      Blue = 20
      Red = 32
      Purple = 78

    New:
      Blue = 40
      Red = 64
      Purple = 156
  */

  const damageMap = {

    blue: 40,

    red: 64,

    purple: 156,

    // Sukuna unchanged
    slash: 13,

    cleave: 28,

    ult: 50

  };


  game.projectiles.push({

    owner,

    type,

    x:
      p.x +
      Math.cos(a) *
      (p.r + 12),

    y:
      p.y +
      Math.sin(a) *
      (p.r + 12),

    vx:
      Math.cos(a) *
      speed,

    vy:
      Math.sin(a) *
      speed,

    r:
      type === "purple"
        ? 18
        : 10,

    life: 2.5,

    damage:
      damageMap[type] || 15

  });


  burst(

    p.x +
      Math.cos(a) * 35,

    p.y +
      Math.sin(a) * 35,

    type === "blue"
      ? "#65d9ff"

      : type === "red" ||
        type === "ult" ||
        type === "cleave"

        ? "#ff4d67"

        : "#c18cff",

    7,

    110

  );

}


// ============================================================
// PROJECTILE UPDATE
// ============================================================

function projectileUpdate(dt) {

  for (
    let i = game.projectiles.length - 1;
    i >= 0;
    i--
  ) {

    const p =
      game.projectiles[i];


    p.x += p.vx * dt;
    p.y += p.vy * dt;

    p.life -= dt;


    const target =
      p.owner === game.player
        ? game.enemy
        : game.player;


    if (
      p.life <= 0 ||

      p.x < 0 ||

      p.y < 0 ||

      p.x > game.world.w ||

      p.y > game.world.h
    ) {

      game.projectiles.splice(i, 1);

      continue;

    }


    if (
      dist(p, target) <
      p.r + target.r
    ) {

      if (p.type === "blue") {

        damage(
          target,
          p.damage,
          p,
          55
        );

        const a =
          ang(target, p);

        target.x +=
          Math.cos(a) * -90;

        target.y +=
          Math.sin(a) * -90;

        resolve(target);

      }

      else if (p.type === "red") {

        damage(
          target,
          p.damage,
          p,
          125
        );

      }

      else if (p.type === "purple") {

        damage(
          target,
          p.damage,
          p,
          180
        );

        ring(
          p.x,
          p.y,
          "#d6a0ff",
          20
        );

        ring(
          p.x,
          p.y,
          "#73caff",
          40
        );

      }

      else if (p.type === "ult") {

        damage(
          target,
          p.damage,
          p,
          145
        );

      }

      else {

        damage(
          target,
          p.damage,
          p,
          p.type === "cleave"
            ? 70
            : 45
        );

      }


      game.projectiles.splice(i, 1);

    }

  }

}


// ============================================================
// REGENERATION
// ============================================================

function regenerateFighter(
  fighter,
  dt
) {

  fighter.regenActive = false;


  // Already full HP
  if (
    fighter.hp >=
    fighter.maxHp
  ) {

    return;

  }


  // Not enough cursed energy
  if (
    fighter.energy <
    REGEN_ENERGY_PER_SEC * dt
  ) {

    return;

  }


  /*
    Restore 3 HP/sec.

    Cost 7 CE/sec.

    This means:

      1 HP = 7/3 CE

    The function handles partial frames
    automatically.
  */

  const restoredHP =
    Math.min(
      REGEN_HP_PER_SEC * dt,

      fighter.maxHp -
      fighter.hp
    );


  const energyCost =
    restoredHP *
    (
      REGEN_ENERGY_PER_SEC /
      REGEN_HP_PER_SEC
    );


  fighter.hp +=
    restoredHP;

  fighter.energy -=
    energyCost;


  fighter.energy =
    Math.max(
      0,
      fighter.energy
    );


  fighter.regenActive =
    restoredHP > 0;

}


// ============================================================
// GOJO UPDATE
// ============================================================

function playerUpdate(dt) {

  const p =
    game.player;


  p.inv =
    Math.max(
      0,
      p.inv - dt
    );


  p.stagger =
    Math.max(
      0,
      p.stagger - dt
    );


  for (
    const k in p.cool
  ) {

    p.cool[k] =
      Math.max(
        0,
        p.cool[k] - dt
      );

  }


  p.attackCd =
    Math.max(
      0,
      p.attackCd - dt
    );


  // Six Eyes timer
  if (p.sixTime > 0) {

    p.sixTime -= dt;


    if (
      p.sixTime <= 0
    ) {

      p.six = false;

    }

  }


  // Infinity energy drain
  if (p.infinity) {

    p.energy -=
      4 * dt;


    if (
      p.energy <= 0
    ) {

      p.energy = 0;

      p.infinity = false;

    }

  }


  // Normal cursed energy regeneration
  p.energy =
    Math.min(
      p.maxEnergy,

      p.energy +
      (p.six ? 13 : 7) * dt
    );


  // HP regeneration
  regenerateFighter(
    p,
    dt
  );


  // ==========================================================
  // MOVEMENT
  // ==========================================================

  let mx = touch.moveX;
  let my = touch.moveY;


  if (keys.has("W")) {
    my -= 1;
  }

  if (keys.has("S")) {
    my += 1;
  }

  if (keys.has("A")) {
    mx -= 1;
  }

  if (keys.has("D")) {
    mx += 1;
  }


  const n =
    norm(mx, my);


  const sprint =
    keys.has("SHIFT");


  const speed =
    p.speed *
    (
      sprint
        ? 1.55
        : 1
    );


  if (
    p.stagger <= 0 &&
    Math.hypot(mx, my) > 0.08
  ) {

    p.x +=
      n.x *
      speed *
      dt;

    p.y +=
      n.y *
      speed *
      dt;

  }


  resolve(p);


  // ==========================================================
  // AIM
  // ==========================================================

  if (
    mouse.x ||
    mouse.y
  ) {

    const q =
      screenToWorld(
        mouse.x,
        mouse.y
      );

    p.aim =
      ang(p, q);

  }


  // ==========================================================
  // DODGE
  // ==========================================================

  if (
    just.has("SPACE")
  ) {

    p.inv = 0.32;

    p.dodge = 0.32;


    const a =
      p.aim;


    p.x +=
      Math.cos(a) * 95;

    p.y +=
      Math.sin(a) * 95;


    resolve(p);


    burst(
      p.x,
      p.y,
      "#ffffff",
      12,
      130
    );

  }


  p.dodge =
    Math.max(
      0,
      p.dodge - dt
    );


  // ==========================================================
  // BASIC ATTACK
  // ==========================================================

  if (
    mouse.down &&
    p.attackCd <= 0
  ) {

    basicAttack();

    p.attackCd = 0.22;

  }


  // ==========================================================
  // BLUE
  // ==========================================================

  if (
    just.has("Q")
  ) {

    blue();

  }


  // ==========================================================
  // RED
  // ==========================================================

  if (
    just.has("E")
  ) {

    red();

  }


  // ==========================================================
  // HOLLOW PURPLE
  // ==========================================================

  if (
    just.has("R")
  ) {

    p.purple = 0.001;

  }


  if (
    keys.has("R") &&
    p.purple > 0
  ) {

    p.purple =
      Math.min(
        1,
        p.purple +
        dt / 1.25
      );

  }


  if (
    !keys.has("R") &&
    p.purple > 0
  ) {

    if (
      p.purple > 0.55 &&
      p.energy >= 65
    ) {

      p.energy -= 65;

      fire(
        game.player,
        "purple"
      );

    }

    p.purple = 0;

  }


  // ==========================================================
  // TELEPORT
  // ==========================================================

  if (
    just.has("F")
  ) {

    teleport();

  }


  // ==========================================================
  // SIX EYES
  // ==========================================================

  if (
    just.has("X")
  ) {

    sixEyes();

  }


  // ==========================================================
  // INFINITY
  // ==========================================================

  if (
    just.has("C")
  ) {

    p.infinity =
      !p.infinity;

  }


  // ==========================================================
  // UNLIMITED VOID
  // ==========================================================

  if (
    just.has("V")
  ) {

    voidDomain();

  }

}


// ============================================================
// TARGET AIMING
// ============================================================

function targetAim(
  maxRange = 850
) {

  const p =
    game.player;

  const e =
    game.enemy;


  const a =
    p.aim;


  const dx =
    e.x - p.x;

  const dy =
    e.y - p.y;


  const d =
    Math.hypot(
      dx,
      dy
    );


  if (
    d > maxRange
  ) {

    return false;

  }


  let diff =
    Math.atan2(
      Math.sin(
        Math.atan2(dy, dx) - a
      ),
      Math.cos(
        Math.atan2(dy, dx) - a
      )
    );


  return (
    Math.abs(diff) < 0.16
  );

}


// ============================================================
// BASIC ATTACK
// ============================================================

function basicAttack() {

  if (
    targetAim(520)
  ) {

    /*
      GOJO BASIC ATTACK

      Original = 8
      New = 16
    */

    damage(
      game.enemy,
      16,
      game.player,
      35
    );

  }


  burst(

    game.player.x +
      Math.cos(
        game.player.aim
      ) * 45,

    game.player.y +
      Math.sin(
        game.player.aim
      ) * 45,

    "#d7d0ff",

    5,

    100

  );

}


// ============================================================
// BLUE
// ============================================================

function blue() {

  const p =
    game.player;


  if (
    p.cool.blue ||
    p.energy < 18
  ) {

    return;

  }


  p.energy -= 18;

  p.cool.blue = 4;


  fire(
    p,
    "blue"
  );

}


// ============================================================
// RED
// ============================================================

function red() {

  const p =
    game.player;


  if (
    p.cool.red ||
    p.energy < 24
  ) {

    return;

  }


  p.energy -= 24;

  p.cool.red = 6;


  fire(
    p,
    "red"
  );

}


// ============================================================
// TELEPORT
// ============================================================

function teleport() {

  const p =
    game.player;


  if (
    p.cool.tp ||
    p.energy < 12
  ) {

    return;

  }


  p.energy -= 12;

  p.cool.tp = 5;

  p.inv = 0.5;


  p.x +=
    Math.cos(p.aim) *
    240;

  p.y +=
    Math.sin(p.aim) *
    240;


  resolve(p);


  ring(
    p.x,
    p.y,
    "#b7a3ff",
    20
  );

}


// ============================================================
// SIX EYES
// ============================================================

function sixEyes() {

  const p =
    game.player;


  if (
    p.cool.six ||
    p.energy < 8
  ) {

    return;

  }


  p.energy -= 8;

  p.cool.six = 12;

  p.six = true;

  p.sixTime = 7;

}


// ============================================================
// UNLIMITED VOID
// ============================================================

function voidDomain() {

  const p =
    game.player;


  if (
    p.cool.void ||
    p.energy < 80 ||
    dist(
      p,
      game.enemy
    ) > 500
  ) {

    return;

  }


  p.energy -= 80;

  p.cool.void = 35;


  game.enemy.stagger = 4;


  ring(
    game.enemy.x,
    game.enemy.y,
    "#b898ff",
    30
  );


  for (
    let i = 0;
    i < 4;
    i++
  ) {

    ring(
      game.enemy.x,
      game.enemy.y,
      "#777cff",
      90 + i * 35
    );

  }


  burst(
    game.enemy.x,
    game.enemy.y,
    "#a889ff",
    70,
    240
  );

}


// ============================================================
// SUKUNA AI
// ============================================================

function enemyUpdate(dt) {

  const e =
    game.enemy;

  const p =
    game.player;


  const d =
    dist(e, p);

  const D =
    game.difficulty;


  e.inv =
    Math.max(
      0,
      e.inv - dt
    );


  e.stagger =
    Math.max(
      0,
      e.stagger - dt
    );


  e.attackCd =
    Math.max(
      0,
      e.attackCd - dt
    );


  for (
    const k in e.cool
  ) {

    e.cool[k] =
      Math.max(
        0,
        e.cool[k] - dt
      );

  }


  // Sukuna cursed-energy regeneration
  e.energy =
    Math.min(
      100,
      e.energy + 6 * dt
    );


  // Sukuna HP regeneration
  regenerateFighter(
    e,
    dt
  );


  e.think -= dt;


  e.aim =
    ang(e, p);


  if (
    e.stagger > 1
  ) {

    e.state = "RECOVER";

    return;

  }


  if (
    e.think > 0
  ) {

    enemyMove(dt);

    return;

  }


  e.think =
    D.think *
    (
      0.75 +
      Math.random() * 0.6
    );


  const hp =
    e.hp / e.maxHp;


  const threatened =
    p.purple > 0.2 ||
    targetAim(500);


  const infinity =
    p.infinity;


  const r =
    Math.random();


  // ==========================================================
  // AI STATE SELECTION
  // ==========================================================

  if (
    e.hp <
    e.maxHp * 0.24
  ) {

    e.state =
      "RETREAT";

  }

  else if (
    threatened &&
    r < 0.55
  ) {

    e.state =
      "DODGE";

  }

  else if (
    infinity &&
    d < 700 &&
    r < 0.5
  ) {

    e.state =
      "COUNTER";

  }

  else if (
    d < 150 &&
    e.attackCd <= 0
  ) {

    e.state =
      r < 0.25
        ? "PUNISH"
        : "ATTACK";

  }

  else if (
    d < 430
  ) {

    e.state =
      r < 0.35
        ? "STRAFE"
        : "ATTACK";

  }

  else if (
    d > 800
  ) {

    e.state =
      "APPROACH";

  }

  else if (
    e.energy > 70 &&
    e.cool.ult <= 0 &&
    r < 0.16
  ) {

    e.state =
      "ULTIMATE";

  }

  else if (
    r < 0.2
  ) {

    e.state =
      "DEFEND";

  }

  else {

    e.state =
      "STRAFE";

  }


  enemyMove(dt);

}


// ============================================================
// SUKUNA MOVEMENT
// ============================================================

function enemyMove(dt) {

  const e =
    game.enemy;

  const p =
    game.player;


  const d =
    dist(e, p);


  const a =
    ang(e, p);


  const D =
    game.difficulty;


  if (
    e.stagger > 0
  ) {

    return;

  }


  // ==========================================================
  // DODGE
  // ==========================================================

  if (
    e.state === "DODGE"
  ) {

    e.inv = 0.42;


    e.x +=
      Math.cos(
        a +
        Math.PI / 2 *
        e.strafe
      ) *
      230 *
      dt;


    e.y +=
      Math.sin(
        a +
        Math.PI / 2 *
        e.strafe
      ) *
      230 *
      dt;


    e.strafe *= -1;


    resolve(e);

    return;

  }


  // ==========================================================
  // RETREAT
  // ==========================================================

  if (
    e.state === "RETREAT"
  ) {

    e.x -=
      Math.cos(a) *
      170 *
      dt;

    e.y -=
      Math.sin(a) *
      170 *
      dt;


    resolve(e);


    if (
      d > 850
    ) {

      e.state =
        "RECOVER";

    }


    return;

  }


  // ==========================================================
  // APPROACH
  // ==========================================================

  if (
    e.state === "APPROACH"
  ) {

    e.x +=
      Math.cos(a) *
      D.enemySpeed *
      180 *
      dt;

    e.y +=
      Math.sin(a) *
      D.enemySpeed *
      180 *
      dt;

  }


  // ==========================================================
  // STRAFE
  // ==========================================================

  else if (
    e.state === "STRAFE"
  ) {

    e.x +=
      Math.cos(
        a +
        Math.PI / 2 *
        e.strafe
      ) *
      D.enemySpeed *
      125 *
      dt;


    e.y +=
      Math.sin(
        a +
        Math.PI / 2 *
        e.strafe
      ) *
      D.enemySpeed *
      125 *
      dt;

  }


  // ==========================================================
  // ATTACK / PUNISH
  // ==========================================================

  else if (
    e.state === "ATTACK" ||
    e.state === "PUNISH"
  ) {

    if (
      d > 130
    ) {

      e.x +=
        Math.cos(a) *
        D.enemySpeed *
        145 *
        dt;

      e.y +=
        Math.sin(a) *
        D.enemySpeed *
        145 *
        dt;

    }


    if (
      d < 175 &&
      e.attackCd <= 0
    ) {

      damage(
        p,
        12,
        e,
        45
      );

      e.attackCd =
        0.55;

    }


    if (
      d < 600 &&
      e.cool.cleave <= 0 &&
      e.energy >= 18
    ) {

      e.energy -= 18;

      e.cool.cleave = 4;

      fire(
        e,
        "cleave"
      );

    }

  }


  // ==========================================================
  // COUNTER
  // ==========================================================

  else if (
    e.state === "COUNTER"
  ) {

    if (
      d < 650 &&
      e.cool.slash <= 0
    ) {

      e.cool.slash = 3;

      fire(
        e,
        "slash"
      );

    }


    e.x +=
      Math.cos(a) *
      D.enemySpeed *
      70 *
      dt;

    e.y +=
      Math.sin(a) *
      D.enemySpeed *
      70 *
      dt;

  }


  // ==========================================================
  // ULTIMATE
  // ==========================================================

  else if (
    e.state === "ULTIMATE"
  ) {

    if (
      e.cool.ult <= 0 &&
      e.energy >= 55
    ) {

      e.energy -= 55;

      e.cool.ult = 15;

      fire(
        e,
        "ult"
      );

    }


    e.x +=
      Math.cos(
        a +
        Math.PI / 2
      ) *
      D.enemySpeed *
      70 *
      dt;

  }


  // ==========================================================
  // DEFEND
  // ==========================================================

  else if (
    e.state === "DEFEND"
  ) {

    e.inv = 0.08;

  }


  // ==========================================================
  // RECOVER
  // ==========================================================

  else if (
    e.state === "RECOVER"
  ) {

    e.x +=
      Math.cos(a) *
      D.enemySpeed *
      70 *
      dt;

  }


  resolve(e);

}


// ============================================================
// MAIN UPDATE
// ============================================================

function update(dt) {

  if (
    !game ||
    paused
  ) {

    return;

  }


  game.t += dt;


  playerUpdate(dt);

  enemyUpdate(dt);

  projectileUpdate(dt);


  // ==========================================================
  // PARTICLES
  // ==========================================================

  for (
    let i = game.particles.length - 1;
    i >= 0;
    i--
  ) {

    const q =
      game.particles[i];


    q.x +=
      q.vx * dt;

    q.y +=
      q.vy * dt;


    q.vx *= 0.96;
    q.vy *= 0.96;


    q.life -= dt;


    if (
      q.life <= 0
    ) {

      game.particles.splice(
        i,
        1
      );

    }

  }


  // ==========================================================
  // RINGS
  // ==========================================================

  for (
    let i = game.rings.length - 1;
    i >= 0;
    i--
  ) {

    const q =
      game.rings[i];


    q.r +=
      250 * dt;


    q.life -= dt;


    if (
      q.life <= 0
    ) {

      game.rings.splice(
        i,
        1
      );

    }

  }


  // ==========================================================
  // CAMERA
  // ==========================================================

  cam.x +=
    (
      game.player.x -
      cam.x
    ) *
    Math.min(
      1,
      dt * 5
    );


  cam.y +=
    (
      game.player.y -
      cam.y
    ) *
    Math.min(
      1,
      dt * 5
    );


  shake =
    Math.max(
      0,
      shake -
      dt * 16
    );


  // ==========================================================
  // END CHECK
  // ==========================================================

  if (
    game.player.hp <= 0 ||
    game.enemy.hp <= 0
  ) {

    finish();

  }


  updateHud();

}


// ============================================================
// DRAWING
// ============================================================

function draw() {

  ctx.clearRect(
    0,
    0,
    W,
    H
  );


  const sx =
    (
      Math.random() -
      0.5
    ) * shake;


  const sy =
    (
      Math.random() -
      0.5
    ) * shake;


  ctx.save();

  ctx.translate(
    sx,
    sy
  );


  drawWorld();

  drawEffects();

  drawFighter(
    game.enemy,
    "sukuna"
  );

  drawFighter(
    game.player,
    "gojo"
  );

  drawProjectiles();


  ctx.restore();


  // Hollow Purple screen effect
  if (
    game?.player.purple > 0
  ) {

    ctx.fillStyle =
      `rgba(185,135,255,${
        0.08 +
        game.player.purple *
        0.16
      })`;

    ctx.fillRect(
      0,
      0,
      W,
      H
    );

  }

}


// ============================================================
// WORLD
// ============================================================

function drawWorld() {

  ctx.fillStyle =
    "#0a0b13";

  ctx.fillRect(
    0,
    0,
    W,
    H
  );


  const grid = 80;


  ctx.strokeStyle =
    "rgba(120,110,150,.12)";

  ctx.lineWidth = 1;


  const startX =
    Math.floor(
      (
        cam.x -
        W / 2
      ) / grid
    ) * grid;


  const startY =
    Math.floor(
      (
        cam.y -
        H / 2
      ) / grid
    ) * grid;


  for (
    let x = startX;
    x <
      cam.x +
      W / 2 +
      grid;
    x += grid
  ) {

    const q =
      worldToScreen(
        x,
        0
      ).x;


    ctx.beginPath();

    ctx.moveTo(
      q,
      0
    );

    ctx.lineTo(
      q,
      H
    );

    ctx.stroke();

  }


  for (
    let y = startY;
    y <
      cam.y +
      H / 2 +
      grid;
    y += grid
  ) {

    const q =
      worldToScreen(
        0,
        y
      ).y;


    ctx.beginPath();

    ctx.moveTo(
      0,
      q
    );

    ctx.lineTo(
      W,
      q
    );

    ctx.stroke();

  }


  // Buildings / debris

  for (
    const o of game.obstacles
  ) {

    const q =
      worldToScreen(
        o.x,
        o.y
      );


    ctx.fillStyle =
      "#171827";


    ctx.fillRect(
      q.x - o.w / 2,
      q.y - o.h / 2,
      o.w,
      o.h
    );


    ctx.strokeStyle =
      "#35344a";


    ctx.strokeRect(
      q.x - o.w / 2,
      q.y - o.h / 2,
      o.w,
      o.h
    );

  }


  // Arena circle

  const a =
    worldToScreen(
      1200,
      750
    );


  ctx.strokeStyle =
    "rgba(157,126,255,.18)";

  ctx.lineWidth = 5;


  ctx.beginPath();

  ctx.arc(
    a.x,
    a.y,
    420,
    0,
    TAU
  );

  ctx.stroke();

}


// ============================================================
// CHARACTERS
// ============================================================

function drawFighter(
  p,
  type
) {

  const q =
    worldToScreen(
      p.x,
      p.y
    );


  const r =
    p.r;


  ctx.save();


  ctx.translate(
    q.x,
    q.y
  );


  ctx.rotate(
    p.aim
  );


  // Shadow

  ctx.fillStyle =
    "rgba(0,0,0,.35)";


  ctx.beginPath();

  ctx.ellipse(
    0,
    12,
    r * 1.3,
    r * 0.6,
    0,
    0,
    TAU
  );

  ctx.fill();


  // Body

  ctx.fillStyle =
    type === "gojo"
      ? "#171722"
      : "#21131a";


  ctx.beginPath();

  ctx.arc(
    0,
    0,
    r,
    0,
    TAU
  );

  ctx.fill();


  // Head

  ctx.fillStyle =
    type === "gojo"
      ? "#e9edf7"
      : "#4c111d";


  ctx.beginPath();

  ctx.arc(
    0,
    -r * 0.55,
    r * 0.55,
    0,
    TAU
  );

  ctx.fill();


  // Gojo hair

  if (
    type === "gojo"
  ) {

    ctx.fillStyle =
      "#f7f8ff";


    for (
      let i = 0;
      i < 5;
      i++
    ) {

      ctx.beginPath();

      ctx.moveTo(
        -12 + i * 6,
        -r * 0.65
      );

      ctx.lineTo(
        -18 + i * 7,
        -r * 1.25
      );

      ctx.lineTo(
        -4 + i * 6,
        -r * 0.82
      );

      ctx.fill();

    }

  }


  // Sukuna markings

  else {

    ctx.strokeStyle =
      "#ef4059";

    ctx.lineWidth = 3;


    ctx.beginPath();

    ctx.moveTo(
      -16,
      -14
    );

    ctx.lineTo(
      16,
      14
    );


    ctx.moveTo(
      16,
      -14
    );

    ctx.lineTo(
      -16,
      14
    );


    ctx.stroke();

  }


  // Direction / energy

  ctx.fillStyle =
    type === "gojo"
      ? "#8f7cff"
      : "#e04b61";


  ctx.fillRect(
    8,
    -4,
    18,
    8
  );


  // Invulnerability

  if (
    p.inv > 0
  ) {

    ctx.strokeStyle =
      "#ffffff";

    ctx.lineWidth = 3;


    ctx.beginPath();

    ctx.arc(
      0,
      0,
      r + 8,
      0,
      TAU
    );

    ctx.stroke();

  }


  // Infinity

  if (
    type === "gojo" &&
    p.infinity
  ) {

    ctx.strokeStyle =
      "rgba(90,190,255,.7)";

    ctx.lineWidth = 5;


    ctx.beginPath();

    ctx.arc(
      0,
      0,
      r + 13,
      0,
      TAU
    );

    ctx.stroke();

  }


  // Regeneration effect

  if (
    p.regenActive
  ) {

    ctx.strokeStyle =
      type === "gojo"
        ? "#6fe6ff"
        : "#ff5d75";

    ctx.lineWidth = 3;


    ctx.beginPath();

    ctx.arc(
      0,
      0,
      r + 18,
      0,
      TAU
    );

    ctx.stroke();

  }


  ctx.restore();

}


// ============================================================
// PROJECTILES DRAW
// ============================================================

function drawProjectiles() {

  for (
    const p of game.projectiles
  ) {

    const q =
      worldToScreen(
        p.x,
        p.y
      );


    const c =
      p.type === "blue"

        ? "#64d8ff"

        : p.type === "red" ||
          p.type === "ult" ||
          p.type === "cleave"

          ? "#ff4c66"

          : "#d09aff";


    ctx.fillStyle = c;

    ctx.shadowBlur = 20;

    ctx.shadowColor = c;


    ctx.beginPath();

    ctx.arc(
      q.x,
      q.y,
      p.r,
      0,
      TAU
    );

    ctx.fill();


    ctx.shadowBlur = 0;

  }

}


// ============================================================
// EFFECTS
// ============================================================

function drawEffects() {

  // Particles

  for (
    const q of game.particles
  ) {

    const s =
      worldToScreen(
        q.x,
        q.y
      );


    ctx.globalAlpha =
      clamp(
        q.life / q.max,
        0,
        1
      );


    ctx.fillStyle =
      q.color;


    ctx.beginPath();

    ctx.arc(
      s.x,
      s.y,
      q.size,
      0,
      TAU
    );

    ctx.fill();

  }


  ctx.globalAlpha = 1;


  // Rings

  for (
    const q of game.rings
  ) {

    const s =
      worldToScreen(
        q.x,
        q.y
      );


    ctx.globalAlpha =
      clamp(
        q.life / 0.5,
        0,
        1
      );


    ctx.strokeStyle =
      q.color;

    ctx.lineWidth = 4;


    ctx.beginPath();

    ctx.arc(
      s.x,
      s.y,
      q.r,
      0,
      TAU
    );

    ctx.stroke();

  }


  ctx.globalAlpha = 1;

}


// ============================================================
// HUD
// ============================================================

function updateHud() {

  const p =
    game.player;

  const e =
    game.enemy;


  document
    .getElementById("gojoHp")
    .style.width =
      (
        p.hp /
        p.maxHp *
        100
      ) + "%";


  document
    .getElementById("gojoEnergy")
    .style.width =
      (
        p.energy /
        p.maxEnergy *
        100
      ) + "%";


  document
    .getElementById("sukunaHp")
    .style.width =
      (
        e.hp /
        e.maxHp *
        100
      ) + "%";


  document
    .getElementById("sukunaEnergy")
    .style.width =
      (
        e.energy /
        e.maxEnergy *
        100
      ) + "%";


  stateEl.textContent =
    "SUKUNA: " +
    e.state;


  const labels = {

    Q: p.cool.blue,

    E: p.cool.red,

    F: p.cool.tp,

    X: p.cool.six,

    V: p.cool.void,

    C:
      p.infinity
        ? "ON"
        : "∞"

  };


  document
    .querySelectorAll(
      "#abilities button"
    )
    .forEach(b => {

      const k =
        b.dataset.key;


      if (
        labels[k] !== undefined
      ) {

        b.title =
          typeof labels[k] === "number" &&
          labels[k] > 0

            ? labels[k].toFixed(1) +
              "s"

            : String(
                labels[k]
              );

      }

    });


  // Message priority

  if (
    p.purple > 0
  ) {

    msg.textContent =
      "HOLLOW PURPLE — " +
      Math.round(
        p.purple * 100
      ) +
      "%";

  }

  else if (
    p.regenActive
  ) {

    msg.textContent =
      "REGENERATION — CURSED ENERGY";

  }

  else if (
    p.infinity
  ) {

    msg.textContent =
      "INFINITY ACTIVE";

  }

  else if (
    p.six
  ) {

    msg.textContent =
      "SIX EYES ACTIVE";

  }

  else {

    msg.textContent = "";

  }

}


// ============================================================
// VICTORY / DEFEAT
// ============================================================

function finish() {

  if (!running) {
    return;
  }


  running = false;


  const won =
    game.enemy.hp <= 0;


  endTitle.textContent =
    won
      ? "GOJO WINS"
      : "SUKUNA WINS";


  endTitle.style.fontSize =
    "clamp(42px,7vw,80px)";


  endTitle.style.fontWeight =
    "900";


  endText.textContent =
    won
      ? "The cursed-energy duel is over."
      : "Sukuna overcame the defense.";


  endScreen.classList.remove(
    "hidden"
  );

}


// ============================================================
// START GAME
// ============================================================

function start() {

  try {

    resetGame();

    running = true;

    paused = false;


    menu.classList.add(
      "hidden"
    );


    endScreen.classList.add(
      "hidden"
    );


    hud.classList.remove(
      "hidden"
    );


    mobile.classList.toggle(
      "hidden",
      innerWidth > 800
    );


    last =
      performance.now();


    requestAnimationFrame(
      loop
    );

  }

  catch (err) {

    errorBox.textContent =
      "Game startup failed: " +
      err.message;


    errorBox.classList.remove(
      "hidden"
    );

  }

}


// ============================================================
// GAME LOOP
// ============================================================

function loop(t) {

  if (!running) {
    return;
  }


  const dt =
    Math.min(
      0.033,
      (t - last) / 1000
    );


  last = t;


  update(dt);

  draw();


  just.clear();


  requestAnimationFrame(
    loop
  );

}


// ============================================================
// PAUSE
// ============================================================

function setPaused(v) {

  paused = v;


  document.body.classList.toggle(
    "paused",
    v
  );


  document.getElementById(
    "pauseBtn"
  ).textContent =
    v
      ? "▶"
      : "Ⅱ";

}


// ============================================================
// BUTTONS
// ============================================================

document
  .getElementById("startBtn")
  .addEventListener(
    "click",
    start
  );


document
  .getElementById("restartBtn")
  .addEventListener(
    "click",
    () => {

      endScreen.classList.add(
        "hidden"
      );

      start();

    }
  );


document
  .getElementById("pauseBtn")
  .addEventListener(
    "click",
    () => {

      setPaused(!paused);

    }
  );


document
  .getElementById("controlsBtn")
  .addEventListener(
    "click",
    () => {

      document
        .getElementById(
          "controlsPanel"
        )
        .classList.toggle(
          "hidden"
        );

    }
  );


document
  .querySelectorAll(
    "[data-difficulty]"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        difficulty =
          button.dataset.difficulty;


        document
          .querySelectorAll(
            "[data-difficulty]"
          )
          .forEach(x =>
            x.classList.remove(
              "selected"
            )
          );


        button.classList.add(
          "selected"
        );

      }
    );

  });


addEventListener(
  "keydown",
  e => {

    if (
      e.key === "Escape" &&
      running
    ) {

      setPaused(!paused);

    }

  }
);


// ============================================================
// GLOBAL ERROR DISPLAY
// ============================================================

window.addEventListener(
  "error",
  e => {

    if (!running) {

      errorBox.textContent =
        "Error: " +
        e.message;


      errorBox.classList.remove(
        "hidden"
      );

    }

  }
);

})();
