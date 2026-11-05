using UnityEngine;

namespace RiversVR
{
    /// <summary>
    /// Attach only to a separate spectator camera, never to the tracked XR Main Camera.
    /// The slight follow delay is for a desktop spectator view; delaying the HMD pose
    /// would make the rendered world lag behind the player's real head movement.
    /// </summary>
    [RequireComponent(typeof(Camera))]
    [DisallowMultipleComponent]
    public class SpectatorCameraFollow : MonoBehaviour
    {
        public Transform target;
        public Vector3 offset = new Vector3(0f, 2f, -4f);
        [Min(0.01f)] public float smoothTime = 0.18f;
        [Min(0.01f)] public float rotationSharpness = 8f;

        private Vector3 followVelocity;
        private bool hasSnapped;

        private void Awake()
        {
            // None keeps this camera out of the headset's stereo rendering. Assign a
            // RenderTexture or spectator display in the Inspector as appropriate.
            GetComponent<Camera>().stereoTargetEye = StereoTargetEyeMask.None;
        }

        private void OnEnable()
        {
            followVelocity = Vector3.zero;
            hasSnapped = false;
        }

        private void LateUpdate()
        {
            if (target == null)
                return;
            if (!hasSnapped)
            {
                SnapToTarget();
                return;
            }

            // Follow in world space: looking left/right in VR does not swing the
            // spectator camera around the player or feed back into locomotion.
            transform.position = Vector3.SmoothDamp(transform.position, target.position + offset,
                ref followVelocity, smoothTime, Mathf.Infinity, Time.deltaTime);
            Vector3 look = target.position - transform.position;
            if (look.sqrMagnitude > 0.001f)
            {
                float blend = 1f - Mathf.Exp(-rotationSharpness * Time.deltaTime);
                transform.rotation = Quaternion.Slerp(transform.rotation,
                    Quaternion.LookRotation(look, Vector3.up), blend);
            }
        }

        public void SnapToTarget()
        {
            if (target == null)
                return;
            transform.position = target.position + offset;
            followVelocity = Vector3.zero;
            Vector3 look = target.position - transform.position;
            if (look.sqrMagnitude > 0.001f)
                transform.rotation = Quaternion.LookRotation(look, Vector3.up);
            hasSnapped = true;
        }

        private void OnValidate()
        {
            smoothTime = Mathf.Max(0.01f, smoothTime);
            rotationSharpness = Mathf.Max(0.01f, rotationSharpness);
        }
    }
}
