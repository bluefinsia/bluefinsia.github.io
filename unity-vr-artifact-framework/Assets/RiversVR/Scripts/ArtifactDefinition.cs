using UnityEngine;

namespace RiversVR
{
    /// <summary>Designer data, not a component. Create exactly five ordered assets.</summary>
    [CreateAssetMenu(menuName = "Rivers VR/Artifact Definition")]
    public class ArtifactDefinition : ScriptableObject
    {
        public string artifactName;
        [TextArea(2, 6)] public string eventDialogue;
        [TextArea(2, 6)] public string verse;
        [Tooltip("Assign a sung excerpt of Đi Cấy that you have permission to distribute.")]
        public AudioClip songClip;
        public Color signalColor = Color.cyan;
    }
}
