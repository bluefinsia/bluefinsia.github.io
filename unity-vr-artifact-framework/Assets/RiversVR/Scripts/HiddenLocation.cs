using UnityEngine;
using UnityEngine.XR.Interaction.Toolkit;
#if RIVERS_XRI_3
using XRSimpleInteractable = UnityEngine.XR.Interaction.Toolkit.Interactables.XRSimpleInteractable;
#endif

namespace RiversVR
{
    /// <summary>Attach to the sanctuary interaction root, separate from its solid floor.</summary>
    [RequireComponent(typeof(XRSimpleInteractable))]
    public class HiddenLocation : MonoBehaviour
    {
        public GameObject visual;
        public bool IsUnlocked { get; private set; }
        private GameProgress owner;
        private Collider[] selectionColliders;

        private void OnEnable() => GetComponent<XRSimpleInteractable>().selectEntered.AddListener(OnSelected);
        private void OnDisable() => GetComponent<XRSimpleInteractable>().selectEntered.RemoveListener(OnSelected);
        public void Initialize(GameProgress manager) => owner = manager;

        public void SetUnlocked(bool value)
        {
            IsUnlocked = value;
            GetComponent<XRSimpleInteractable>().enabled = value;
            if (selectionColliders == null)
                selectionColliders = GetComponents<Collider>();
            // A hidden/locked destination must not leave an invisible ray obstruction.
            // These are only root interaction colliders, never the supporting platform.
            foreach (Collider hitTarget in selectionColliders)
                if (hitTarget != null)
                    hitTarget.enabled = value;
            if (visual != null)
                visual.SetActive(value);
            // The supporting platform and its teleport area always remain solid/available.
        }

        private void OnSelected(SelectEnterEventArgs args)
        {
            if (owner != null && IsUnlocked)
                owner.ReachHiddenLocation(this);
        }
    }
}
