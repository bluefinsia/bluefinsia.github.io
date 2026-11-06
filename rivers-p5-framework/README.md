# There Are Rivers in the Sky — open-world p5.js / WebXR framework

A playable **p5.js WEBGL open-world exploration** prototype of the supplied GDD: a researcher returns to a flooded, post-human Earth, follows **Đi Cấy**, resolves five artifacts in order, and discovers a hidden sanctuary. Explore a continuous 144×144 m palace garden with branching paths, shallow ponds, trees, ruins, lotus, cyanobacteria, rice plots and five separate landmark districts. Every location is reachable on foot; jumping is optional.

This version uses **JavaScript and p5.js**, not Unity or C#. It includes a working desktop game and an optional **native WebXR immersive-vr** path. p5 WEBGL alone is not VR: `webxr-bridge.js` explicitly creates a session, obtains floor/head/controller poses and renders separate eye views.

## Start the game

1. Download and extract the ZIP. Keep the entire extracted folder together, including `vendor`, `assets`, `js`, `index.html` and `styles.css`.
2. Open a terminal **inside that folder**. On Windows, open the folder in File Explorer, click its address bar, type `cmd`, and press Enter.
3. Start a local web server:

   ```sh
   py -m http.server 8000
   ```

   On macOS/Linux, use `python3 -m http.server 8000`. If Windows does not recognize `py`, install Python from python.org and reopen the terminal.
4. In your browser, enter `http://localhost:8000`, then choose **Follow the water**.

No npm install, build process, Unity Editor, external models or CDN connection is needed. The ZIP includes p5.js **1.11.3**, Noto Sans, and their licenses. JavaScript modules and font loading require HTTP/HTTPS, so use the server rather than opening `index.html` as a local file.

## Desktop controls

| Action | Control |
| --- | --- |
| Move relative to the camera | WASD / arrow keys |
| Optional jump, then one further air jump | Space |
| Rotate the third-person camera | Hold right mouse and drag |
| Interact with the next nearby artifact / sanctuary | E or the Interact button |
| Open/close field journal | J |
| Close a panel | Escape / Return to the river |
| Save an archived photograph | Click its image/link in the journal |

The follow camera has a slight positional delay (`0.17 s`). Movement stops while a choice/journal is open; gravity continues. Falling returns to the most recently resolved artifact's checkpoint and cancels pending choices. Progress and photographs last for the current page session. Begin again resets the chapter.

## VR controls and setup

Use a WebXR-capable browser, a connected headset/controllers, and a compatible active PC VR runtime. On Windows PC VR, this is typically a supported Chrome/Edge installation with SteamVR or Meta Quest Link configured for OpenXR. Device/browser support varies; the **Enter VR** button is enabled only when the browser reports immersive VR support.

WebXR requires a **secure context**: HTTPS, or localhost on the machine running the browser. A headset browser opening another computer's plain `http://192.168…` address is not localhost and generally does not qualify. For standalone headset browsing, host this folder on HTTPS. No site deployment has been performed by creating a Git branch.

Click **Enter VR** in the browser to request the session. Grant the browser's permission prompt. The game requests `local-floor` tracking. If immersive VR is unavailable, the full desktop game remains playable.

| Action | Typical xr-standard controller mapping |
| --- | --- |
| Move | Left stick |
| Snap turn 45° | Right stick left/right |
| Teleport anywhere on the garden ground | Aim left ray, press then release left trigger |
| Interact / choose a journal button | Aim right ray, press right trigger |
| Recall/close journal | Left primary face button, commonly X |
| Jump / double jump | Right primary face button, commonly A, when jumping is enabled |
| Enable VR jumping / exit session | In-headset journal buttons |

Artificial VR jumping defaults off and can be enabled in the journal or through the desktop checkbox before entering. The entire region can be explored by ordinary walking or teleportation. Controllers without these buttons/axes need a mapping adjustment in `webxr-bridge.js`.

**Head tracking has no camera-follow delay.** The delayed camera is desktop-only. Menus also render as a world-space p5 texture with ray-hit-tested buttons; the headset does not depend on DOM overlay support. The panel is positioned when opened and remains world anchored. Exit VR returns to the desktop loop.

## Separate source files

There are no Unity GameObjects to attach scripts to. `index.html` loads the bundled p5 library and the `main.js` ES module; imports wire the systems together.

| File | Responsibility / editing point |
| --- | --- |
| `index.html` | Canvas host, accessible desktop HUD, intro and journal controls. |
| `styles.css` | Desktop layout and bundled Vietnamese font. |
| `js/main.js` | p5 sketch setup/draw loop, input/action routing, physics/render coordination and mono photo capture. |
| `js/player-controller.js` | Feet-based movement, continuous-ground collision, world bounds, optional ground/air jump, checkpoints, respawn and room-scale offset handling. |
| `js/camera-follow.js` | Smooth desktop chase camera; never applied to a tracked head pose. |
| `js/world-generator.js` | Continuous ground, widely spaced landmark districts, branching paths, shallow ponds and seeded scenery. Change the seed here/in main. |
| `js/artifact-system.js` | Authoritative ordered progression, confirmation distance checks, choices and sanctuary unlocking. |
| `js/data.js` | Five artifact definitions, event dialogue, supplied Đi Cấy excerpts, colors and optional audio paths. |
| `js/scene-renderer.js` | Shared p5 geometry/artwork for desktop, both XR eyes and research photographs. |
| `js/game-ui.js` | HTML journal and p5 world-space VR panel, count/choices, photo links and controller-plane hit tests. |
| `js/song-player.js` | Optional recorded song clips through a user-unlocked Web Audio context. |
| `js/webxr-bridge.js` | Native session lifecycle, headset/controller input, calibrated floor tracking, stereo framebuffers and renderer restoration. |
| `js/math.js` | Small shared vector/math helpers. |
| `tests/simulation.test.js` | Physics, sequence and state tests using Node's built-in test runner. |
| `tests/webxr.test.js` | Mocked WebXR lifecycle, stereo-matrix and controller-edge checks. |

