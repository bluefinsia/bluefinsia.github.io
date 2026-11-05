using System.Collections.Generic;
using Unity.XR.CoreUtils;
using UnityEngine;
using UnityEngine.InputSystem.XR;
using UnityEngine.XR;
using UnityEngine.XR.Interaction.Toolkit;

namespace RiversVR
{
    /// <summary>
    /// Attach to XR Origin. The desktop preview must disable HMD pose driving explicitly:
    /// an enabled TrackedPoseDriver with unresolved controls can overwrite the fallback
    /// eye height with zero. In VR the standard driver provides Update/BeforeRender poses.
    /// </summary>
    [DefaultExecutionOrder(-300)]
    public class TrackingModeSwitcher : MonoBehaviour
    {
        public XROrigin xrOrigin;
        public TrackedPoseDriver headTracking;
        public XRRayInteractor artifactRay;
        public float desktopEyeHeight = 1.65f;
        private readonly List<XRDisplaySubsystem> displays = new List<XRDisplaySubsystem>();
        private bool initialized, previousXR;

        private void Awake() => Refresh();
        private void Update() => Refresh();

        private void Refresh()
        {
            displays.Clear();
            SubsystemManager.GetSubsystems(displays);
            bool running = false;
            foreach (XRDisplaySubsystem display in displays)
                running |= display.running;
            if (initialized && previousXR == running)
                return;
            initialized = true;
            previousXR = running;
            if (headTracking != null)
                headTracking.enabled = running;
            if (artifactRay != null)
                artifactRay.enabled = running;
            if (!running && xrOrigin != null && xrOrigin.Camera != null)
            {
                if (xrOrigin.CameraFloorOffsetObject != null)
                    xrOrigin.CameraFloorOffsetObject.transform.localPosition = Vector3.zero;
                xrOrigin.Camera.transform.localPosition = Vector3.up * desktopEyeHeight;
                xrOrigin.Camera.transform.localRotation = Quaternion.identity;
            }
        }
    }
}
