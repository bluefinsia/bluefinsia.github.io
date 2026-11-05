using UnityEngine;
using UnityEngine.XR.Interaction.Toolkit;

namespace RiversVR
{
    /// <summary>
    /// Attach to an artifact's stable root with XRSimpleInteractable and a collider.
    /// Controller selection and desktop E both call the same authoritative game manager.
    /// The object is archived through interaction rather than attached to a virtual hand.
    /// </summary>
    [RequireComponent(typeof(XRSimpleInteractable))]
    public class ArtifactInteractable : MonoBehaviour
    {
        public Transform visual;
        public GameObject restoredVisual;
        public ArtifactDefinition Definition { get; private set; }
        public int SequenceIndex { get; private set; }
        public bool IsResolved { get; private set; }
        public Vector3 Checkpoint { get; private set; }
        public ArtifactResolution Resolution { get; private set; }

        private GameProgress owner;
        private XRSimpleInteractable interactable;
        private Vector3 basePosition, baseScale;
        private bool isCurrent;

        private void Awake() => interactable = GetComponent<XRSimpleInteractable>();
        private void OnEnable() => GetComponent<XRSimpleInteractable>().selectEntered.AddListener(OnSelected);
        private void OnDisable() => GetComponent<XRSimpleInteractable>().selectEntered.RemoveListener(OnSelected);

        public void Initialize(GameProgress manager, int index, ArtifactDefinition data, Vector3 checkpoint)
        {
            owner = manager;
            SequenceIndex = index;
            Definition = data;
            Checkpoint = checkpoint;
            if (visual != null)
            {
                basePosition = visual.localPosition;
                baseScale = visual.localScale;
            }
            if (restoredVisual != null)
                restoredVisual.SetActive(false);
        }

        private void OnSelected(SelectEnterEventArgs args)
        {
            // Never move/delay the tracked hand or head to animate an interaction.
            if (owner != null)
                owner.RequestInteraction(this);
        }

        public void SetCurrent(bool current)
        {
            isCurrent = current;
            // Later artifacts remain visible but cannot be selected out of order.
            interactable.enabled = current && !IsResolved;
        }

        public void Resolve(ArtifactResolution choice)
        {
            IsResolved = true;
            Resolution = choice;
            interactable.enabled = false;
            if (visual != null)
                visual.gameObject.SetActive(false);
            if (restoredVisual != null)
                restoredVisual.SetActive(choice == ArtifactResolution.RestoreHabitat);
        }

        private void Update()
        {
            if (visual == null || IsResolved)
                return;
            visual.Rotate(0f, 25f * Time.deltaTime, 0f, Space.Self);
            visual.localPosition = basePosition + Vector3.up * Mathf.Sin(Time.time * 1.8f) * 0.08f;
            visual.localScale = baseScale * (isCurrent ? 1f + Mathf.Sin(Time.time * 2f) * 0.08f : 0.7f);
        }
    }
}
