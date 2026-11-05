# There Are Rivers in the Sky — Unity 2022.3 VR base framework

**Target:** Unity **2022.3 LTS**, **3D Core / Built-in Render Pipeline**, **Windows PC VR with OpenXR**.

The supplied GDD describes a researcher returning to a flooded, post-human Earth: palace ruins, luminous cyanobacteria, lotus gardens, photographs, environmental choices, and clues from **Đi Cấy**. This framework implements that core loop using a generated primitive blockout. The five artifact identities and precise locations below are implementation choices interpreting the GDD, rather than additional claims about the document.

This is a VR replacement for the earlier desktop-only starter. Its scripts live in the separate `RiversVR` namespace and folder. It uses the **new Input System**. The headset camera tracks directly; camera follow smoothing is restricted to an optional spectator camera.

## 1. Create and configure the project

1. Create a **Unity 2022.3 LTS → 3D Core / Built-in Render Pipeline** project. The code and runtime photo camera target Built-in rendering. Unity 6 / XRI 3.x / URP have not been verified for this package.
2. In **Window → Package Manager**, use **+ → Add package by name** twice:

   | Package name | Version |
   | --- | --- |
   | `com.unity.xr.interaction.toolkit` | `2.5.4` |
   | `com.unity.xr.openxr` | `1.9.1` |

   XRI 2.5.4 declares Input System **1.7.0** and XR Core Utilities **2.2.3** as dependencies. Let Unity resolve the dependencies. No Starter Assets sample import is needed: the scene builder creates a persistent input-action asset and wires its references.
3. Set **Edit → Project Settings → Player → Other Settings → Active Input Handling → Input System Package (New)**. Accept the editor restart if requested.
4. In **File → Build Settings**, select **PC, Mac & Linux Standalone**, target **Windows**, architecture **x86_64**. Switch platform if needed.
5. Open **Edit → Project Settings → XR Plug-in Management**. In the Windows/Standalone tab, enable **OpenXR** and **Initialize XR on Startup**.
6. Open the **OpenXR** settings and add the controller interaction profile for your hardware. For example, use **Oculus Touch Controller Profile** with Quest Link, **Valve Index Controller Profile** with Index, or the matching Vive profile. Resolve applicable errors in **Project Validation**. The default action paths assume a primary 2D axis and primary face button; hardware without those controls needs adjusted bindings in `VRInputReader`.
7. In your headset's PC software, select the intended active **OpenXR runtime** (for example SteamVR or Meta Quest Link). Connect the headset/controllers. Editor scripts do not install a headset runtime or select one for Windows.

## 2. Import and start

1. Extract the framework ZIP. Copy **`Assets/RiversVR`** into your Unity project's **`Assets`** folder. The included font and its license should remain with it.
2. Wait for compilation, then choose **Tools → Rivers VR → Create Demo Scene**. This is the VR menu; the earlier `Artifact Trail` menu belongs to the older desktop starter.
3. Save the generated scene under a new name, for example `Assets/RiversVRDemo.unity`. The menu preserves edited data assets and asks about unsaved scene work first.
4. Press **Play**. Read the opening song clue in the world-space journal, then choose **Close / leave for now** to explore. Use the right-controller ray to press UI buttons.
5. For a Windows player, add the saved scene to **Build Settings → Scenes In Build**, then build/run with the headset's OpenXR runtime active.

If the menu is missing, first inspect the **Console's first red error**. Missing `Unity.XR.CoreUtils`, `UnityEngine.InputSystem`, or XRI types usually indicates that package installation/compilation is incomplete. Keep the helper inside its `Editor` directory.

## 3. Scripts and GameObject attachments

Every C# file includes comments. The menu automatically performs the following wiring:

| File | Attach to / create as | Responsibility |
| --- | --- | --- |
| `VRInputReader.cs` | `XR Origin - Player` | Input System actions for move, snap turn, jump, interaction and journal; no-HMD keyboard fallback. |
| `VRPlayerController.cs` | `XR Origin - Player`, with `CharacterController` and `XROrigin` | Head-relative motion, ground jump plus one air jump, gravity, room-scale capsule, checkpoints, fall respawn and teleport state reset. |
| `TrackingModeSwitcher.cs` | `XR Origin - Player` | Enables real tracked poses when XR runs; explicitly disables the HMD driver for desktop preview. |
| `SpectatorCameraFollow.cs` | Separate `Spectator Camera - Optional` | SmoothDamp follow with slight delay, stereo target `None`. Never attach to the HMD camera. |
| `PlatformGenerator.cs` | Empty `WorldGenerator` | Seeded finite route, landmark blockout, solid platforms, teleport areas, five artifacts and the finale. |
| `ArtifactDefinition.cs` | Five ScriptableObject assets in `Assets/RiversVR/DemoData`; no GameObject | Names, event dialogue, next song excerpt, optional recording and visual color. |
| `ArtifactInteractable.cs` | Each generated artifact root, with `XRSimpleInteractable` and a trigger collider | XR selection, ordered artifact state, visual pulse, and local restored habitat. |
| `GameProgress.cs` | Empty `GameProgress` | Authoritative sequence, proximity checks, choices, song/clue state, count, and final-location completion. |
| `VRGameUI.cs` | `Research Journal - World Space` Canvas | Artifact count, song text, event dialogue, Listen/Photograph/Restore/Leave choices and completion. |
| `ResearchCamera.cs` | `GameProgress` (photo service) | Saves an independent mono PNG photograph without rendering the HMD camera manually. |
| `HiddenLocation.cs` | Generated hidden sanctuary root, with `XRSimpleInteractable` | Unlocks the finale after artifact five; supporting terrain remains available. |
| `DesktopInteractor.cs` | `XR Origin - Player` | Camera-centre E interaction when no XR display is running. |
| `DesktopLook.cs` | Tracked HMD camera | Right-mouse look only in no-headset desktop preview. |
| `ArtifactResolution.cs` | No attachment; enum | Represents photograph/preserve versus habitat restoration. |
| `Editor/CreateRiversVRDemo.cs` | No attachment; keep in `Editor` | Creates the wired scene, XR actions/controllers/UI, data assets and saved material template. |

