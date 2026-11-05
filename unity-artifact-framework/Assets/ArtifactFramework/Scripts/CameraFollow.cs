using UnityEngine;

namespace ArtifactTrail
{
    /// <summary>
    /// Attach to Main Camera and assign the Player's CameraTarget child.
    /// The offset is in world space, so turning the player does not swing the camera.
    /// This intentionally simple camera has no mouse orbit or wall-obstruction solver.
    /// </summary>
    [DisallowMultipleComponent]
    public class CameraFollow : MonoBehaviour
    {
        [Tooltip("Use an empty child above the player's shoulders rather than the feet.")]
        public Transform target;
        public Vector3 offset = new Vector3(0f, 7f, -10f);
        [Min(0.01f)] public float smoothTime = 0.18f;
        [Tooltip("Larger values turn toward the target more quickly.")]
        [Min(0.01f)] public float rotationSharpness = 10f;

        private Vector3 followVelocity;
        private bool hasSnapped;

        private void OnEnable()
        {
            // Clear interpolation state if a scene or another system re-enables this camera.
            followVelocity = Vector3.zero;
            hasSnapped = false;
        }

        private void LateUpdate()
        {
            if (target == null)
                return;

            // LateUpdate observes movement completed in the player's Update this frame.
            // Snap the first frame to avoid flying in from the editor camera position.
            if (!hasSnapped)
            {
                SnapToTarget();
                return;
            }

            Vector3 desiredPosition = target.position + offset;
            transform.position = Vector3.SmoothDamp(transform.position, desiredPosition,
                ref followVelocity, smoothTime, Mathf.Infinity, Time.deltaTime);

            Vector3 lookDirection = target.position - transform.position;
            if (lookDirection.sqrMagnitude > 0.001f)
            {
                Quaternion desiredRotation = Quaternion.LookRotation(lookDirection, Vector3.up);
                // Exponential interpolation gives similar turning delay at different FPS.
                float blend = 1f - Mathf.Exp(-rotationSharpness * Time.deltaTime);
                transform.rotation = Quaternion.Slerp(transform.rotation, desiredRotation, blend);
            }
        }

        /// <summary>
        /// Removes follow delay immediately, useful after a player respawn or teleport.
        /// Safe to call before the first frame; a missing target is ignored.
        /// </summary>
        public void SnapToTarget()
        {
            if (target == null)
                return;

            transform.position = target.position + offset;
            followVelocity = Vector3.zero;
            Vector3 lookDirection = target.position - transform.position;
            if (lookDirection.sqrMagnitude > 0.001f)
                transform.rotation = Quaternion.LookRotation(lookDirection, Vector3.up);
            hasSnapped = true;
        }

        private void OnValidate()
        {
            smoothTime = Mathf.Max(0.01f, smoothTime);
            rotationSharpness = Mathf.Max(0.01f, rotationSharpness);
        }
    }
}
