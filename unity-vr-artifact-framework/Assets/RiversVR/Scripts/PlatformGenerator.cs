using System.Collections.Generic;
using UnityEngine;
using UnityEngine.XR.Interaction.Toolkit;

namespace RiversVR
{
    /// <summary>
    /// Attach to an empty WorldGenerator at rotation zero and scale one.
    /// Builds a finite, reproducible route through the GDD's pagoda/lotus, lamp,
    /// rice garden, four figures and moonlit porch before the hidden sanctuary.
    ///
    /// Terrain always stays present. Only an artifact's decorative restored state
    /// and the final destination's visual are hidden/revealed by progression.
    /// This primitive-built environment targets the Built-in Render Pipeline.
    /// </summary>
    [DisallowMultipleComponent]
    public class PlatformGenerator : MonoBehaviour
    {
        [Header("Scene references")]
        public GameProgress progress;
        public VRPlayerController player;
        public XRInteractionManager interactionManager;
        public TeleportationProvider teleportationProvider;
        [Tooltip("Serialized Standard material keeps its shader in player builds.")]
        public Material materialTemplate;

        [Header("Repeatable route")]
        public int seed = 2077;
        [Tooltip("Intermediate landing platforms before each of the five stations and finale.")]
        [Range(0, 3)] public int intermediatePlatforms = 1;
        [Tooltip("Surface-to-surface gap, not the distance between platform centers.")]
        [Range(0.4f, 1.2f)] public float edgeGap = 0.8f;

        private readonly List<Material> ownedMaterials = new List<Material>();
        private Transform generatedRoot;
        private Shader materialShader;
        private Material stone, water, foliage, bloom, moon, warm;

        private void Start()
        {
            // Fail before creating a partial level. The editor helper assigns all these
            // references, but explicit validation also helps when wiring a scene manually.
            if (progress == null || player == null || interactionManager == null ||
                teleportationProvider == null || progress.definitions == null ||
                progress.definitions.Length != 5)
            {
                Debug.LogError("WorldGenerator needs progression, player, interaction manager, " +
                    "teleportation provider and exactly five artifact definitions.", this);
                return;
            }

            for (int i = 0; i < progress.definitions.Length; i++)
            {
                if (progress.definitions[i] == null)
                {
                    Debug.LogError("Assign every artifact definition before generating the route.", this);
                    return;
                }
            }

            materialShader = materialTemplate != null ? materialTemplate.shader : Shader.Find("Standard");
            if (materialShader == null)
            {
                Debug.LogError("This demo uses the Built-in Render Pipeline's Standard shader.", this);
                return;
            }

            generatedRoot = new GameObject("Generated Palace Route").transform;
            generatedRoot.SetParent(transform, false);
            Material floor = MakeMaterial(new Color(0.12f, 0.23f, 0.26f));
            stone = MakeMaterial(new Color(0.28f, 0.38f, 0.37f));
            water = MakeMaterial(new Color(0.10f, 0.30f, 0.35f));
            foliage = MakeMaterial(new Color(0.22f, 0.55f, 0.35f));
            bloom = MakeMaterial(new Color(0.18f, 0.95f, 0.79f), 0.65f);
            moon = MakeMaterial(new Color(0.82f, 0.91f, 1f), 0.45f);
            warm = MakeMaterial(new Color(1f, 0.72f, 0.30f), 0.45f);

            // With the default one intermediate platform, stride=2 and lastIndex=12:
            // start + six legs of two platforms = 13 platforms in total.
            int stride = Mathf.Clamp(intermediatePlatforms, 0, 3) + 1;
            int lastIndex = stride * 6;
            float spacing = 5f + Mathf.Clamp(edgeGap, 0.4f, 1.2f);
            System.Random random = new System.Random(seed);
            ArtifactInteractable[] artifacts = new ArtifactInteractable[5];
            HiddenLocation finalLocation = null;
            Vector3 spawn = Vector3.zero;

            BuildSurroundings(lastIndex * spacing);
            for (int i = 0; i <= lastIndex; i++)
            {
                // Independent offsets stay within +/-0.5m, so neighboring 5m-wide
                // platforms still overlap laterally. The sine height variation is only
                // +/-0.12m, with less than 0.2m difference between consecutive landings.
                float x = i == 0 ? 0f : (float)(random.NextDouble() - 0.5);
                float y = i == 0 ? 0f : Mathf.Sin(i * 0.7f) * 0.12f;
                Vector3 center = transform.position + new Vector3(x, y, i * spacing);
                GameObject platform = MakeShape("Platform " + i, PrimitiveType.Cube,
                    center, new Vector3(5f, 1f, 5f), floor, true);

                // XRI interaction layer 2 is reserved for the left-hand teleport ray.
                // It is independent of Unity's physics layers. Every landing is valid
                // for teleportation, including the start and finale supporting platform.
                BoxCollider floorCollider = platform.GetComponent<BoxCollider>();
                TeleportationArea area = platform.AddComponent<TeleportationArea>();
                area.interactionManager = interactionManager;
                area.interactionLayers = (InteractionLayerMask)2;
                area.teleportationProvider = teleportationProvider;
                area.teleportTrigger = BaseTeleportationInteractable.TeleportTrigger.OnSelectExited;
                if (!area.colliders.Contains(floorCollider))
                    area.colliders.Add(floorCollider);

                Vector3 surface = center + Vector3.up * 0.5f;
                Vector3 checkpoint = surface + Vector3.up * 0.1f;
                if (i == 0)
                    spawn = checkpoint;

                if (i > 0 && i < lastIndex && i % stride == 0)
                {
                    int artifactIndex = i / stride - 1;
                    BuildLandmark(artifactIndex, surface);
                    artifacts[artifactIndex] = BuildArtifact(artifactIndex, surface, checkpoint);
                }
                else if (i == lastIndex)
                {
                    finalLocation = BuildFinalLocation(surface);
                }
            }

            // The root position represents feet on the surface. Respawn also clears
            // old falling velocity and any pending interaction in the player controller.
            player.SetCheckpoint(spawn);
            player.Respawn();
            progress.InitializeRoute(artifacts, finalLocation);
        }

