// Keep this file under an Editor folder. UnityEditor must never be part of a player build.
using System;
using System.Collections.Generic;
using UnityEditor;
using UnityEditor.SceneManagement;
using Unity.XR.CoreUtils;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.XR;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using UnityEngine.XR.Interaction.Toolkit;
using UnityEngine.XR.Interaction.Toolkit.Inputs;
using UnityEngine.XR.Interaction.Toolkit.UI;

namespace RiversVR.Editor
{
    /// <summary>
    /// Creates a connected starting scene after the README's pinned XR packages are installed.
    /// The menu does not enable OpenXR or choose a controller profile on the user's behalf:
    /// those project/runtime settings remain visible in XR Plug-in Management.
    /// Existing scenes and edited artifact data assets are preserved.
    /// </summary>
    public static class CreateRiversVRDemo
    {
        private const string DataFolder = "Assets/RiversVR/DemoData";
        private const string InputAssetPath = DataFolder + "/RiversVRInput.asset";
        private static Font uiFont;
        private static InputActionAsset inputAsset;
        private static Dictionary<string, InputActionReference> inputReferences;

        [MenuItem("Tools/Rivers VR/Create Demo Scene")]
        public static void CreateScene()
        {
            if (EditorApplication.isPlayingOrWillChangePlaymode)
            {
                Debug.LogWarning("Exit Play Mode before creating the Rivers VR scene.");
                return;
            }
            if (!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo())
                return;

            EnsureFolder("Assets/RiversVR");
            EnsureFolder(DataFolder);
            ArtifactDefinition[] definitions;
            try
            {
                definitions = LoadOrCreateDefinitions();
                LoadOrCreateInputAsset();
            }
            catch (InvalidOperationException exception)
            {
                Debug.LogError(exception.Message);
                return;
            }
            AssetDatabase.SaveAssets();

            // Deliberately leave the new scene unsaved. The designer chooses its name/location.
            Scene scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            uiFont = AssetDatabase.LoadAssetAtPath<Font>("Assets/RiversVR/Fonts/NotoSans-Regular.ttf");
            if (uiFont == null)
                uiFont = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            RenderSettings.skybox = null;
            RenderSettings.ambientLight = new Color(0.28f, 0.38f, 0.42f);
            GameObject sun = new GameObject("Misty Sanctuary Sun", typeof(Light));
            sun.transform.rotation = Quaternion.Euler(45f, -25f, 0f);
            Light sunLight = sun.GetComponent<Light>();
            sunLight.type = LightType.Directional;
            sunLight.intensity = 1.05f;

            XRInteractionManager interactionManager =
                new GameObject("XR Interaction Manager").AddComponent<XRInteractionManager>();
            GameProgress progress = new GameObject("GameProgress").AddComponent<GameProgress>();
            progress.definitions = definitions;
            // These excerpts come from the user's GDD for Đi Cấy; no new recording is fabricated.
            progress.openingVerse = "Lên chùa bẻ một cành sen,\nLên chùa bẻ một cành sen.";

            GameObject rig = new GameObject("XR Origin - Player");
            // OpenXR recommends references to persistent assets rather than actions first
            // created during Awake. Serialize the whole shared asset into the scene and
            // let one XRI manager own its enabled lifetime, including head/hand tracking.
            InputActionManager actions = rig.AddComponent<InputActionManager>();
            actions.actionAssets = new List<InputActionAsset> { inputAsset };
            CharacterController capsule = rig.AddComponent<CharacterController>();
            capsule.height = 1.7f;
            capsule.radius = 0.25f;
            capsule.center = Vector3.up * 0.85f;
            capsule.skinWidth = 0.025f;
            capsule.stepOffset = 0.2f;
            capsule.minMoveDistance = 0f;

            XROrigin origin = rig.AddComponent<XROrigin>();
            origin.Origin = rig;
            GameObject offset = new GameObject("Camera Floor Offset");
            offset.transform.SetParent(rig.transform, false);
            origin.CameraFloorOffsetObject = offset;
            origin.CameraYOffset = 1.65f; // Used only if the runtime supplies device-relative origin.
            origin.RequestedTrackingOriginMode = XROrigin.TrackingOriginMode.Floor;

            GameObject head = new GameObject("Main Camera - Tracked HMD", typeof(Camera), typeof(AudioListener));
            head.tag = "MainCamera";
            head.transform.SetParent(offset.transform, false);
            // No-HMD desktop fallback starts at standing height. Valid headset tracking
            // replaces this pose; the XR Origin handles the floor/device origin offset.
            head.transform.localPosition = Vector3.up * 1.65f;
            Camera headCamera = head.GetComponent<Camera>();
            headCamera.nearClipPlane = 0.05f;
            headCamera.farClipPlane = 300f;
            headCamera.clearFlags = CameraClearFlags.SolidColor;
            headCamera.backgroundColor = new Color(0.07f, 0.13f, 0.17f);
            origin.Camera = headCamera;

            TrackedPoseDriver tracking = head.AddComponent<TrackedPoseDriver>();
            tracking.trackingType = TrackedPoseDriver.TrackingType.RotationAndPosition;
            tracking.updateType = TrackedPoseDriver.UpdateType.UpdateAndBeforeRender;
            tracking.positionInput = Value("Head/Position");
            tracking.rotationInput = Value("Head/Rotation");
            tracking.trackingStateInput = Value("Head/TrackingState");
            tracking.enabled = false; // TrackingModeSwitcher enables it only for an active XR display.
            // Never smooth the HMD pose. Before-render tracking must keep running while
            // locomotion or an artifact choice is paused.

            VRInputReader input = rig.AddComponent<VRInputReader>();
            input.moveAction = Reference("Gameplay/Move");
            input.turnAction = Reference("Gameplay/Turn");
            input.jumpAction = Reference("Gameplay/Jump");
            input.interactAction = Reference("Gameplay/Interact");
            input.menuAction = Reference("Gameplay/Menu");
            VRPlayerController movement = rig.AddComponent<VRPlayerController>();
            movement.xrOrigin = origin;
            movement.input = input;
            movement.progress = progress;
            progress.player = movement;
            progress.input = input;
            DesktopInteractor desktop = rig.AddComponent<DesktopInteractor>();
            desktop.view = headCamera;
            desktop.input = input;
            desktop.progress = progress;
            DesktopLook desktopLook = head.AddComponent<DesktopLook>();
            desktopLook.input = input;
            desktopLook.progress = progress;

            LocomotionSystem locomotion = rig.AddComponent<LocomotionSystem>();
            locomotion.xrOrigin = origin;
            TeleportationProvider teleportation = rig.AddComponent<TeleportationProvider>();
            teleportation.system = locomotion;
            movement.locomotionSystem = locomotion;
            movement.teleportationProvider = teleportation;

            ActionBasedController left = CreateHand(offset.transform, "Left Hand", "LeftHand");
            ActionBasedController right = CreateHand(offset.transform, "Right Hand", "RightHand");
            XRRayInteractor artifactRay = CreateRay(right.transform, "Artifact and UI Ray", right, interactionManager, 1, 4f, true);
            XRRayInteractor teleportRay = CreateRay(left.transform, "Teleport Ray",
                left, interactionManager, 2, 30f, false);
            // The player's modal-input handling can disable this ray while choices are open.
            // Masks use XRI interaction-layer bits, not Unity physics-layer indices.
            movement.teleportRay = teleportRay;
            TrackingModeSwitcher trackingMode = rig.AddComponent<TrackingModeSwitcher>();
            trackingMode.xrOrigin = origin;
            trackingMode.headTracking = tracking;
            trackingMode.artifactRay = artifactRay;

            ResearchCamera photo = progress.gameObject.AddComponent<ResearchCamera>();
            photo.head = headCamera;
            progress.researchCamera = photo;

            VRGameUI ui = CreateUI(head.transform, input, headCamera);
            progress.ui = ui;

            // A fresh scene has no EventSystem. XRUIInputModule handles both controller rays
            // and the desktop mouse; do not add a second UI input module alongside it.
            GameObject events = new GameObject("EventSystem", typeof(EventSystem), typeof(XRUIInputModule));
            XRUIInputModule uiInput = events.GetComponent<XRUIInputModule>();
            uiInput.enableXRInput = true;
            uiInput.enableMouseInput = true;

            PlatformGenerator generator = new GameObject("WorldGenerator").AddComponent<PlatformGenerator>();
            generator.progress = progress;
            generator.player = movement;
            generator.interactionManager = interactionManager;
            generator.teleportationProvider = teleportation;
            generator.materialTemplate = LoadOrCreateWorldMaterial();

            GameObject spectatorObject = new GameObject("Spectator Camera - Optional", typeof(Camera));
            Camera spectator = spectatorObject.GetComponent<Camera>();
            spectator.stereoTargetEye = StereoTargetEyeMask.None;
            spectator.enabled = false; // Avoid replacing the HMD's desktop mirror by default.
            spectator.clearFlags = CameraClearFlags.SolidColor;
            spectator.backgroundColor = headCamera.backgroundColor;
            SpectatorCameraFollow follow = spectatorObject.AddComponent<SpectatorCameraFollow>();
            follow.target = head.transform;

            EditorSceneManager.MarkSceneDirty(scene);
            Selection.activeGameObject = rig;
            SceneView.lastActiveSceneView?.Frame(new Bounds(Vector3.zero, Vector3.one * 15f), false);
            Debug.Log("Rivers VR scene created. Save it, configure Windows OpenXR and a controller interaction profile, " +
                "then enter Play Mode. Right trigger interacts (XRI mask 1); left trigger teleports (mask 2). " +
                "Song text is supplied; assign authorized recordings to the five data assets if desired.");
        }

