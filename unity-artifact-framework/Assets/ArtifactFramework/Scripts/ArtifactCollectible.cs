using UnityEngine;

namespace ArtifactTrail
{
    /// <summary>
    /// Attach to each artifact root. PlatformGenerator creates and initializes five of these.
    /// The visual child animates independently so interaction distance/checkpoints never bob.
    /// No trigger or Rigidbody is required: PlayerInteractor checks proximity explicitly.
    /// </summary>
    public class ArtifactCollectible : MonoBehaviour
    {
        public Transform visual;
        public ArtifactDefinition Definition { get; private set; }
        public int SequenceIndex { get; private set; }
        public bool IsCollected { get; private set; }
        public Vector3 CheckpointPosition { get; private set; }

        private bool isCurrent;
        private Vector3 restingPosition;
        private Vector3 restingScale;

        public void Initialize(int index, ArtifactDefinition definition, Vector3 checkpoint)
        {
            SequenceIndex = index;
            Definition = definition;
            CheckpointPosition = checkpoint;
            IsCollected = false;
            if (visual != null)
            {
                restingPosition = visual.localPosition;
                restingScale = visual.localScale;
            }
        }

        public void SetCurrent(bool value)
        {
            isCurrent = value;
        }

        private void Update()
        {
            if (visual == null || IsCollected)
                return;

            visual.Rotate(0f, 45f * Time.deltaTime, 0f, Space.Self);
            // A small pulse communicates availability without revealing the next clue.
            float pulse = isCurrent ? 1f + Mathf.Sin(Time.time * 3f) * 0.12f : 0.65f;
            visual.localScale = restingScale * pulse;
            visual.localPosition = restingPosition + Vector3.up *
                (Mathf.Sin(Time.time * 2f + SequenceIndex) * 0.12f);
        }

        public void MarkCollected()
        {
            IsCollected = true;
            isCurrent = false;
            if (visual != null)
                visual.gameObject.SetActive(false);
        }
    }
}
