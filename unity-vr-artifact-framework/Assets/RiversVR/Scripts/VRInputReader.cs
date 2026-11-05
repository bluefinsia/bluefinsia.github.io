using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.XR;

namespace RiversVR
{
    /// <summary>
    /// Attach to the XR Origin root. Uses Input System 1.7.0, not the legacy Input API.
    /// All controller actions are persistent references created before entering Play Mode.
    /// The rig's InputActionManager owns their shared asset's enabled lifetime; this reader
    /// never disables or disposes actions used by tracked hands, rays or the HMD.
    /// Enable an appropriate controller interaction profile in the OpenXR settings.
    /// </summary>
    [DefaultExecutionOrder(-200)]
    [DisallowMultipleComponent]
    public class VRInputReader : MonoBehaviour
    {
        [Header("Persistent Gameplay action references")]
        public InputActionReference moveAction;
        public InputActionReference turnAction;
        public InputActionReference jumpAction;
        public InputActionReference interactAction;
        public InputActionReference menuAction;

        public Vector2 Move { get; private set; }
        public float Turn { get; private set; }
        public bool JumpPressedThisFrame { get; private set; }
        public bool InteractPressedThisFrame { get; private set; }
        public bool InteractHeld { get; private set; }
        public bool MenuPressedThisFrame { get; private set; }
        public bool XRRunning { get; private set; }

        private readonly List<XRDisplaySubsystem> displays = new List<XRDisplaySubsystem>();

        private void Update()
        {
            RefreshXRState();
            if (XRRunning)
            {
                // Modal UI blocks gameplay in the player/progression scripts, not by
                // disabling the shared asset. Head/controller tracking stays immediate.
                Move = Vector2.ClampMagnitude(ReadVector2(moveAction), 1f);
                Turn = ReadVector2(turnAction).x;
                JumpPressedThisFrame = WasPressed(jumpAction);
                InteractPressedThisFrame = WasPressed(interactAction);
                InputAction interaction = Resolve(interactAction);
                InteractHeld = interaction != null && interaction.enabled && interaction.IsPressed();
                MenuPressedThisFrame = WasPressed(menuAction);
                return;
            }

            // Desktop preview is selected only when no XR display is running. Keyboard
            // input therefore cannot unexpectedly move a player wearing an active HMD.
            Keyboard keyboard = Keyboard.current;
            if (keyboard == null)
            {
                ClearFrameValues();
                return;
            }

            float x = (keyboard.dKey.isPressed || keyboard.rightArrowKey.isPressed ? 1f : 0f)
                - (keyboard.aKey.isPressed || keyboard.leftArrowKey.isPressed ? 1f : 0f);
            float y = (keyboard.wKey.isPressed || keyboard.upArrowKey.isPressed ? 1f : 0f)
                - (keyboard.sKey.isPressed || keyboard.downArrowKey.isPressed ? 1f : 0f);
            Move = Vector2.ClampMagnitude(new Vector2(x, y), 1f);
            Turn = 0f; // DesktopLook handles right-mouse look separately from VR snap turning.
            JumpPressedThisFrame = keyboard.spaceKey.wasPressedThisFrame;
            InteractPressedThisFrame = keyboard.eKey.wasPressedThisFrame;
            InteractHeld = keyboard.eKey.isPressed;
            MenuPressedThisFrame = keyboard.tabKey.wasPressedThisFrame;
        }

        private void RefreshXRState()
        {
            displays.Clear();
            SubsystemManager.GetSubsystems(displays);
            XRRunning = false;
            foreach (XRDisplaySubsystem display in displays)
            {
                if (display.running)
                {
                    XRRunning = true;
                    break;
                }
            }
        }

        private void OnDisable()
        {
            // These references belong to a shared serialized asset. InputActionManager
            // disables that asset when the rig exits; this component owns only its values.
            ClearFrameValues();
            XRRunning = false;
        }

        private static InputAction Resolve(InputActionReference reference)
        {
            return reference != null ? reference.action : null;
        }

        private static Vector2 ReadVector2(InputActionReference reference)
        {
            InputAction action = Resolve(reference);
            return action != null && action.enabled ? action.ReadValue<Vector2>() : Vector2.zero;
        }

        private static bool WasPressed(InputActionReference reference)
        {
            InputAction action = Resolve(reference);
            return action != null && action.enabled && action.WasPressedThisFrame();
        }

        private void ClearFrameValues()
        {
            Move = Vector2.zero;
            Turn = 0f;
            JumpPressedThisFrame = false;
            InteractPressedThisFrame = false;
            InteractHeld = false;
            MenuPressedThisFrame = false;
        }
    }
}