        private static ActionBasedController CreateHand(Transform parent, string name, string usage)
        {
            GameObject hand = new GameObject(name);
            hand.transform.SetParent(parent, false);
            ActionBasedController controller = hand.AddComponent<ActionBasedController>();
            string map = usage == "LeftHand" ? "Left" : "Right";
            controller.enableInputActions = true;
            controller.enableInputTracking = true;
            controller.positionAction = Value(map + "/Position");
            controller.rotationAction = Value(map + "/Rotation");
            controller.isTrackedAction = ButtonAction(map + "/IsTracked");
            controller.trackingStateAction = Value(map + "/TrackingState");
            controller.selectAction = ButtonAction(map + "/Select");
            controller.selectActionValue = Value(map + "/SelectValue");
            controller.uiPressAction = ButtonAction(map + "/UIPress");
            controller.uiPressActionValue = Value(map + "/UIPressValue");
            return controller;
        }

        private static XRRayInteractor CreateRay(Transform parent, string name, ActionBasedController controller,
            XRInteractionManager manager, int interactionMask, float distance, bool uiInteraction)
        {
            GameObject rayObject = new GameObject(name);
            rayObject.transform.SetParent(parent, false);
            XRRayInteractor ray = rayObject.AddComponent<XRRayInteractor>();
            ray.xrController = controller;
            ray.interactionManager = manager;
            ray.interactionLayers = interactionMask;
            ray.lineType = XRRayInteractor.LineType.StraightLine;
            ray.maxRaycastDistance = distance;
            ray.enableUIInteraction = uiInteraction;
            // Artifact hit targets are trigger colliders; XRI otherwise ignores them.
            ray.raycastTriggerInteraction = QueryTriggerInteraction.Collide;
            ray.hitClosestOnly = true;
            XRInteractorLineVisual line = rayObject.AddComponent<XRInteractorLineVisual>();
            line.lineWidth = 0.008f;
            return ray;
        }