All world units are **meters, +Y up, forward −Z**. Player position represents feet. The garden spans X −72…72 and Z −112…32 with solid ground throughout; world bounds keep the physical VR footprint within the region. Paths suggest routes but you can walk across the grass, take shortcuts or wade through the shallow ornamental ponds. Scenery is a decorative blockout and has no separate tree/ruin collision. Movement speed is 4.6 m/s. Optional jumping retains a 1.6 m jump height, one air jump and gravity −16 m/s².

The open world contains separate districts rather than a prescribed movement route: the lotus pagoda to the west, lamplit dining ruins to the east, rice gardens in the southeast, four figures in the southwest, and a moonlit porch to the north. You can visit any district at any time. Artifact resolution still follows the five-song-clue sequence, and the sanctuary's light appears after the fifth discovery.

When updating an older download, copy the updated `index.html`, `js` and `README.md` files into the extracted game folder and refresh the browser. `world-generator.js` replaces the earlier generator; any old unused `platform-generator.js` file can be removed. Existing vendor/font files are unchanged. Restarting the local Python server is unnecessary when it already serves this folder.

The WebXR bridge intentionally uses a few private p5 renderer fields to set eye matrices/viewports. **Keep p5 pinned to 1.11.3** unless you retest that bridge. The game advances simulation once per XR frame, then draws once per eye. It clears each eye with scissoring so one eye cannot erase the other. Head poses are used directly; artificial rig movement is separate.

## Song clues and meaningful choices

The text is from the uploaded GDD's **Đi Cấy** excerpt. Artifact names and exact station placements are design interpretations of those images.

| Clue source | Song image | Leads to |
| --- | --- | --- |
| Opening | “Lên chùa bẻ một cành sen” | Pagoda / Lotus Archive |
| Artifact 1 | “Ăn cơm bằng đèn…” | Memory Lamp |
| Artifact 2 | “…đi cấy sáng trăng” | Rice Seed Vault |
| Artifact 3 | “Ba bốn cô có hẹn cùng chăng…” | Four figures / Companions' Echo |
| Artifact 4 | “Thắp đèn ta sẽ chơi trăng ngoài thềm” | Moonlit porch / Porch Lantern |
| Artifact 5 | “cầu cho trong ấm… lại ngoài êm” | Revealed Hidden Sanctuary |

Only the current artifact can resolve. **Listen** reveals its next verse without collecting. **Photograph & preserve** archives a real mono PNG and leaves the habitat unchanged. **Restore the habitat** archives the artifact and adds local luminous growth. **Leave** changes nothing. Both resolution paths increment the count once and update the safe checkpoint. Reach and interact with the final sanctuary after artifact five to finish.

Photographs use a separate p5 WEBGL graphics buffer and camera, with the journal/player omitted. They do not read WebXR's opaque stereo framebuffer. A headset user can archive them and save the PNGs from the desktop journal after exiting VR.

**No sung recording is bundled.** Song transcripts work immediately. To add recordings you have permission to distribute, place local clips under `assets/audio` and set each definition's `audio` path in `js/data.js`. Begin/Enter VR unlocks the audio context. Missing audio never blocks progression and is not replaced with an invented melody attributed to Đi Cấy.

## Validation and development

With Node installed, run:

```sh
npm test
```

No dependencies need installing for these tests. The suite covers 16 simulation cases and mocked XR rendering/input lifecycle checks, including ground samples across the region, direct walking routes to all five landmarks without jumping, world perimeter/room-scale bounds, artifact progression and optional jump behavior. Browser validation also exercises the open landscape, exploration controls, all five artifacts, PNG capture, environmental restoration, sanctuary completion and restart.

An additional Chromium test used the **real p5 WebGL renderer with an emulated XR runtime** to check stereo views, readable in-world menus, controller ray clicks, snap turning and clean return to desktop. **No physical headset was tested.** Emulation does not establish device/browser compatibility, controller profiles, compositor submission, performance or comfort on target hardware. Test those on your headset before calling a VR build ready.

This is a framework and procedural art blockout, not the complete painterly production game. Save/load, detailed artwork, richer environmental consequences, production audio and hardware tuning can be added in the separate modules.

For learning/debugging, `window.riversGame` exposes the current model in the browser console. Gameplay UI does not include debug/skip controls. The GDD document itself is not included in this download.

## Included dependencies

- p5.js **1.11.3**, unmodified: `vendor/p5-1.11.3.min.js`, license `vendor/LICENSE-p5.txt`. The downloaded npm tarball was checked against its registry SHA-512 integrity value.
- Noto Sans Regular: `assets/fonts/NotoSans-Regular.ttf`, SIL Open Font License in `assets/fonts/OFL.txt`. All Vietnamese clue characters were checked for glyph coverage.
