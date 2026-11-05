using UnityEngine;

namespace RiversVR
{
    /// <summary>
    /// Attach to XR Origin for an editor fallback without a headset. The XR controllers use
    /// XRSimpleInteractable events directly; E is intentionally disabled during XR sessions.
    /// </summary>
    public class DesktopInteractor : MonoBehaviour
    {
        public Camera view;
        public VRInputReader input;
        public GameProgress progress;

        private void Update()
        {
            if (view == null || input == null || progress == null || input.XRRunning || progress.IsInputBlocked)
                return;
            Ray ray = view.ViewportPointToRay(new Vector3(0.5f, 0.5f, 0f));
            RaycastHit hit;
            if (!Physics.Raycast(ray, out hit, progress.interactionDistance, ~0, QueryTriggerInteraction.Collide))
                return;
            ArtifactInteractable artifact = hit.collider.GetComponentInParent<ArtifactInteractable>();
            HiddenLocation destination = hit.collider.GetComponentInParent<HiddenLocation>();
            if (input.InteractPressedThisFrame)
            {
                if (artifact != null)
                    progress.RequestInteraction(artifact);
                else if (destination != null && destination.IsUnlocked)
                    progress.ReachHiddenLocation(destination);
            }
        }
    }
}
