using Unity.XR.CoreUtils;
using UnityEngine;
using UnityEngine.XR.Interaction.Toolkit;

namespace RiversVR
{
    /// <summary>
    /// Attach to the XR Origin root with a CharacterController; do not add a Rigidbody.
    /// Artificial locomotion moves the origin while TrackedPoseDriver continues to track
    /// the HMD and hands directly. Never smooth or overwrite the headset's tracked pose.
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    [DisallowMultipleComponent]
    public class VRPlayerController : MonoBehaviour
    {
        [Header("Scene references")]
        public XROrigin xrOrigin;
        public VRInputReader input;
        public GameProgress progress;
        public LocomotionSystem locomotionSystem;
        public TeleportationProvider teleportationProvider;
        [Tooltip("Left-hand teleport ray only. The right-hand ray remains active for UI.")]
        public XRRayInteractor teleportRay;

        [Header("Artificial movement")]
        [Min(0f)] public float moveSpeed = 3f;
        [Min(0f)] public float jumpHeight = 1f;
        public float gravity = -9.81f;
        [Min(1f)] public float terminalFallSpeed = 25f;
        [Tooltip("Off by default in VR. Desktop preview still supports jumping.")]
        public bool allowVRJump = false;
        public bool enableDoubleJump = true;
        [Range(15f, 90f)] public float snapTurnAngle = 45f;
        public float killY = -8f;

        [Header("Room-scale capsule")]
        [Min(0.3f)] public float minimumCapsuleHeight = 0.6f;
        [Min(0.6f)] public float maximumCapsuleHeight = 2.4f;

        private CharacterController controller;
        private Vector3 checkpoint;
        private float verticalVelocity;
        private bool airJumpAvailable = true;
        private bool turnLatched;
        private TeleportationProvider subscribedProvider;

        private void Awake()
        {
            controller = GetComponent<CharacterController>();
            if (xrOrigin == null)
                xrOrigin = GetComponent<XROrigin>();
            if (input == null)
                input = GetComponent<VRInputReader>();
            checkpoint = transform.position;
        }

        private void OnEnable()
        {
            // XRI owns discrete teleport movement. Reset falling state only when that
            // provider reports completion, rather than guessing from transform changes.
            subscribedProvider = teleportationProvider;
            if (subscribedProvider != null)
                subscribedProvider.endLocomotion += OnTeleportCompleted;
        }

        private void OnDisable()
        {
            if (subscribedProvider != null)
                subscribedProvider.endLocomotion -= OnTeleportCompleted;
            subscribedProvider = null;
        }

        private void OnTeleportCompleted(LocomotionSystem system)
        {
            if (progress != null)
                progress.CancelInteraction();
            ResetVerticalMotion();
        }

        private void Update()
        {
            if (xrOrigin == null || xrOrigin.Camera == null || input == null || !controller.enabled)
                return;

            if (transform.position.y < killY)
            {
                Respawn();
                return;
            }

            bool blocked = progress != null && progress.IsInputBlocked;
            if (teleportRay != null)
            {
                // Disable only the locomotion ray while choices/journal are open; the
                // separate right-hand ray must remain able to select UI buttons.
                bool allowTeleportRay = !blocked && input.XRRunning;
                if (teleportRay.enabled != allowTeleportRay)
                    teleportRay.enabled = allowTeleportRay;
            }
            UpdateCapsule();

            // A provider with exclusive locomotion access can reposition the origin.
            // Do not apply even gravity during that operation: CharacterController.Move
            // must not compete with XRI teleportation in the same frame.
            if (locomotionSystem != null && locomotionSystem.busy)
            {
                ApplySnapTurn(true); // Consume a held turn without changing the origin.
                return;
            }
            ApplySnapTurn(blocked);

            // isGrounded describes the previous Move. Reset the air jump only while
            // descending: a just-launched controller can briefly still report ground.
            bool grounded = controller.isGrounded && verticalVelocity <= 0f;
            if (grounded)
            {
                verticalVelocity = -2f;
                airJumpAvailable = true;
            }

            Vector2 movement = blocked ? Vector2.zero : input.Move;
            Vector3 forward = xrOrigin.Camera.transform.forward;
            forward.y = 0f;
            if (forward.sqrMagnitude < 0.001f)
                forward = transform.forward;
            forward.Normalize();
            Vector3 right = Vector3.Cross(Vector3.up, forward);
            Vector3 horizontalVelocity = (forward * movement.y + right * movement.x) * moveSpeed;

            bool jumpEnabled = !input.XRRunning || allowVRJump;
            if (!blocked && jumpEnabled && input.JumpPressedThisFrame)
            {
                if (grounded)
                {
                    verticalVelocity = JumpVelocity();
                    // The ground jump does not consume the one midair allowance.
                }
                else if (enableDoubleJump && airJumpAvailable)
                {
                    verticalVelocity = JumpVelocity();
                    airJumpAvailable = false;
                }
            }

            // UI blocks intentional locomotion, not physics: a panel cannot pause a fall.
            verticalVelocity = Mathf.Max(verticalVelocity + gravity * Time.deltaTime, -terminalFallSpeed);
            CollisionFlags collisions = controller.Move(
                (horizontalVelocity + Vector3.up * verticalVelocity) * Time.deltaTime);

            if ((collisions & CollisionFlags.Above) != 0 && verticalVelocity > 0f)
                verticalVelocity = 0f;
            if ((collisions & CollisionFlags.Below) != 0 && verticalVelocity < 0f)
            {
                verticalVelocity = -2f;
                airJumpAvailable = true;
            }
        }

