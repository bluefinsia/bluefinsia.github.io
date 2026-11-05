using System.Collections.Generic;
using UnityEngine;

namespace ArtifactTrail
{
    /// <summary>
    /// Attach to WorldGenerator at the world origin, with rotation zero and scale one.
    /// Generates a reproducible, finite path: start, five stations, then a hidden finale.
    /// Defaults use conservative gaps rather than unbounded random positions.
    /// Built-in renderer / Standard shader is used for this dependency-free demo.
    /// </summary>
    public class PlatformGenerator : MonoBehaviour
    {
        public GameProgress progress;
        public PlayerController player;
        public int seed = 2077;
        [Range(0, 4)] public int intermediatePlatforms = 2;
        [Range(0.6f, 1.5f)] public float edgeGap = 1.2f;

        private readonly List<Material> ownedMaterials = new List<Material>();
        private Transform generatedRoot;

        private void Start()
        {
            if (progress == null || player == null || progress.definitions == null ||
                progress.definitions.Length != GameProgress.ArtifactTotal)
            {
                Debug.LogError("Assign progression/player and exactly five ArtifactDefinition assets.", this);
                return;
            }
            for (int i = 0; i < progress.definitions.Length; i++)
            {
                if (progress.definitions[i] == null)
                {
                    Debug.LogError("All five artifact definition slots must be assigned.", this);
                    return;
                }
            }

            generatedRoot = new GameObject("Generated Route").transform;
            generatedRoot.SetParent(transform, false);
            System.Random random = new System.Random(seed);
            Material floor = MakeMaterial(new Color(0.12f, 0.18f, 0.25f));
            ArtifactCollectible[] artifacts = new ArtifactCollectible[GameProgress.ArtifactTotal];
            int stride = Mathf.Clamp(intermediatePlatforms, 0, 4) + 1;
            int lastIndex = stride * (GameProgress.ArtifactTotal + 1);
            Vector3 spawn = Vector3.zero;
            HiddenLocation destination = null;

            for (int i = 0; i <= lastIndex; i++)
            {
                // Platform centers vary by at most 1.5m sideways and 0.35m vertically.
                // Width/depth are 5m; a 1.2m edge gap is reachable with the 6m/s,
                // 2m-high player jump even without using the second jump.
                float x = i == 0 ? 0f : (float)(random.NextDouble() * 1.5 - 0.75);
                float y = i == 0 ? 0f : Mathf.Sin(i * 0.8f) * 0.25f;
                Vector3 center = transform.position + new Vector3(x, y,
                    i * (5f + Mathf.Clamp(edgeGap, 0.6f, 1.5f)));
                MakePrimitive("Platform " + i, PrimitiveType.Cube, center,
                    new Vector3(5f, 1f, 5f), floor, true);
                Vector3 checkpoint = center + Vector3.up * 0.65f;
                if (i == 0)
                    spawn = checkpoint;

                if (i > 0 && i < lastIndex && i % stride == 0)
                {
                    int artifactIndex = i / stride - 1;
                    ArtifactDefinition data = progress.definitions[artifactIndex];
                    Material signal = MakeMaterial(data.signalColor);
                    BuildLandmark(artifactIndex, center, signal);
                    GameObject root = new GameObject("Artifact " + (artifactIndex + 1) + " - " + data.artifactName);
                    root.transform.SetParent(generatedRoot, false);
                    root.transform.position = center + Vector3.up * 1.8f;
                    ArtifactCollectible artifact = root.AddComponent<ArtifactCollectible>();
                    GameObject visual = MakePrimitive("Artifact Visual", PrimitiveType.Sphere,
                        root.transform.position, Vector3.one * 0.65f, signal, false);
                    visual.transform.SetParent(root.transform, true);
                    artifact.visual = visual.transform;
                    artifact.Initialize(artifactIndex, data, checkpoint);
                    artifacts[artifactIndex] = artifact;
                }
                else if (i == lastIndex)
                {
                    GameObject root = new GameObject("Hidden Observatory");
                    root.transform.SetParent(generatedRoot, false);
                    root.transform.position = center + Vector3.up * 0.6f;
                    destination = root.AddComponent<HiddenLocation>();
                    GameObject beacon = MakePrimitive("Magenta Observatory Beacon", PrimitiveType.Cylinder,
                        center + Vector3.up * 3f, new Vector3(1.8f, 2.5f, 1.8f),
                        MakeMaterial(Color.magenta), false);
                    beacon.transform.SetParent(root.transform, true);
                    destination.visual = beacon;
                    destination.SetUnlocked(false);
                }
            }

            // CharacterController.center is (0,1,0) in the generated demo: the Player root
            // sits just above the platform surface. Set checkpoint before moving the player.
            player.SetCheckpoint(spawn);
            player.TeleportTo(spawn);
            progress.InitializeRoute(artifacts, destination);
        }

