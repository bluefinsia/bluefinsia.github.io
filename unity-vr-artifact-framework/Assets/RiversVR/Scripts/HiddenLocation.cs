using UnityEngine;
using UnityEngine.XR.Interaction.Toolkit;

namespace RiversVR
{
    /// <summary>Attach to the sanctuary interaction root, separate from its solid floor.</summary>
    [RequireComponent(typeof(XRSimpleInteractable))]
    public class HiddenLocation : MonoBehaviour
    {
        public GameObject visual;
        public bool IsUnlocked { get; private set; }
        private GameProgress owner;

        private void OnEnable() => GetComponent<XRSimpleInteractable>().selectEntered.AddListener(OnSelected);
        private void OnDisable() => GetComponent<XRSimpleInteractable>().selectEntered.RemoveListener(OnSelected);
        public void Initialize(GameProgress manager) => owner = manager;

        public void SetUnlocked(bool value)
        {
            IsUnlocked = value;
            GetComponent<XRSimpleInteractable>().enabled = value;
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