        private ArtifactInteractable BuildArtifact(int index, Vector3 surface, Vector3 checkpoint)
        {
            ArtifactDefinition data = progress.definitions[index];
            GameObject root = new GameObject("Artifact " + (index + 1) + " - " + data.artifactName);
            root.transform.SetParent(generatedRoot, false);
            root.transform.position = surface + Vector3.up * 1.2f;

            // Keep the interaction collider on a stable root. Only the child visual
            // bobs; otherwise proximity checks and the selection ray would oscillate.
            SphereCollider interactionCollider = root.AddComponent<SphereCollider>();
            interactionCollider.radius = 0.42f;
            interactionCollider.isTrigger = true;
            XRSimpleInteractable selectable = root.AddComponent<XRSimpleInteractable>();
            ConfigureArtifactSelection(selectable, interactionCollider);
            ArtifactInteractable artifact = root.AddComponent<ArtifactInteractable>();

            GameObject visual = MakeShape("Floating Artifact Visual", PrimitiveType.Sphere,
                root.transform.position, Vector3.one * 0.6f,
                MakeMaterial(data.signalColor, 0.35f));
            visual.transform.SetParent(root.transform, true);
            artifact.visual = visual.transform;

            // Each restoration choice reveals new cyanobacteria at that station.
            // These collider-free decorations never remove or replace walkable terrain.
            GameObject restored = new GameObject("Restored Cyanobacteria Garden");
            restored.transform.SetParent(root.transform, false);
            restored.transform.position = surface;
            for (int n = 0; n < 5; n++)
            {
                Vector3 position = surface + new Vector3(-1.6f + n * 0.8f, 0.12f, -1.5f);
                GameObject growth = MakeShape("Restored Living Light", PrimitiveType.Sphere,
                    position, new Vector3(0.35f, 0.22f + n % 2 * 0.15f, 0.35f), bloom);
                growth.transform.SetParent(restored.transform, true);
            }
            restored.SetActive(false);
            artifact.restoredVisual = restored;
            artifact.Initialize(progress, index, data, checkpoint);
            return artifact;
        }