        private void BuildLandmark(int index, Vector3 platform, Material material)
        {
            // Landmarks sit at the far left/right edges, outside the central landing strip.
            // They are decorative, collider-free cues matching the supplied placeholder song.
            Vector3 side = platform + new Vector3(-1.7f, 0.5f, 1.4f);
            if (index == 0) // Cyan signal light.
                MakePrimitive("Cyan Signal", PrimitiveType.Cylinder, side + Vector3.up,
                    new Vector3(0.35f, 1f, 0.35f), material, false);
            else if (index == 1) // Violet antenna.
            {
                MakePrimitive("Violet Antenna", PrimitiveType.Cube, side + Vector3.up * 2f,
                    new Vector3(0.2f, 4f, 0.2f), material, false);
                MakePrimitive("Antenna Crossbar", PrimitiveType.Cube, side + Vector3.up * 3.5f,
                    new Vector3(1.2f, 0.15f, 0.15f), material, false);
            }
            else if (index == 2) // Golden arch.
            {
                foreach (float x in new[] { -1.7f, 1.7f })
                    MakePrimitive("Golden Arch Pillar", PrimitiveType.Cube,
                        platform + new Vector3(x, 2f, 1.6f), new Vector3(0.2f, 3f, 0.2f), material, false);
                MakePrimitive("Golden Arch Lintel", PrimitiveType.Cube,
                    platform + new Vector3(0f, 3.5f, 1.6f), new Vector3(3.6f, 0.2f, 0.2f), material, false);
            }
            else if (index == 3) // Green biogarden.
            {
                for (int n = 0; n < 3; n++)
                    MakePrimitive("Green Garden Growth", PrimitiveType.Sphere,
                        side + new Vector3(0f, 0.5f, -n * 0.8f),
                        new Vector3(0.6f, 1f, 0.6f), material, false);
            }
            else // White moon dome.
                MakePrimitive("White Moon Dome", PrimitiveType.Sphere,
                    side + Vector3.up * 0.6f, new Vector3(1.3f, 1.2f, 1.3f), material, false);
        }

        private GameObject MakePrimitive(string label, PrimitiveType type, Vector3 position,
            Vector3 scale, Material material, bool solid)
        {
            GameObject item = GameObject.CreatePrimitive(type);
            item.name = label;
            item.transform.SetParent(generatedRoot, false);
            item.transform.position = position;
            item.transform.localScale = scale;
            item.GetComponent<Renderer>().sharedMaterial = material;
            Collider collider = item.GetComponent<Collider>();
            if (!solid && collider != null)
            {
                // Disable immediately; Destroy itself is deferred until the end of the frame.
                collider.enabled = false;
                Destroy(collider);
            }
            return item;
        }

        private Material MakeMaterial(Color color)
        {
            Material material = new Material(Shader.Find("Standard"));
            material.color = color;
            material.EnableKeyword("_EMISSION");
            material.SetColor("_EmissionColor", color * 0.25f);
            ownedMaterials.Add(material);
            return material;
        }

        private void OnDestroy()
        {
            // Runtime-created materials are not assets; release them when the scene exits.
            foreach (Material material in ownedMaterials)
                if (material != null)
                    Destroy(material);
        }
    }
}
