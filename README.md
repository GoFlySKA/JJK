# Gojo vs Sukuna — Static Three.js Browser Game

A small original 3D third-person arena fighter built with Three.js, vanilla JavaScript, HTML and CSS.

## Run

The project is designed for GitHub Pages and uses no server, database, API key, build step or backend.

You can upload the contents of this folder directly to a GitHub repository. GitHub Pages will serve `index.html`.

The Three.js library is loaded from jsDelivr:
`https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.min.js`

No anime/game models, logos, music or ripped assets are included. Characters, arena geometry, particles and sound effects are procedurally generated.

## Controls

Desktop:
- WASD — move
- Mouse — camera/aim
- Left click — basic attack
- Shift — sprint
- Space — dodge
- Q — Blue
- E — Red
- Hold R, then release R — Hollow Purple
- F — Teleport
- X — Six Eyes
- C — Infinity
- V — Unlimited Void
- Esc — pause

Mobile:
- Left virtual joystick — movement
- Drag the right side — camera aiming
- Touch buttons — attack, dodge, sprint and abilities

## GitHub Pages

1. Create a new GitHub repository.
2. Upload `index.html`, `style.css`, the `js/` folder, `assets/` folder and `README.md`.
3. Open repository **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select your main branch and `/ (root)`.
6. Save.
7. Open the Pages URL shown by GitHub.

All project-local paths are relative, so project-site URLs such as
`https://USERNAME.github.io/REPOSITORY/`
work correctly.

## Architecture

- `index.html` — page shell and script loading
- `style.css` — UI/HUD/mobile layout
- `js/input.js` — keyboard, mouse and touch input
- `js/effects.js` — particles, projectiles, shockwaves and flashes
- `js/arena.js` — procedural arena and collision boundaries
- `js/combat.js` — raycast aiming, damage and projectile collision
- `js/abilities.js` — Gojo techniques
- `js/player.js` — Gojo movement and attacks
- `js/sukunaAI.js` — state-machine opponent
- `js/camera.js` — third-person camera
- `js/main.js` — game loop, HUD and menus

## Replacing the procedural characters

The current characters deliberately use simple Three.js geometry so the game has no large asset dependency.

To add a properly licensed `.glb` later, use Three.js `GLTFLoader` from the same Three.js release, load a model from a relative path such as `assets/gojo.glb`, then attach the model to the character's `group`. Replace only the visual child meshes; keep the existing character object, position, velocity, HP and combat state.

Keep a text file or README section listing:
- asset name
- creator
- source URL
- license
- any required attribution

Do not use ripped anime/game models or assets without permission.

## Known limitations

- Camera collision is deliberately lightweight rather than a full physics engine.
- Arena structures use approximate circular collision volumes.
- Characters are procedural low-poly stand-ins, not animated character rigs.
- The AI uses a compact state machine and heuristics rather than a full navigation mesh/behavior tree.
- Effects are intentionally geometry/particle based to stay friendly to mobile browsers.
- The default CDN dependency requires an internet connection when the page first loads.