        private HiddenLocation BuildFinalLocation(Vector3 surface)
        {
            GameObject root = new GameObject("Hidden Sanctuary - Warmth Within, Peace Without");
            root.transform.SetParent(generatedRoot, false);
            root.transform.position = surface + Vector3.up;
            SphereCollider interactionCollider = root.AddComponent<SphereCollider>();
            interactionCollider.radius = 0.65f;
            interactionCollider.isTrigger = true;
            XRSimpleInteractable selectable = root.AddComponent<XRSimpleInteractable>();
            ConfigureArtifactSelection(selectable, interactionCollider);

            GameObject visual = new GameObject("Revealed Sanctuary Light");
            visual.transform.SetParent(root.transform, false);
            for (int n = 0; n < 3; n++)
            {
                GameObject lantern = MakeShape("Sanctuary Lantern", PrimitiveType.Sphere,
                    surface + new Vector3((n - 1) * 1.25f, 1.2f + n % 2 * 0.55f, 0.8f),
                    Vector3.one * 0.5f, warm);
                lantern.transform.SetParent(visual.transform, true);
            }
            GameObject halo = MakeShape("Sanctuary Memory", PrimitiveType.Sphere,
                surface + Vector3.up * 2.2f, new Vector3(0.9f, 0.3f, 0.9f), bloom);
            halo.transform.SetParent(visual.transform, true);

            HiddenLocation destination = root.AddComponent<HiddenLocation>();
            destination.visual = visual;
            destination.Initialize(progress);
            destination.SetUnlocked(false);
            return destination;
        }

        private void ConfigureArtifactSelection(XRSimpleInteractable selectable, Collider collider)
        {
            selectable.interactionManager = interactionManager;
            // XRI layer 1 is reserved for artifact/finale selection, separate from floors.
            selectable.interactionLayers = (InteractionLayerMask)1;
            if (!selectable.colliders.Contains(collider))
                selectable.colliders.Add(collider);
        }

        private void BuildLandmark(int index, Vector3 surface)
        {
            // Landmarks illustrate images from the GDD's supplied Đi Cấy lyrics.
            // All are decorative: the center landing strip remains unobstructed.
            if (index == 0)
            {
                foreach (float x in new[] { -1.7f, 1.7f })
                    MakeShape("Pagoda Ruin Pillar", PrimitiveType.Cube,
                        surface + new Vector3(x, 1f, 1.5f), new Vector3(0.28f, 2f, 0.28f), stone);
                MakeShape("Pagoda Roof Fragment", PrimitiveType.Cube,
                    surface + new Vector3(0f, 2.15f, 1.5f), new Vector3(4.2f, 0.25f, 1.15f), stone);
                BuildLotus(surface + new Vector3(-1.35f, 0.13f, 0.1f));
            }
            else if (index == 1)
            {
                MakeShape("Ancient Dining Table", PrimitiveType.Cube,
                    surface + new Vector3(-1.25f, 0.55f, 1.2f), new Vector3(1.1f, 0.15f, 1f), stone);
                MakeShape("Lamp Stem", PrimitiveType.Cylinder,
                    surface + new Vector3(-1.25f, 0.9f, 1.2f), new Vector3(0.1f, 0.3f, 0.1f), stone);
                MakeShape("Remembered Lamplight", PrimitiveType.Sphere,
                    surface + new Vector3(-1.25f, 1.3f, 1.2f), Vector3.one * 0.45f, warm);
            }
            else if (index == 2)
            {
                MakeShape("Irrigated Rice Garden", PrimitiveType.Cube,
                    surface + new Vector3(0f, 0.025f, 1.5f), new Vector3(3.8f, 0.05f, 1.1f), water);
                for (int row = 0; row < 2; row++)
                    for (int n = 0; n < 6; n++)
                        MakeShape("Rice Shoot", PrimitiveType.Cylinder,
                            surface + new Vector3(-1.5f + n * 0.6f, 0.35f, 1.2f + row * 0.6f),
                            new Vector3(0.07f, 0.3f, 0.07f), foliage);
            }
            else if (index == 3)
            {
                for (int n = 0; n < 4; n++)
                {
                    Vector3 feet = surface + new Vector3(-1.65f + n * 1.1f, 0f, 1.5f);
                    MakeShape("Remembered Figure Body", PrimitiveType.Cylinder,
                        feet + Vector3.up * 0.5f, new Vector3(0.3f, 0.5f, 0.3f), stone);
                    MakeShape("Remembered Figure Head", PrimitiveType.Sphere,
                        feet + Vector3.up * 1.18f, Vector3.one * 0.35f, moon);
                }
            }
            else
            {
                foreach (float x in new[] { -1.7f, 1.7f })
                    MakeShape("Moonlit Porch Column", PrimitiveType.Cube,
                        surface + new Vector3(x, 1.05f, 1.4f), new Vector3(0.2f, 2.1f, 0.2f), stone);
                MakeShape("Moonlit Porch Lintel", PrimitiveType.Cube,
                    surface + new Vector3(0f, 2.2f, 1.4f), new Vector3(4f, 0.2f, 0.3f), stone);
                MakeShape("Moon Memory", PrimitiveType.Sphere,
                    surface + new Vector3(0f, 2.85f, 1.5f), Vector3.one * 0.7f, moon);
            }
        }