        private static InputActionProperty Value(string actionPath)
        {
            return new InputActionProperty(Reference(actionPath));
        }

        private static InputActionProperty ButtonAction(string actionPath)
        {
            return new InputActionProperty(Reference(actionPath));
        }

        private static InputActionReference Reference(string actionPath)
        {
            if (!inputReferences.TryGetValue(actionPath, out InputActionReference reference))
                throw new InvalidOperationException("Missing persistent input reference: " + actionPath);
            return reference;
        }

        private static void LoadOrCreateInputAsset()
        {
            // InputActionAsset is a ScriptableObject. A native .asset plus persistent
            // InputActionReference subassets avoids dependence on an imported sample or
            // a .inputactions importer's generated references. The asset's maps and IDs
            // survive serialization; repeated scene generation retains binding edits.
            UnityEngine.Object existing = AssetDatabase.LoadMainAssetAtPath(InputAssetPath);
            inputAsset = existing as InputActionAsset;
            if (existing != null && inputAsset == null)
                throw new InvalidOperationException("Another asset occupies " + InputAssetPath + ". It was preserved.");
            if (inputAsset == null)
            {
                inputAsset = ScriptableObject.CreateInstance<InputActionAsset>();
                inputAsset.name = "RiversVRInput";
                AssetDatabase.CreateAsset(inputAsset, InputAssetPath);
            }

            // Add missing actions only. Re-running the menu preserves existing bindings,
            // processors, interactions, action IDs and references, including user edits.
            EnsureAction("Head", "Position", InputActionType.Value, "<XRHMD>/centerEyePosition", "Vector3");
            EnsureAction("Head", "Rotation", InputActionType.Value, "<XRHMD>/centerEyeRotation", "Quaternion");
            EnsureAction("Head", "TrackingState", InputActionType.Value, "<XRHMD>/trackingState", "Integer");
            foreach (string map in new[] { "Left", "Right" })
            {
                string prefix = "<XRController>{" + (map == "Left" ? "LeftHand" : "RightHand") + "}/";
                EnsureAction(map, "Position", InputActionType.Value, prefix + "devicePosition", "Vector3");
                EnsureAction(map, "Rotation", InputActionType.Value, prefix + "deviceRotation", "Quaternion");
                EnsureAction(map, "IsTracked", InputActionType.Button, prefix + "isTracked", "Button");
                EnsureAction(map, "TrackingState", InputActionType.Value, prefix + "trackingState", "Integer");
                EnsureAction(map, "Select", InputActionType.Button, prefix + "triggerPressed", "Button");
                EnsureAction(map, "SelectValue", InputActionType.Value, prefix + "trigger", "Axis");
                EnsureAction(map, "UIPress", InputActionType.Button, prefix + "triggerPressed", "Button");
                EnsureAction(map, "UIPressValue", InputActionType.Value, prefix + "trigger", "Axis");
            }
            EnsureAction("Gameplay", "Move", InputActionType.Value, "<XRController>{LeftHand}/primary2DAxis", "Vector2");
            EnsureAction("Gameplay", "Turn", InputActionType.Value, "<XRController>{RightHand}/primary2DAxis", "Vector2");
            EnsureAction("Gameplay", "Jump", InputActionType.Button, "<XRController>{RightHand}/primaryButton", "Button");
            EnsureAction("Gameplay", "Interact", InputActionType.Button, "<XRController>{RightHand}/triggerPressed", "Button");
            EnsureAction("Gameplay", "Menu", InputActionType.Button, "<XRController>{LeftHand}/primaryButton", "Button");

            inputReferences = new Dictionary<string, InputActionReference>();
            foreach (UnityEngine.Object child in AssetDatabase.LoadAllAssetsAtPath(InputAssetPath))
            {
                InputActionReference reference = child as InputActionReference;
                if (reference == null || reference.action == null || reference.action.actionMap == null)
                    continue;
                string key = reference.action.actionMap.name + "/" + reference.action.name;
                if (!inputReferences.ContainsKey(key))
                    inputReferences.Add(key, reference);
            }

            foreach (InputActionMap map in inputAsset.actionMaps)
            {
                foreach (InputAction action in map.actions)
                {
                    string key = map.name + "/" + action.name;
                    if (inputReferences.ContainsKey(key))
                        continue;
                    InputActionReference reference = InputActionReference.Create(action);
                    reference.name = map.name + "_" + action.name;
                    AssetDatabase.AddObjectToAsset(reference, inputAsset);
                    inputReferences.Add(key, reference);
                }
            }
            EditorUtility.SetDirty(inputAsset);
        }