        private void UpdateCapsule()
        {
            // The headset can move within the tracked room while the origin stays still.
            // Center the collision capsule beneath that tracked head, rather than pulling
            // the camera back to the origin or smoothing the user's physical movement.
            Vector3 headInRoot = transform.InverseTransformPoint(xrOrigin.Camera.transform.position);
            float height = Mathf.Clamp(headInRoot.y, minimumCapsuleHeight, maximumCapsuleHeight);
            controller.height = Mathf.Max(height, controller.radius * 2f);
            controller.center = new Vector3(headInRoot.x,
                controller.height * 0.5f + controller.skinWidth, headInRoot.z);
        }

        private void ApplySnapTurn(bool blocked)
        {
            float axis = input.Turn;
            if (Mathf.Abs(axis) < 0.2f)
                turnLatched = false;

            if (Mathf.Abs(axis) < 0.7f || turnLatched)
                return;

            // Consume a held stick even while a panel is open. Closing UI cannot trigger
            // a surprise turn; the player must release and push the stick again.
            turnLatched = true;
            if (blocked)
                return;

            // Turning around the camera keeps the head's world position fixed even when
            // the user has physically walked away from the tracking origin's center.
            xrOrigin.RotateAroundCameraUsingOriginUp(Mathf.Sign(axis) * snapTurnAngle);
            UpdateCapsule();
        }

        private float JumpVelocity()
        {
            return Mathf.Sqrt(2f * Mathf.Abs(gravity) * jumpHeight);
        }

        /// <summary>Sets a world-space point on top of a safe platform, beneath the head.</summary>
        public void SetCheckpoint(Vector3 worldPoint)
        {
            checkpoint = worldPoint;
        }

        /// <summary>
        /// Places the tracked head over the checkpoint without changing its physical
        /// tracking pose. The checkpoint is a floor point, not an eye-height position.
        /// </summary>
        public void Respawn()
        {
            if (controller == null)
                controller = GetComponent<CharacterController>();
            if (progress != null)
                progress.CancelInteraction();

            bool wasEnabled = controller.enabled;
            controller.enabled = false;
            if (xrOrigin != null && xrOrigin.Camera != null)
            {
                float eyeHeight = Mathf.Clamp(xrOrigin.Camera.transform.position.y -
                    xrOrigin.transform.position.y, minimumCapsuleHeight, maximumCapsuleHeight);
                // MoveCameraToWorldLocation accounts for room-scale X/Z displacement,
                // unlike assigning origin.position directly to the platform's center.
                xrOrigin.MoveCameraToWorldLocation(checkpoint + Vector3.up * eyeHeight);
            }
            else
            {
                transform.position = checkpoint;
            }

            ResetVerticalMotion();
            turnLatched = false;
            controller.enabled = wasEnabled;
            if (xrOrigin != null && xrOrigin.Camera != null)
                UpdateCapsule();
        }

        /// <summary>
        /// Call after XRI teleportation completes to discard a preceding fall/jump.
        /// The scene builder wires this to the TeleportationProvider end event rather
        /// than guessing a teleport from unusually large changes in root position.
        /// </summary>
        public void ResetVerticalMotion()
        {
            verticalVelocity = 0f;
            airJumpAvailable = true;
        }

        private void OnValidate()
        {
            moveSpeed = Mathf.Max(0f, moveSpeed);
            jumpHeight = Mathf.Max(0f, jumpHeight);
            gravity = -Mathf.Max(0.01f, Mathf.Abs(gravity));
            terminalFallSpeed = Mathf.Max(1f, terminalFallSpeed);
            minimumCapsuleHeight = Mathf.Max(0.3f, minimumCapsuleHeight);
            maximumCapsuleHeight = Mathf.Max(minimumCapsuleHeight, maximumCapsuleHeight);
        }
    }
}