        private void BuildLotus(Vector3 center)
        {
            MakeShape("Lotus Leaf", PrimitiveType.Sphere, center,
                new Vector3(1.3f, 0.08f, 1.1f), foliage);
            for (int n = 0; n < 6; n++)
            {
                float angle = n * Mathf.PI / 3f;
                Vector3 offset = new Vector3(Mathf.Cos(angle), 0.15f, Mathf.Sin(angle)) * 0.3f;
                GameObject petal = MakeShape("Living Lotus Petal", PrimitiveType.Sphere,
                    center + offset, new Vector3(0.48f, 0.25f, 0.25f), bloom);
                petal.transform.rotation = Quaternion.Euler(0f, -n * 60f, 25f);
            }
            MakeShape("Lotus Heart", PrimitiveType.Sphere, center + Vector3.up * 0.22f,
                Vector3.one * 0.24f, warm);
        }

        private void BuildSurroundings(float routeLength)
        {
            // A broad, collider-free water surface sells the flooded palace without
            // trapping the CharacterController. Falling still reaches the player's kill height.
            MakeShape("Flooded Palace Water", PrimitiveType.Cube,
                transform.position + new Vector3(0f, -0.85f, routeLength * 0.5f),
                new Vector3(32f, 0.12f, routeLength + 24f), water);
            for (int n = 0; n < 5; n++)
            {
                float z = routeLength * n / 4f;
                foreach (float x in new[] { -7f, 7f })
                    MakeShape("Flooded Palace Outer Column", PrimitiveType.Cube,
                        transform.position + new Vector3(x, 1.3f, z),
                        new Vector3(0.8f, 4.2f, 0.8f), stone);
            }
        }

        private GameObject MakeShape(string label, PrimitiveType type, Vector3 worldPosition,
            Vector3 scale, Material material, bool solid = false)
        {
            GameObject item = GameObject.CreatePrimitive(type);
            item.name = label;
            item.transform.SetParent(generatedRoot, false);
            item.transform.position = worldPosition;
            item.transform.localScale = scale;
            item.GetComponent<Renderer>().sharedMaterial = material;
            Collider collider = item.GetComponent<Collider>();
            if (!solid && collider != null)
            {
                // Destroy is deferred, so disabling first prevents a one-frame obstacle.
                collider.enabled = false;
                Destroy(collider);
            }
            return item;
        }

        private Material MakeMaterial(Color color, float emission = 0f)
        {
            Material material = materialTemplate != null ? new Material(materialTemplate) : new Material(materialShader);
            material.color = color;
            material.SetFloat("_Glossiness", 0.55f);
            if (emission > 0f)
            {
                material.EnableKeyword("_EMISSION");
                material.SetColor("_EmissionColor", color * emission);
            }
            ownedMaterials.Add(material);
            return material;
        }

        private void OnDestroy()
        {
            // Only our runtime-created objects/materials are removed. Imported assets
            // and any manually authored scene objects remain owned by their author.
            if (generatedRoot != null)
                Destroy(generatedRoot.gameObject);
            foreach (Material material in ownedMaterials)
                if (material != null)
                    Destroy(material);
        }
    }
}
