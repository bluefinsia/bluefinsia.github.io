# Artifact Trail — Unity 2022.3 LTS base framework

A third-person sci-fi prototype: traverse floating platforms, interact with five artifacts in order, hear/read a Vietnamese song clue at each station, and unlock the hidden observatory. Each script is a separate, commented C# file under `Assets/ArtifactFramework`.

## Quick start

1. In Unity Hub, create a **Unity 2022.3 LTS** project with the **3D Core / Built-in Render Pipeline** template. This demo uses the Standard shader. URP/HDRP need replacement materials/shaders.
2. Copy this download's `Assets/ArtifactFramework` folder into your project's `Assets` folder. Keep the helper under its `Editor` folder. Wait for Unity to import and compile the scripts.
3. In **Edit → Project Settings → Player → Other Settings → Configuration**, set **Active Input Handling** to **Input Manager (Old)** or **Both**. Restart Unity if requested. The scripts and `StandaloneInputModule` use the legacy Input Manager; they do not require the new Input System package.
4. Run **Tools → Artifact Trail → Create Demo Scene**. The helper prompts about unsaved scenes, creates a new unsaved scene, and wires all references automatically. It creates five data assets under `Assets/ArtifactFramework/DemoData`. Existing data assets are reused without overwriting edits.
5. Save the scene under a new name, for example `Assets/Scenes/ArtifactTrailDemo.unity`, then press **Play**. The platforms, artifact visuals, landmarks and final beacon are generated at runtime. To make a player build, add the saved scene to **File → Build Settings → Scenes In Build**.

The template normally includes **Unity UI / uGUI** (`com.unity.ugui`). If `UnityEngine.UI` cannot be resolved, install Unity UI through Package Manager. No third-party packages, models, prefabs, networking, or credentials are needed.

## Scripts and attachment locations

| Script | Attach to / create as | Responsibility |
| --- | --- | --- |
| `PlayerController.cs` | `Player`, with a `CharacterController` | Camera-relative movement, gravity, ground jump, one air jump, ceiling collisions, fall respawn and checkpoints. No player Rigidbody. |
| `CameraFollow.cs` | `Main Camera` | `LateUpdate` follow using `SmoothDamp`, delayed look rotation, immediate snap after respawn. Target = `Player/CameraTarget`. |
| `PlatformGenerator.cs` | Empty `WorldGenerator` at rotation `(0,0,0)`, scale `(1,1,1)` | Seeded, finite route with a start, five artifact stations and final destination. Creates its own primitive platforms/materials. |
| `ArtifactDefinition.cs` | **ScriptableObject asset**, not a GameObject | Artifact name, next-location verse, optional sung AudioClip and signal color. Create through **Assets → Create → Artifact Trail → Artifact Definition**. |
| `ArtifactCollectible.cs` | Each runtime `Artifact 1…5` root | Artifact index and state; rotating/pulsing visual; collected visual removal. Generated automatically. |
| `PlayerInteractor.cs` | `Player` | Shows E prompts and opens choices only for the current nearby artifact or unlocked destination. |
| `GameProgress.cs` | Empty `GameProgress` | Enforces exactly five ordered, unique collections, updates clues/UI/checkpoints, reveals and completes the finale. |
| `GameUI.cs` | `HUD` Canvas | Count, interaction prompt, discovery message, persistent song verse, choices, replay audio and completion panel. |
| `HiddenLocation.cs` | Runtime `Hidden Observatory` root | Hides/reveals the final visual independently of platform collision. Generated automatically. |
| `Editor/CreateArtifactDemo.cs` | **No attachment**; keep in `Editor` | Editor menu that builds and wires the demo scene and reusable data assets. Excluded from player builds. |

All runtime classes use the `ArtifactTrail` namespace. Do not rename a MonoBehaviour's file without also renaming its class.

## Controls and gameplay

- **WASD / arrows:** move relative to the camera's horizontal viewing direction.
- **Space:** jump; press again in the air for one double jump. Walking off an edge grants one air jump. Landing restores the allowance.
- **E:** interact with the next artifact within the manager's `interactionRadius` (default 3 m), or enter the unlocked observatory.
- **Mouse / Tab / Enter:** choose **Listen to the song**, **Attune artifact**, or **Leave for now**. **Escape** also leaves the choice panel.
- **Replay song:** replay the current clue's recording when a clip is assigned.

Opening choices blocks movement and jumping, while gravity continues. Leaving does not collect anything. Listening previews the verse; attuning collects the artifact, updates `Artifacts found: n / 5`, reveals the next clue, and moves the safe checkpoint to this station. Collection checks both sequence and proximity again on confirmation. A fall cancels any pending dialog before respawning, so confirmation cannot collect an artifact remotely.

Other artifacts are visible but dormant until their turn; only the current artifact pulses. After artifact five, the magenta beacon appears. Approach it and press E to finish. The supporting platform exists from the start. Progress is session-only; restarting Play Mode resets the game.

## Vietnamese song and clue chain

**The included verses are original Vietnamese placeholder lyrics inspired by folk-song imagery. They are not quotations from an authentic traditional song, and no singing recording is supplied.** The prototype initially presents them as text. Each `ArtifactDefinition.songClip` supports a separate sung stanza, played on Listen/Attune and replayed through the UI.