        private static void EnsureAction(string mapName, string name, InputActionType type,
            string binding, string expectedControlType)
        {
            InputActionMap map = inputAsset.FindActionMap(mapName);
            if (map == null)
            {
                map = new InputActionMap(mapName);
                inputAsset.AddActionMap(map);
            }
            if (map.FindAction(name) == null)
                map.AddAction(name, type, binding: binding, expectedControlType: expectedControlType);
        }

        private static ArtifactDefinition[] LoadOrCreateDefinitions()
        {
            string[] names = { "Lotus Archive", "Memory Lamp", "Rice Seed Vault", "Companions' Echo", "Porch Lantern" };
            string[] verses =
            {
                "Ăn cơm bằng đèn đi cấy sáng trăng.",
                "Ăn cơm bằng đèn đi cấy sáng trăng.",
                "Ba bốn cô có hẹn cùng chăng,\nCó bạn cùng chăng?",
                "Thắp đèn ta sẽ chơi trăng ngoài thềm\nChơi trăng ngoài thềm",
                "Ý rằng cầu cho, cầu cho trong ấm\nÊm, êm lại ngoài êm."
            };
            string[] descriptions =
            {
                "A luminous lotus grows around a research archive. Its quiet pulse recalls a pagoda garden.",
                "A lamp still shines beside a forgotten meal. The next words speak of tending rice under moonlight.",
                "The seed vault holds living traces of the old fields. A chorus seems to answer from the ruins.",
                "Several figures face one another across the water. Their shared memory leads toward the moonlit porch.",
                "The porch lantern carries the final refrain: warmth within, and peace beyond. A hidden sanctuary answers."
            };
            Color[] colors =
            {
                new Color(0.3f, 1f, 0.85f), new Color(1f, 0.73f, 0.25f),
                new Color(0.4f, 0.9f, 0.4f), new Color(0.65f, 0.65f, 1f), new Color(0.9f, 0.95f, 1f)
            };
            ArtifactDefinition[] definitions = new ArtifactDefinition[5];
            for (int i = 0; i < definitions.Length; i++)
            {
                string path = DataFolder + "/Artifact" + (i + 1) + ".asset";
                UnityEngine.Object existing = AssetDatabase.LoadMainAssetAtPath(path);
                if (existing != null)
                {
                    definitions[i] = existing as ArtifactDefinition;
                    if (definitions[i] == null)
                        throw new InvalidOperationException("Another asset already occupies " + path + ". It was preserved.");
                    continue;
                }
                ArtifactDefinition data = ScriptableObject.CreateInstance<ArtifactDefinition>();
                data.artifactName = names[i];
                data.verse = verses[i];
                data.eventDialogue = descriptions[i];
                data.signalColor = colors[i];
                data.songClip = null;
                AssetDatabase.CreateAsset(data, path);
                definitions[i] = data;
            }
            return definitions;
        }

