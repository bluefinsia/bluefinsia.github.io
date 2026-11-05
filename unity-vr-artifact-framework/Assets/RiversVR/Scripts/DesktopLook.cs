using UnityEngine;
using UnityEngine.InputSystem;

namespace RiversVR
{
    /// <summary>
    /// Optional no-headset preview: attach to the tracked camera alongside TrackedPoseDriver.
    /// This component never writes the camera pose while an XR display is running.
    /// Hold right mouse to look; the ordinary pointer remains available for UI buttons.
    /// </summary>
    public class DesktopLook : MonoBehaviour
    {
        public VRInputReader input;
        public GameProgress progress;
        [Min(0.01f)] public float sensitivity = 0.12f;
        private float yaw, pitch;

        private void LateUpdate()
        {
            if (input == null || input.XRRunning || Mouse.current == null ||
                (progress != null && progress.IsInputBlocked) || !Mouse.current.rightButton.isPressed)
                return;
            Vector2 delta = Mouse.current.delta.ReadValue();
            yaw += delta.x * sensitivity;
            pitch = Mathf.Clamp(pitch - delta.y * sensitivity, -75f, 75f);
            transform.localRotation = Quaternion.Euler(pitch, yaw, 0f);
        }
    }
}
