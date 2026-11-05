using UnityEngine;

namespace ArtifactTrail
{
    /// <summary>
    /// Attach to the Player root alongside a CharacterController, without a Rigidbody.
    /// Uses the legacy Horizontal/Vertical axes and Jump button (Space by default).
    /// Project Settings > Player > Active Input Handling must be Input Manager or Both.
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    [DisallowMultipleComponent]
    public class PlayerController : MonoBehaviour
    {
        [Header("Scene references")]
        [Tooltip("Assign Main Camera. Movement is relative to its horizontal viewing direction.")]
        public Transform cameraTransform;
        [Tooltip("The shared progression manager blocks movement while a choice is open.")]
        public GameProgress progress;
        [Tooltip("Optional initial checkpoint; the generator can replace it at runtime.")]
        public Transform respawnPoint;

        [Header("Movement")]
        [Min(0f)] public float moveSpeed = 6f;
        [Min(0.01f)] public float rotationSmoothTime = 0.12f;
        [Min(0f)] public float jumpHeight = 2f;
        [Tooltip("Negative downward acceleration in world units per second squared.")]
        public float gravity = -20f;
        [Min(1f)] public float terminalFallSpeed = 45f;
        public float killHeight = -12f;

        private CharacterController controller;
        private Vector3 checkpoint;
        private float verticalVelocity;
        private float turnVelocity;
        private bool airJumpAvailable = true;

        private void Awake()
        {
            controller = GetComponent<CharacterController>();
            checkpoint = respawnPoint != null ? respawnPoint.position : transform.position;

            // Inspector wiring is preferred, but a tagged Main Camera is a useful fallback.
            if (cameraTransform == null && Camera.main != null)
                cameraTransform = Camera.main.transform;
        }

        private void Update()
        {
            if (!controller.enabled)
                return;

            if (transform.position.y < killHeight)
            {
                TeleportTo(checkpoint);
                return;
            }

            float deltaTime = Time.deltaTime;
            bool inputBlocked = progress != null && progress.IsInputBlocked;

            // isGrounded describes the previous Move. Do not reset the air jump while
            // rising: the controller can briefly still report ground during takeoff.
            bool grounded = controller.isGrounded && verticalVelocity <= 0f;
            if (grounded)
            {
                verticalVelocity = -2f; // Small downward pressure keeps contact with slopes.
                airJumpAvailable = true;
            }

            Vector2 input = inputBlocked
                ? Vector2.zero
                : new Vector2(Input.GetAxisRaw("Horizontal"), Input.GetAxisRaw("Vertical"));
            input = Vector2.ClampMagnitude(input, 1f); // Prevent faster diagonal movement.

            Vector3 forward = cameraTransform != null ? cameraTransform.forward : Vector3.forward;
            forward.y = 0f; // A camera looking upward must not make the player fly.
            if (forward.sqrMagnitude < 0.001f)
                forward = Vector3.forward;
            forward.Normalize();
            Vector3 right = Vector3.Cross(Vector3.up, forward);
            Vector3 movementDirection = forward * input.y + right * input.x;

            if (movementDirection.sqrMagnitude > 0.001f)
            {
                float targetAngle = Mathf.Atan2(movementDirection.x, movementDirection.z) * Mathf.Rad2Deg;
                float angle = Mathf.SmoothDampAngle(transform.eulerAngles.y, targetAngle,
                    ref turnVelocity, rotationSmoothTime);
                transform.rotation = Quaternion.Euler(0f, angle, 0f);
            }
            else
            {
                // Discard turn smoothing momentum when the player stops or a modal opens.
                turnVelocity = 0f;
            }

            if (!inputBlocked && Input.GetButtonDown("Jump"))
            {
                if (grounded)
                {
                    // The ground jump leaves exactly one further jump available in midair.
                    verticalVelocity = JumpVelocity();
                }
                else if (airJumpAvailable)
                {
                    // Walking off a platform also allows one air jump. Resetting vertical
                    // speed makes the second jump useful even while the player is falling.
                    verticalVelocity = JumpVelocity();
                    airJumpAvailable = false;
                }
            }

            // Gravity still runs while choices block input: opening UI cannot freeze a fall.
            verticalVelocity = Mathf.Max(verticalVelocity + gravity * deltaTime, -terminalFallSpeed);
            Vector3 velocity = movementDirection * moveSpeed + Vector3.up * verticalVelocity;
            CollisionFlags collisions = controller.Move(velocity * deltaTime);

            // Stop upward velocity on a ceiling; downward gravity resumes on the next frame.
            if ((collisions & CollisionFlags.Above) != 0 && verticalVelocity > 0f)
                verticalVelocity = 0f;

            if ((collisions & CollisionFlags.Below) != 0 && verticalVelocity < 0f)
            {
                verticalVelocity = -2f;
                airJumpAvailable = true;
            }
        }

        private float JumpVelocity()
        {
            // v^2 = 2gh: jumpHeight specifies the approximate height of a full jump.
            return Mathf.Sqrt(2f * Mathf.Abs(gravity) * jumpHeight);
        }

        /// <summary>Updates the safe world position used after falling below killHeight.</summary>
        public void SetCheckpoint(Vector3 position)
        {
            checkpoint = position;
        }

        /// <summary>
        /// Moves the CharacterController safely without retaining fall or rotation momentum.
        /// Supply the root position that clears the ground for your CharacterController.center.
        /// In the demo, center.y is 1 and height is 2, so the root is at the player's feet.
        /// </summary>
        public void TeleportTo(Vector3 position)
        {
            // Cancel any artifact dialog before respawning at an earlier checkpoint.
            // A dialog opened while falling must never permit remote collection.
            if (progress != null)
                progress.CancelInteraction();

            if (controller == null)
                controller = GetComponent<CharacterController>();

            // Disable the capsule while relocating so collision resolution cannot resist
            // the teleport. Preserve its prior enabled state for callers managing it.
            bool wasEnabled = controller.enabled;
            controller.enabled = false;
            transform.position = position;
            controller.enabled = wasEnabled;
            verticalVelocity = 0f;
            turnVelocity = 0f;
            airJumpAvailable = true;

            if (cameraTransform != null)
            {
                CameraFollow follow = cameraTransform.GetComponent<CameraFollow>();
                if (follow != null)
                    follow.SnapToTarget();
            }
        }

        private void OnValidate()
        {
            moveSpeed = Mathf.Max(0f, moveSpeed);
            jumpHeight = Mathf.Max(0f, jumpHeight);
            rotationSmoothTime = Mathf.Max(0.01f, rotationSmoothTime);
            gravity = -Mathf.Max(0.01f, Mathf.Abs(gravity));
            terminalFallSpeed = Mathf.Max(1f, terminalFallSpeed);
        }
    }
}