The rig hierarchy is:

```text
XR Origin - Player
  CharacterController, XROrigin, VRInputReader, VRPlayerController, InputActionManager
  LocomotionSystem, TeleportationProvider, TrackingModeSwitcher, DesktopInteractor
  Camera Floor Offset
    Main Camera - Tracked HMD
      Camera, AudioListener, Input System TrackedPoseDriver, DesktopLook
    Left Hand — ActionBasedController
      Teleport Ray — XRRayInteractor + XRInteractorLineVisual
    Right Hand — ActionBasedController
      Artifact and UI Ray — XRRayInteractor + XRInteractorLineVisual
GameProgress — GameProgress + ResearchCamera
WorldGenerator — PlatformGenerator
XR Interaction Manager
Research Journal - World Space — Canvas + TrackedDeviceGraphicRaycaster + VRGameUI
Đi Cấy - Song Playback — AudioSource
EventSystem — XRUIInputModule
Spectator Camera - Optional — Camera + SpectatorCameraFollow
```

Use one EventSystem and its **XRUIInputModule**. The world-space Canvas's event camera is the tracked head camera. The scene builder wires each button and uses the bundled **Noto Sans** font for Vietnamese diacritics.

## 4. Controls and camera behavior

| Action | PC VR | No-headset editor preview |
| --- | --- | --- |
| Move | Left primary stick/2D axis | WASD / arrows |
| Turn/look | Right stick left/right: 45° snap turn | Hold right mouse and move mouse |
| Teleport | Aim left ray at a platform, press/release left trigger | Not enabled; walk/jump |
| Interact | Aim right ray at the current artifact and press right trigger | Aim camera centre and press E |
| Choose a UI button | Right ray + right trigger | Mouse click |
| Jump / double jump | Right primary face button, when `Allow VR Jump` is enabled | Space, then Space again in air |
| Recall/close journal | Left primary face button | Tab |

**Jumping:** desktop preview supports it immediately. VR artificial jumping is opt-in: select `XR Origin - Player` and enable **VRPlayerController → Allow VR Jump**. **Enable Double Jump** permits exactly one further air jump; walking off an edge also permits one air jump. Landing resets the allowance. Teleportation is available by default, so no jumping is required to complete the route.

**Tracked camera:** HMD and controllers use direct XR poses, including before-render head updates. Opening choices blocks artificial movement/turn/jump/teleport while tracking continues. Gravity still operates, and falling respawns/cancels pending choices.

**Follow camera:** the spectator camera follows the head with a default `0.18 s` positional delay. It is disabled by default to preserve the regular desktop mirror. Assign a RenderTexture or secondary display and enable it for a separate spectator output; no AudioListener is added to that camera.

## 5. Đi Cấy clue sequence and environmental choices

The following song lines come from the supplied GDD. **No audio recording is included.** The text path is fully represented in the data, and each asset has `songClip` for a licensed/self-recorded sung excerpt. **Listen**, resolution and **Replay song** play the assigned clip; the corresponding text remains readable when no clip is assigned.

| Source | Excerpt | Next destination |
| --- | --- | --- |
| Opening | “Lên chùa bẻ một cành sen” | Pagoda ruin / **Lotus Archive** |
| Artifact 1 | “Ăn cơm bằng đèn đi cấy sáng trăng” — lamplight image | **Memory Lamp** |
| Artifact 2 | Same sung line — rice-planting image | **Rice Seed Vault** |
| Artifact 3 | “Ba bốn cô có hẹn cùng chăng, Có bạn cùng chăng?” | Four remembered figures / **Companions' Echo** |
| Artifact 4 | “Thắp đèn ta sẽ chơi trăng ngoài thềm” | Moonlit porch / **Porch Lantern** |
| Artifact 5 | “cầu cho trong ấm … lại ngoài êm” | Newly revealed warm **Hidden Sanctuary** |

This interprets the GDD's highlighted imagery. The last refrain is associated with the sanctuary's warm lights and peace in the flooded garden. Replace geometry with your painterly palace/garden art while keeping the imagery consistent.