        private static Material LoadOrCreateWorldMaterial()
        {
            const string path = DataFolder + "/WorldMaterial.mat";
            Material material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (material != null)
                return material;
            material = new Material(Shader.Find("Standard"));
            material.color = new Color(0.2f, 0.4f, 0.4f);
            // A serialized material retains both the shader and its emission variant in
            // player builds; runtime-only Shader.Find strings do not guarantee retention.
            material.EnableKeyword("_EMISSION");
            material.SetColor("_EmissionColor", Color.black);
            AssetDatabase.CreateAsset(material, path);
            return material;
        }

        private static VRGameUI CreateUI(Transform head, VRInputReader input, Camera eventCamera)
        {
            GameObject root = new GameObject("Research Journal - World Space", typeof(RectTransform),
                typeof(Canvas), typeof(TrackedDeviceGraphicRaycaster), typeof(VRGameUI));
            RectTransform rect = root.GetComponent<RectTransform>();
            rect.sizeDelta = new Vector2(1000f, 700f);
            rect.localScale = Vector3.one * 0.0016f;
            Canvas canvas = root.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.WorldSpace;
            canvas.worldCamera = eventCamera;

            VRGameUI ui = root.GetComponent<VRGameUI>();
            ui.worldCanvas = canvas;
            ui.head = head;
            ui.input = input;
            // Keep playback alive when the player closes/hides the journal Canvas.
            ui.songSource = new GameObject("Đi Cấy - Song Playback", typeof(AudioSource)).GetComponent<AudioSource>();
            ui.songSource.playOnAwake = false;
            ui.songSource.spatialBlend = 0f;

            RectTransform background = Panel(root.transform, "Journal Background", Vector2.zero, new Vector2(1000f, 700f));
            Label(background, "Heading", "THERE ARE RIVERS IN THE SKY", 27, new Vector2(30f, -22f), new Vector2(940f, 40f));
            ui.countText = Label(background, "Artifact Count", "Artifacts found: 0 / 5", 24,
                new Vector2(30f, -70f), new Vector2(940f, 40f));
            ui.verseText = Label(background, "Song Verse", "Đi Cấy", 27,
                new Vector2(30f, -125f), new Vector2(720f, 125f));
            ui.replayButton = BuildButton(background, "Replay Song", "Replay song", new Vector2(775f, -135f), new Vector2(195f, 55f));
            ui.notificationText = Label(background, "Research Notification", "", 21,
                new Vector2(30f, -255f), new Vector2(940f, 65f));
            ui.notificationText.color = new Color(0.4f, 1f, 0.8f);
            ui.promptText = Label(background, "Controls", "Aim the right-hand ray and press trigger. Tab / left primary button recalls the journal.", 19,
                new Vector2(30f, -640f), new Vector2(940f, 48f));

            RectTransform choices = new GameObject("Artifact Choices", typeof(RectTransform)).GetComponent<RectTransform>();
            choices.SetParent(background, false);
            choices.anchorMin = choices.anchorMax = choices.pivot = new Vector2(0f, 1f);
            choices.anchoredPosition = new Vector2(0f, -325f);
            choices.sizeDelta = new Vector2(1000f, 300f);
            ui.choicesRoot = choices.gameObject;
            ui.titleText = Label(background, "Artifact Title", "Research journal", 27,
                new Vector2(30f, -325f), new Vector2(940f, 42f));
            ui.eventText = Label(background, "Event Dialogue", "Follow the song through the flooded palace.", 22,
                new Vector2(30f, -375f), new Vector2(940f, 105f));
            ui.listenButton = BuildButton(choices, "Listen Choice", "Listen", new Vector2(30f, -175f), new Vector2(285f, 56f));
            ui.photoButton = BuildButton(choices, "Photograph Choice", "Photograph & preserve", new Vector2(355f, -175f), new Vector2(290f, 56f));
            ui.restoreButton = BuildButton(choices, "Restore Choice", "Restore the habitat", new Vector2(685f, -175f), new Vector2(285f, 56f));

            // Leave is outside choicesRoot so the same close control remains accessible
            // when the player recalls a journal with no pending artifact interaction.
            ui.leaveButton = BuildButton(background, "Leave Choice", "Close / leave for now", new Vector2(350f, -575f), new Vector2(300f, 50f));

            RectTransform victory = Panel(root.transform, "Hidden Sanctuary Reached", Vector2.zero, new Vector2(1000f, 700f));
            ui.victoryRoot = victory.gameObject;
            Text victoryTitle = Label(victory, "Victory Heading", "THE SANCTUARY REMEMBERS", 35,
                new Vector2(45f, -150f), new Vector2(910f, 65f));
            victoryTitle.alignment = TextAnchor.MiddleCenter;
            Text victoryBody = Label(victory, "Victory Dialogue",
                "Five artifacts. One remembered song.\n\nThis changed Earth is still a place to belong.\n\nYour research journey is complete.",
                27, new Vector2(70f, -270f), new Vector2(860f, 260f));
            victoryBody.alignment = TextAnchor.MiddleCenter;
            victory.gameObject.SetActive(false);
            SetLayerRecursively(root.transform, 5); // UI is excluded from research photographs.
            return ui;
        }

