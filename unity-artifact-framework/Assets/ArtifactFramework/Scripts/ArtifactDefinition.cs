using UnityEngine;

namespace ArtifactTrail
{
    /// <summary>
    /// A reusable data asset, not a component. Create one for each of the five artifacts.
    /// The verse on artifact N should hint at artifact N+1; verse five reveals the finale.
    /// Keep recording rights separate from the age/public-domain status of a folk melody.
    /// </summary>
    [CreateAssetMenu(menuName = "Artifact Trail/Artifact Definition")]
    public class ArtifactDefinition : ScriptableObject
    {
        public string artifactName = "Ancient signal";
        [TextArea(3, 6)] public string verse;
        [Tooltip("Optional recorded/sung rendition of this clue. Text works without audio.")]
        public AudioClip songClip;
        public Color signalColor = Color.cyan;
    }
}