Each artifact offers:

- **Listen:** read/hear the next clue without resolving the artifact.
- **Photograph & preserve:** save a PNG of the current mono view, archive the artifact, and leave the local habitat unchanged.
- **Restore the habitat:** archive the artifact and activate a local luminous cyanobacteria garden.
- **Leave:** return later without changing the found count.

Both resolution paths count the artifact once, advance to the next clue, and update the checkpoint. Physical pickup/inventory is not required by the GDD's find-and-interact loop. Later artifacts remain dormant until their turn. After the fifth, approach and select the sanctuary light to complete the chapter. The current choice is retained on each artifact during the session; disk save/load is not implemented.

The photo service writes PNGs to `Application.persistentDataPath/ResearchPhotos` and logs each path in Unity's Console. It renders a separate mono camera with UI excluded, never calls Render on the tracked HMD camera, and restores temporary render state even if capture fails.

## 6. Generation and manual wiring notes

- Defaults generate **13 solid 5×1×5 m platforms**: a start, one intermediate landing before each of five stations, and one before the final platform. Gaps default to **0.8 m**; lateral offsets stay within ±0.5 m and vertical variation ±0.12 m. The route is finite/reproducible via `seed`.
- XRI interaction **mask `1` (bit 0)** is for artifacts/finale. **Mask `2` (bit 1)** is for floor teleport areas. These are XRI interaction masks, separate from Unity physics layer indices.
- `DemoData/RiversVRInput.asset` is a saved InputActionAsset with Head, Left, Right and Gameplay maps and persistent action references. `InputActionManager` enables the shared asset; gameplay/modal logic never disables its tracking actions. The defaults are authored in the scene builder. For custom controls, assign references from your own authored Input Action Asset to the reader/controllers and include that asset in InputActionManager. Keep referenced actions available. Existing generated bindings are preserved when the scene builder is run again.
- Artifact/finale hit targets are trigger colliders. Both the right ray and desktop interaction ray explicitly query triggers. Floors have solid colliders and registered `TeleportationArea` components.
- Left teleport and right interaction use different triggers. The teleport ray is disabled during menus. XRI cancels the selection when disabled; its canceled-select guard prevents a canceled selection from queueing a teleport.
- `VRPlayerController` respects `LocomotionSystem.busy` and resets falling/jump state on `TeleportationProvider.endLocomotion`. Capsule height/centre follow room-scale head movement; respawn places the tracked head above the checkpoint without overwriting its physical tracking pose.
- `VRGameUI` positions the journal once, about 2 m in front of the head, when opened. Closing disables the Canvas root and its raycaster. A trigger-release gate prevents the press that opens choices from also clicking a newly appeared button.
- `WorldGenerator` should keep rotation zero and scale one. If you move the level vertically, adjust the player's `killY` appropriately.
- The helper creates/reuses `DemoData/WorldMaterial.mat` and assigns it to the generator. This serialized reference keeps the Standard shader and emission variant in Windows builds. For a manually built scene, assign a Standard material with emission enabled to `materialTemplate`.
- Existing data assets and saved scenes are preserved. The source GDD itself is not included in the framework download.

## 7. What was checked and what to test in Unity

The scripts were reviewed against pinned Input System/XRI/Core Utils source APIs, parsed with a C# syntax parser, and checked for consistent references, sequence indices, default route dimensions and package contents. **Unity Editor compilation, Play Mode, Windows builds and headset tracking/input were not run in the generation environment.** Syntax checks do not verify engine behavior.

Run this checklist in Unity 2022.3 with your Windows OpenXR headset:

1. Install packages, resolve the first Console error if any, create/save the scene, and enter Play. Confirm 13 platforms, five artifacts, and a 0/5 count.
2. Rotate/move your head with menus open and closed. Tracking should stay immediate. Confirm hands, right UI clicks, left teleport, primary-stick movement and snap turn.
3. Enable VR jumping if wanted. Test ground jump, one air jump, rejected third jump, walking off an edge, landing reset and ceiling contact.
4. At artifact one, test Listen and Leave (no count change), then Photograph or Restore (one count increase). Confirm photograph file output or the local restored garden, as appropriate.
5. Confirm later artifacts cannot resolve early and repeated button presses cannot double count. Open choices while near an edge, fall/respawn, and verify the old choice cannot collect remotely.
6. Resolve all five; confirm the final light appears and entering it completes the chapter. Walkable terrain must remain present throughout.
7. Replay a supplied clip, close the journal and confirm audio continues. Check Vietnamese text, world-space button readability and photographs without UI.
8. Build Windows x86_64 and repeat headset input and materials/photo checks in the player. Desktop fallback is useful for logic/layout iteration but does not validate VR.

This is a base framework and primitive blockout. Production artwork, polished hand models/animations, full music, save files, and target-hardware performance tuning are separate work.

## Font attribution

`Assets/RiversVR/Fonts/NotoSans-Regular.ttf` comes from the Noto project:
https://github.com/notofonts/noto-fonts/blob/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf

It is distributed under the SIL Open Font License 1.1; the license is included as `Fonts/OFL.txt`. Keep that license when redistributing the font.