        private static void SetLayerRecursively(Transform root, int layer)
        {
            root.gameObject.layer = layer;
            foreach (Transform child in root)
                SetLayerRecursively(child, layer);
        }

        private static RectTransform Panel(Transform parent, string name, Vector2 position, Vector2 size)
        {
            GameObject panel = new GameObject(name, typeof(RectTransform), typeof(Image));
            RectTransform rect = panel.GetComponent<RectTransform>();
            rect.SetParent(parent, false);
            rect.anchorMin = rect.anchorMax = rect.pivot = Vector2.one * 0.5f;
            rect.anchoredPosition = position;
            rect.sizeDelta = size;
            panel.GetComponent<Image>().color = new Color(0.025f, 0.075f, 0.09f, 0.97f);
            return rect;
        }

        private static Text Label(Transform parent, string name, string text, int size, Vector2 position, Vector2 bounds)
        {
            GameObject label = new GameObject(name, typeof(RectTransform), typeof(Text));
            RectTransform rect = label.GetComponent<RectTransform>();
            rect.SetParent(parent, false);
            rect.anchorMin = rect.anchorMax = rect.pivot = new Vector2(0f, 1f);
            rect.anchoredPosition = position;
            rect.sizeDelta = bounds;
            Text component = label.GetComponent<Text>();
            component.font = uiFont;
            component.fontSize = size;
            component.text = text;
            component.color = Color.white;
            component.horizontalOverflow = HorizontalWrapMode.Wrap;
            component.verticalOverflow = VerticalWrapMode.Overflow;
            component.raycastTarget = false;
            return component;
        }

        private static Button BuildButton(Transform parent, string name, string label, Vector2 position, Vector2 size)
        {
            RectTransform rect = Panel(parent, name, position, size);
            rect.anchorMin = rect.anchorMax = rect.pivot = new Vector2(0f, 1f);
            rect.anchoredPosition = position;
            Image image = rect.GetComponent<Image>();
            image.color = new Color(0.08f, 0.33f, 0.37f);
            Button button = rect.gameObject.AddComponent<Button>();
            button.targetGraphic = image;
            Text caption = Label(rect, "Label", label, 21, Vector2.zero, size);
            caption.alignment = TextAnchor.MiddleCenter;
            return button;
        }

        private static void EnsureFolder(string path)
        {
            if (AssetDatabase.IsValidFolder(path))
                return;
            int slash = path.LastIndexOf('/');
            string parent = path.Substring(0, slash);
            EnsureFolder(parent);
            AssetDatabase.CreateFolder(parent, path.Substring(slash + 1));
        }
    }
}
