using UnityEngine;

namespace ArtifactTrail
{
    /// <summary>
    /// Attach to GameProgress. This is the only authority allowed to collect artifacts.
    /// Artifacts remain ordered even if the player skips platforms or presses a button twice.
    /// </summary>
    [DisallowMultipleComponent]
    public class GameProgress : MonoBehaviour
    {
        public const int ArtifactTotal = 5;
        public GameUI ui;
        public PlayerController player;
        [Min(0.5f)] public float interactionRadius = 3f;
        [Tooltip("Exactly five assets, in the order players must discover them.")]
        public ArtifactDefinition[] definitions = new ArtifactDefinition[ArtifactTotal];
        [TextArea(2, 4)] public string openingVerse =
            "Trăng lên soi bến ngân hà,\nĐèn lam đầu lối gọi ta bước vào.";

        public int FoundCount { get; private set; }
        public bool IsFinished { get; private set; }
        public bool IsInputBlocked => pending != null || IsFinished || !isReady;
        public ArtifactCollectible CurrentArtifact =>
            isReady && FoundCount < ArtifactTotal ? route[FoundCount] : null;
        public HiddenLocation Destination { get; private set; }

        private ArtifactCollectible[] route;
        private ArtifactCollectible pending;
        private bool isReady;

        // Called once by PlatformGenerator after all runtime objects have been created.
        public void InitializeRoute(ArtifactCollectible[] artifacts, HiddenLocation destination)
        {
            if (ui == null || player == null || artifacts == null ||
                artifacts.Length != ArtifactTotal || destination == null)
            {
                Debug.LogError("Assign UI/player and generate exactly five artifacts plus a destination.", this);
                return;
            }

            route = artifacts;
            Destination = destination;
            FoundCount = 0;
            IsFinished = false;
            pending = null;
            isReady = true;
            ui.Initialize(this);
            ui.SetCount(FoundCount);
            ui.SetClue(openingVerse, null);
            RefreshSignals();
        }

        private void Update()
        {
            // Cancelling a choice never changes progression or consumes an artifact.
            if (pending != null && Input.GetKeyDown(KeyCode.Escape))
                CancelInteraction();
        }

        public bool CanCollect(ArtifactCollectible artifact)
        {
            return isReady && !IsFinished && artifact != null && !artifact.IsCollected &&
                artifact == CurrentArtifact && artifact.SequenceIndex == FoundCount &&
                IsWithinReach(artifact.transform.position);
        }

        public bool IsWithinReach(Vector3 position)
        {
            // UI confirmation uses this same range check as the player's prompt. A fall,
            // teleport or future moving platform cannot allow remote artifact collection.
            return player != null && (position - player.transform.position).sqrMagnitude <=
                interactionRadius * interactionRadius;
        }

        public void RequestInteraction(ArtifactCollectible artifact)
        {
            if (IsInputBlocked || !CanCollect(artifact))
                return;

            pending = artifact; // Capture the exact object; never resolve a new target on click.
            ui.OpenChoices(artifact.Definition.artifactName, ListenToPending,
                ConfirmCollection, CancelInteraction);
        }

        private void ListenToPending()
        {
            if (pending == null || !CanCollect(pending))
                return;
            ui.SetClue(pending.Definition.verse, pending.Definition.songClip);
            ui.PlayCurrentSong();
        }

        private void ConfirmCollection()
        {
            // Validate again: UI callbacks can be invoked more than once or after state changes.
            if (!CanCollect(pending))
            {
                CancelInteraction();
                return;
            }

            ArtifactCollectible collected = pending;
            collected.MarkCollected();
            FoundCount++;
            player.SetCheckpoint(collected.CheckpointPosition);
            ui.SetCount(FoundCount);
            ui.SetClue(collected.Definition.verse, collected.Definition.songClip);
            ui.PlayCurrentSong();
            ui.ShowDiscovery("Artifact found: " + collected.Definition.artifactName);
            CancelInteraction();
            RefreshSignals();
        }

        public void CancelInteraction()
        {
            pending = null;
            if (ui != null)
                ui.CloseChoices();
        }

        private void RefreshSignals()
        {
            // All terrain stays present. Only the current artifact pulses; the finale's
            // beacon stays hidden until all five have been confirmed.
            for (int i = 0; i < route.Length; i++)
                route[i].SetCurrent(i == FoundCount);
            Destination.SetUnlocked(FoundCount == ArtifactTotal);
        }

        public void ReachHiddenLocation(HiddenLocation location)
        {
            if (IsInputBlocked || FoundCount != ArtifactTotal || location != Destination ||
                !IsWithinReach(location.transform.position))
                return;
            IsFinished = true;
            ui.SetPrompt("");
            ui.ShowVictory();
        }
    }
}
