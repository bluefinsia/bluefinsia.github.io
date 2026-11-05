// This file must remain inside an Editor folder: UnityEditor is unavailable in builds.
using System;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace ArtifactTrail.Editor
{
    /// <summary>
    /// Creates a wired, playable starting scene using Unity primitives and UGUI.
    /// The scene is deliberately left unsaved so an existing scene is never overwritten.
    /// Data assets are reused on subsequent runs, preserving the designer's edits.
    /// </summary>
    public static class CreateArtifactDemo
    {
        private const string DataFolder = "Assets/ArtifactFramework/DemoData";
        private static Font uiFont;

        [MenuItem("Tools/Artifact Trail/Create Demo Scene")]
        public static void CreateScene()
        {
            if (EditorApplication.isPlayingOrWillChangePlaymode)
            {
                Debug.LogWarning("Leave Play Mode before creating the Artifact Trail scene.");
                return;
            }

            // Respect unsaved work in every currently open scene before changing scenes.
            if (!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo())
                return;

            EnsureFolder("Assets/ArtifactFramework");
            EnsureFolder(DataFolder);
            ArtifactDefinition[] definitions;
            try
            {
                definitions = LoadOrCreateDefinitions();
            }
            catch (InvalidOperationException error)
            {
                Debug.LogError(error.Message);
                return;
            }

            AssetDatabase.SaveAssets();
            Scene scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            uiFont = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");

            RenderSettings.skybox = null;
            RenderSettings.ambientLight = new Color(0.28f, 0.32f, 0.42f);
            GameObject sun = new GameObject("Station Sun", typeof(Light));
            sun.transform.rotation = Quaternion.Euler(45f, -25f, 0f);
            Light sunlight = sun.GetComponent<Light>();
            sunlight.type = LightType.Directional;
            sunlight.intensity = 1.2f;

            GameProgress progress = new GameObject("GameProgress").AddComponent<GameProgress>();
            progress.definitions = definitions;
            // ORIGINAL VIETNAMESE PLACEHOLDER VERSE, inspired by folk-song imagery.
            // It is not a quotation from, or a claim to represent, a traditional song.
            progress.openingVerse = "Trăng lên soi bến, đèn lam gọi mời,\nTheo nhịp cầu sáng, tìm sương giữa trời.";

            GameObject player = new GameObject("Player");
            CharacterController character = player.AddComponent<CharacterController>();
            character.height = 2f;
            character.radius = 0.35f;
            character.center = Vector3.up;
            character.stepOffset = 0.3f;
            character.skinWidth = 0.04f;
            character.minMoveDistance = 0f;
            PlayerController movement = player.AddComponent<PlayerController>();
            movement.progress = progress;
            player.AddComponent<PlayerInteractor>().progress = progress;
            progress.player = movement;

            // The root origin represents the player's feet. Only the CharacterController
            // provides collision; the visible capsule must not add a second collider.
            GameObject body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            body.name = "Player Visual";
            body.transform.SetParent(player.transform, false);
            body.transform.localPosition = Vector3.up;
            body.transform.localScale = new Vector3(0.7f, 1f, 0.7f);
            UnityEngine.Object.DestroyImmediate(body.GetComponent<Collider>());

            Transform cameraTarget = new GameObject("CameraTarget").transform;
            cameraTarget.SetParent(player.transform, false);
            cameraTarget.localPosition = new Vector3(0f, 1.2f, 0f);

            GameObject cameraObject = new GameObject("Main Camera", typeof(Camera), typeof(AudioListener));
            cameraObject.tag = "MainCamera";
            Camera camera = cameraObject.GetComponent<Camera>();
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.025f, 0.035f, 0.075f);
            camera.farClipPlane = 400f;
            CameraFollow follow = cameraObject.AddComponent<CameraFollow>();
            follow.target = cameraTarget;
            follow.SnapToTarget();
            movement.cameraTransform = cameraObject.transform;

            GameUI ui = CreateUI();
            progress.ui = ui;

            PlatformGenerator generator = new GameObject("WorldGenerator").AddComponent<PlatformGenerator>();
            generator.progress = progress;
            generator.player = movement;

            // A fresh scene contains no EventSystem, so this creates exactly one.
            // StandaloneInputModule matches this framework's legacy Input API.
            new GameObject("EventSystem", typeof(EventSystem), typeof(StandaloneInputModule));

            EditorSceneManager.MarkSceneDirty(scene);
            Selection.activeGameObject = player;
            SceneView.lastActiveSceneView?.Frame(new Bounds(Vector3.zero, Vector3.one * 18f), false);
            Debug.Log("Artifact Trail demo created. Save this scene under a new name, then press Play. " +
                "Use WASD, Space for jump/double jump, and E near the next artifact. " +
                "All included Vietnamese verses are original placeholders; assign your chosen song recording to the data assets.");
        }

        private static ArtifactDefinition[] LoadOrCreateDefinitions()
        {
            // These ORIGINAL prototype verses refer to the next generated landmark.
            // Their imagery can be replaced with clues drawn from a chosen folk song.
            string[] names =
            {
                "Hạt Sương Lam", "Tiếng Vọng Tím", "Mảnh Nắng Vàng",
                "Mầm Sống Xanh", "Vầng Trăng Trắng"
            };
            string[] verses =
            {
                "Sương lam gửi tiếng qua tầng mây xa,\nĂng-ten tím đợi, ngân nga lời nhà.",
                "Tiếng ngân theo gió qua nhịp cầu ngang,\nTìm nơi cổng sáng ôm màu nắng vàng.",
                "Qua cổng nắng vàng, nghe mầm lá gọi,\nVườn xanh giữa sao giữ lời chưa nói.",
                "Lá xanh ru nhẹ dưới trời mênh mang,\nMái vòm trắng đợi, tròn như vầng trăng.",
                "Trăng trao năm mảnh, đường kín bừng hồng,\nĐài sao tím hồng giấu giữa hư không."
            };
            Color[] colors =
            {
                new Color(0.1f, 0.9f, 1f), new Color(0.65f, 0.3f, 1f),
                new Color(1f, 0.7f, 0.1f), new Color(0.2f, 1f, 0.4f), Color.white
            };

            ArtifactDefinition[] result = new ArtifactDefinition[5];
            for (int i = 0; i < result.Length; i++)
            {
                string path = $"{DataFolder}/Artifact{i + 1}.asset";
                UnityEngine.Object existing = AssetDatabase.LoadMainAssetAtPath(path);
                if (existing != null)
                {
                    result[i] = existing as ArtifactDefinition;
                    if (result[i] == null)
                        throw new InvalidOperationException($"Cannot create demo data: {path} already contains another asset type.");
                    continue;
                }

                ArtifactDefinition definition = ScriptableObject.CreateInstance<ArtifactDefinition>();
                definition.artifactName = names[i];
                definition.verse = verses[i];
                definition.signalColor = colors[i];
                // No recording is fabricated or downloaded. Add an AudioClip in the Inspector.
                definition.songClip = null;
                AssetDatabase.CreateAsset(definition, path);
                result[i] = definition;
            }
            return result;
        }

        private static GameUI CreateUI()
        {
            GameObject canvasObject = new GameObject("HUD", typeof(RectTransform), typeof(Canvas),
                typeof(CanvasScaler), typeof(GraphicRaycaster), typeof(GameUI), typeof(AudioSource));
            Canvas canvas = canvasObject.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            CanvasScaler scaler = canvasObject.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1600f, 900f);
            scaler.matchWidthOrHeight = 0.5f;

            GameUI ui = canvasObject.GetComponent<GameUI>();
            ui.songSource = canvasObject.GetComponent<AudioSource>();
            ui.songSource.playOnAwake = false;
            ui.songSource.spatialBlend = 0f; // A diegetic recording can later use a world AudioSource.

            RectTransform cluePanel = Panel(canvasObject.transform, "Clue Panel", new Vector2(0f, 1f),
                new Vector2(0f, 1f), new Vector2(24f, -24f), new Vector2(650f, 245f));
            Text title = Label(cluePanel, "Clue Heading", "SONG CLUE · ORIGINAL PROTOTYPE VERSES", 18,
                new Vector2(24f, -20f), new Vector2(602f, 30f));
            title.color = new Color(0.4f, 0.9f, 1f);
            ui.clueText = Label(cluePanel, "Current Verse", "Follow the opening verse.", 23,
                new Vector2(24f, -66f), new Vector2(602f, 105f));
            ui.replayButton = Button(cluePanel, "Replay Song", "Replay song", new Vector2(24f, -185f), new Vector2(210f, 40f));

            ui.artifactCountText = Label(canvasObject.transform, "Artifact Count", "Artifacts found: 0 / 5", 27,
                new Vector2(30f, 100f), new Vector2(700f, 44f), false);
            ui.promptText = Label(canvasObject.transform, "Interaction Prompt", "WASD: move   Space: jump / double jump", 22,
                new Vector2(30f, 50f), new Vector2(1100f, 38f), false);
            ui.discoveryText = Label(canvasObject.transform, "Discovery Notification", "", 27,
                new Vector2(0f, -30f), new Vector2(900f, 70f));
            RectTransform discoveryRect = ui.discoveryText.rectTransform;
            discoveryRect.anchorMin = discoveryRect.anchorMax = new Vector2(0.5f, 1f);
            discoveryRect.pivot = new Vector2(0.5f, 1f);
            ui.discoveryText.alignment = TextAnchor.MiddleCenter;
            ui.discoveryText.color = new Color(0.45f, 1f, 0.75f);

            RectTransform dialogue = Panel(canvasObject.transform, "Artifact Choices", Vector2.one * 0.5f,
                Vector2.one * 0.5f, Vector2.zero, new Vector2(700f, 410f));
            ui.dialogueRoot = dialogue.gameObject;
            ui.dialogueTitleText = Label(dialogue, "Artifact Title", "Artifact", 30,
                new Vector2(30f, -24f), new Vector2(640f, 55f));
            ui.dialogueBodyText = Label(dialogue, "Artifact Description", "Choose how to interact.", 23,
                new Vector2(30f, -98f), new Vector2(640f, 150f));
            ui.listenButton = Button(dialogue, "Listen Choice", "Listen to the song", new Vector2(30f, -268f), new Vector2(305f, 52f));
            ui.collectButton = Button(dialogue, "Collect Choice", "Attune artifact", new Vector2(365f, -268f), new Vector2(305f, 52f));
            ui.leaveButton = Button(dialogue, "Leave Choice", "Leave for now", new Vector2(195f, -338f), new Vector2(310f, 48f));
            ui.dialogueRoot.SetActive(false);

            RectTransform victory = Panel(canvasObject.transform, "Hidden Observatory Reached", Vector2.one * 0.5f,
                Vector2.one * 0.5f, Vector2.zero, new Vector2(720f, 270f));
            ui.victoryRoot = victory.gameObject;
            Text victoryTitle = Label(victory, "Victory Title", "THE HIDDEN OBSERVATORY", 32,
                new Vector2(30f, -35f), new Vector2(660f, 60f));
            victoryTitle.alignment = TextAnchor.MiddleCenter;
            Text victoryBody = Label(victory, "Victory Description",
                "Five artifacts. One remembered song.\nYou have found the hidden location.\n\nYour journey is complete.",
                24, new Vector2(30f, -115f), new Vector2(660f, 130f));
            victoryBody.alignment = TextAnchor.MiddleCenter;
            ui.victoryRoot.SetActive(false);
            return ui;
        }

        private static RectTransform Panel(Transform parent, string name, Vector2 anchor,
            Vector2 pivot, Vector2 position, Vector2 size)
        {
            GameObject panel = new GameObject(name, typeof(RectTransform), typeof(Image));
            RectTransform rect = panel.GetComponent<RectTransform>();
            rect.SetParent(parent, false);
            rect.anchorMin = rect.anchorMax = anchor;
            rect.pivot = pivot;
            rect.anchoredPosition = position;
            rect.sizeDelta = size;
            panel.GetComponent<Image>().color = new Color(0.025f, 0.045f, 0.085f, 0.96f);
            return rect;
        }

        private static Text Label(Transform parent, string name, string text, int fontSize,
            Vector2 position, Vector2 size, bool topLeft = true)
        {
            GameObject label = new GameObject(name, typeof(RectTransform), typeof(Text));
            RectTransform rect = label.GetComponent<RectTransform>();
            rect.SetParent(parent, false);
            rect.anchorMin = rect.anchorMax = topLeft ? new Vector2(0f, 1f) : Vector2.zero;
            rect.pivot = topLeft ? new Vector2(0f, 1f) : Vector2.zero;
            rect.anchoredPosition = position;
            rect.sizeDelta = size;
            Text component = label.GetComponent<Text>();
            component.font = uiFont;
            component.fontSize = fontSize;
            component.text = text;
            component.color = Color.white;
            component.alignment = TextAnchor.UpperLeft;
            component.horizontalOverflow = HorizontalWrapMode.Wrap;
            component.verticalOverflow = VerticalWrapMode.Overflow;
            component.raycastTarget = false;
            return component;
        }

        private static Button Button(Transform parent, string name, string caption,
            Vector2 position, Vector2 size)
        {
            RectTransform rect = Panel(parent, name, new Vector2(0f, 1f), new Vector2(0f, 1f), position, size);
            rect.GetComponent<Image>().color = new Color(0.08f, 0.28f, 0.39f, 1f);
            Button button = rect.gameObject.AddComponent<Button>();
            button.targetGraphic = rect.GetComponent<Image>();
            Text text = Label(rect, "Label", caption, 21, Vector2.zero, size);
            text.alignment = TextAnchor.MiddleCenter;
            return button;
        }

        private static void EnsureFolder(string path)
        {
            if (AssetDatabase.IsValidFolder(path))
                return;
            int separator = path.LastIndexOf('/');
            string parent = path.Substring(0, separator);
            EnsureFolder(parent);
            AssetDatabase.CreateFolder(parent, path.Substring(separator + 1));
        }
    }
}
