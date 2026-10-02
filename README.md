# Gojo vs Sukuna — 2D

A complete static-browser 2D version of the Gojo vs Sukuna fan game.

## Why this version
This build uses the browser's native **Canvas 2D API** only. It has:
- no Three.js
- no WebGL
- no CDN
- no external libraries
- no server
- no API keys

That makes it suitable for GitHub Pages and offline use.

## Run
Open `index.html` directly in a browser, or upload the whole folder to a GitHub repository and enable GitHub Pages.

## Controls
Desktop:
- WASD — move
- Mouse — aim
- Left click — basic attack
- Q — Blue
- E — Red
- Hold R — charge Hollow Purple, release R to fire
- F — Teleport
- X — Six Eyes
- C — Infinity toggle
- V — Unlimited Void
- Space — dodge
- Shift — sprint
- Esc — pause

Mobile:
- Left joystick — move
- Drag on right side — aim
- On-screen buttons — abilities/dodge/sprint

## Gameplay
The player manually aims attacks. Projectiles travel through the arena and collide with characters. Sukuna has a state-based AI with approach, strafe, attack, dodge, defend, counter, punish, retreat, recover and ultimate behaviors.

The visual style is deliberately original and procedural rather than using ripped anime assets.