| Clue source | Leads to | Visible matching landmark |
| --- | --- | --- |
| Opening verse | Artifact 1: **Hạt Sương Lam** | Cyan signal light |
| Artifact 1 | Artifact 2: **Tiếng Vọng Tím** | Violet antenna |
| Artifact 2 | Artifact 3: **Mảnh Nắng Vàng** | Golden arch |
| Artifact 3 | Artifact 4: **Mầm Sống Xanh** | Green biogarden |
| Artifact 4 | Artifact 5: **Vầng Trăng Trắng** | White moon dome |
| Artifact 5 | **Hidden Observatory** | Newly revealed magenta beacon |

For your chosen Vietnamese folk song, replace `GameProgress.openingVerse`, the five definition verses, and the corresponding clips. Match each stanza's imagery to its next landmark in `PlatformGenerator.BuildLandmark`. This keeps the song useful as the actual clue rather than background music. Use a recording you have permission to distribute.

The default editor helper uses Unity's built-in `LegacyRuntime.ttf`. For reliable Vietnamese diacritics across target devices, import a Unicode font with Vietnamese coverage, such as Noto Sans Regular, and assign it to every **Text** component under the HUD, including button labels. For an imported legacy/dynamic font, use the font's **Dynamic** character mode. Check strings such as `Hạt Sương Lam`, `Tiếng Vọng Tím`, and `Ăng-ten tím` in the target player build. A TextMeshPro conversion is possible but requires changing the `Text` fields and builder together.

## Manual wiring / customization

The menu command is the fastest path; for an existing scene, reproduce these references:

- **Player:** CharacterController `height=2`, `radius=0.35`, `center=(0,1,0)`, `skinWidth=0.04`, `stepOffset=0.3`. The root represents the feet. Any visible model is a child without a duplicate capsule collider. Assign `PlayerController.progress` and `PlayerInteractor.progress` to GameProgress. Assign `PlayerController.cameraTransform` to Main Camera. The optional `respawnPoint` is replaced by the generated start/checkpoints.
- **Main Camera:** tag it `MainCamera`, retain one AudioListener, and set `CameraFollow.target` to a player child at local `(0,1.2,0)`. The camera uses a fixed world-space offset `(0,7,-10)` and a default follow delay of `0.18` seconds. It has no orbit or obstruction solver.
- **GameProgress:** assign `player`, `ui`, and exactly five definition assets in the intended order. Adjust the shared `interactionRadius` here.
- **WorldGenerator:** assign `progress` and `player`. Keep its rotation zero and scale one. The generator supports a translated origin; adjust `PlayerController.killHeight` if relocating the entire level vertically.
- **HUD:** Canvas in Screen Space Overlay mode, CanvasScaler, GraphicRaycaster, GameUI and an AudioSource. Assign all six Text references, both panel roots, all four Buttons, and the AudioSource. Keep one EventSystem with StandaloneInputModule. The generated canvas uses a 1600×900 reference resolution.

Changing `seed` changes lateral positions reproducibly. Defaults create **19 platforms**: a starting platform, two intermediate platforms before each of five stations, then two more before the final destination. `intermediatePlatforms` can range from 0 to 4. Platforms are 5×1×5 m; `edgeGap` is clamped to 0.6–1.5 m. Lateral offsets stay within ±0.75 m and platform height within ±0.25 m.

With movement speed 6 m/s, jump height 2 m, and gravity −20 m/s², the ideal equal-height jump lasts about 0.894 s and covers 5.37 m. The small default edge gaps and overlapping lateral widths are deliberately conservative. Physics, frame rate, collider shape and changed movement settings still require Play Mode checks. This is a finite platform route; endless chunks, networking, save files, camera collision and production artwork are extension points.

## Validation and Play Mode checklist

The supplied files were source-reviewed and checked with a C# syntax parser. Platform indexing and default route spacing were also checked outside Unity. **Unity Editor compilation, physics, UI rendering, audio, and Play Mode were not run in the generation environment.** A syntax parser does not verify Unity API bindings or runtime behavior.

In Unity 2022.3, verify:

1. Console has no compile errors; running the menu and pressing Play creates 19 platforms and five numbered artifacts; count starts at 0/5.
2. Move, jump, double jump, and attempt a third air jump. The third must fail. Walk off an edge and verify only one air jump is allowed.
3. At the cyan station, E opens choices. Leave/Escape must preserve count. Listen shows the next verse; if audio is assigned, it plays. Attune must count exactly once and remove that artifact's sphere.
4. Attempt to interact with a later station early. It must not collect. Move/jump input must stop while choices are open.
5. Fall below the kill height. You should respawn at the last collected station, retain progression, and have no pending remote collection dialog.
6. Complete all five in order; the final beacon appears only after the fifth. Reach it and press E; the completion panel appears and input is blocked.
7. Check Vietnamese diacritics, clue/button layout, camera delay and optional audio at the target build's resolution.

## Download from GitHub

This framework is included on the `codex/unity-artifact-framework` branch of `bluefinsia/bluefinsia.github.io`.

- Browse the separate scripts in this folder under `Assets/ArtifactFramework`.
- The importable ZIP is at `downloads/unity-artifact-framework.zip` in the repository root. Open that file on GitHub and choose **Download raw file**.
- GitHub's **Code → Download ZIP** also downloads the whole selected branch. In that download, use this `unity-artifact-framework` folder.

If using Unity 6 (for example 6000.6.8f1), choose the Built-In Render Pipeline template and set Active Input Handling to Both. The source was written for Unity 2022.3 LTS and has not been compiled or run in either editor in this cloud workspace; Unity 6 compatibility still needs verification in your editor.
