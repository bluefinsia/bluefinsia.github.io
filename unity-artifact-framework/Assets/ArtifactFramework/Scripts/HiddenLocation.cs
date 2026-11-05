using UnityEngine;

namespace ArtifactTrail
{
    /// <summary>
    /// Attach to the hidden location root, never to its supporting platform. Hiding its
    /// visual leaves the route's collision intact before the fifth artifact is collected.
    /// </summary>
    public class HiddenLocation : MonoBehaviour
    {
        public GameObject visual;
        public bool IsUnlocked { get; private set; }

        public void SetUnlocked(bool value)
        {
            IsUnlocked = value;
            if (visual != null)
                visual.SetActive(value);
        }
    }
}
