using UnityEngine;

namespace RiversVR
{
    /// <summary>
    /// Attach to GameProgress. Owns sequence, choices, song clues and final completion.
    /// Based on the supplied GDD's researcher/photography/environmental interaction loop.
    /// </summary>
    public class GameProgress : MonoBehaviour
    {
        public const int ArtifactTotal = 5;
        public VRGameUI ui;
        public VRPlayerController player;
        public VRInputReader input;
        public ResearchCamera researchCamera;
        public ArtifactDefinition[] definitions = new ArtifactDefinition[ArtifactTotal];
        [TextArea(2, 5)] public string openingVerse =
            "Lên chùa bẻ một cành sen,\nLên chùa bẻ một cành sen.";
        [Min(0.5f)] public float interactionDistance = 4f;

        public int FoundCount { get; private set; }
        public bool IsCompleted { get; private set; }
        public HiddenLocation Destination { get; private set; }
        public bool IsInputBlocked => !ready || IsCompleted || pending != null ||
            (ui != null && ui.IsJournalOpen);
        public ArtifactInteractable CurrentArtifact => ready && FoundCount < ArtifactTotal ? route[FoundCount] : null;

        private bool ready;
        private ArtifactInteractable[] route;
        private ArtifactInteractable pending;

        public void InitializeRoute(ArtifactInteractable[] artifacts, HiddenLocation finalLocation)
        {
            if (ui == null || player == null || input == null || artifacts == null ||
                artifacts.Length != ArtifactTotal || finalLocation == null)
            {
                Debug.LogError("Rivers VR needs player/input/UI, five artifacts and a final location.", this);
                return;
            }
            for (int i = 0; i < artifacts.Length; i++)
                if (artifacts[i] == null || artifacts[i].Definition == null)
                {
                    Debug.LogError("An artifact or its data is missing.", this);
                    return;
                }

            route = artifacts;
            Destination = finalLocation;
            FoundCount = 0;
            pending = null;
            IsCompleted = false;
            ready = true;
            ui.Initialize(this);
            ui.SetCount(0);
            ui.SetSong(openingVerse, null);
            RefreshSignals();
            ui.ShowJournal(); // Read the opening clue, then close the panel to begin.
        }

        private void Update()
        {
            // The in-world journal can be recalled without attaching a lagging camera to
            // the headset. The menu button closes an interaction without consuming it.
            if (!ready || IsCompleted || input == null || !input.MenuPressedThisFrame)
                return;
            if (pending != null || ui.IsJournalOpen)
                CancelInteraction();
            else
                ui.ShowJournal();
        }

        public bool WithinReach(Vector3 position)
        {
            Transform head = player != null && player.xrOrigin != null && player.xrOrigin.Camera != null
                ? player.xrOrigin.Camera.transform : null;
            return head != null && (head.position - position).sqrMagnitude <=
                interactionDistance * interactionDistance;
        }

        private bool CanResolve(ArtifactInteractable artifact)
        {
            return ready && !IsCompleted && artifact != null && !artifact.IsResolved &&
                artifact == CurrentArtifact && artifact.SequenceIndex == FoundCount &&
                WithinReach(artifact.transform.position);
        }

        public void RequestInteraction(ArtifactInteractable artifact)
        {
            if (IsInputBlocked || !CanResolve(artifact))
                return;
            pending = artifact;
            ui.OpenChoices(artifact.Definition, Listen,
                () => Resolve(ArtifactResolution.PhotographAndPreserve),
                () => Resolve(ArtifactResolution.RestoreHabitat), CancelInteraction);
        }

        private void Listen()
        {
            if (!CanResolve(pending))
                return;
            ui.SetSong(pending.Definition.verse, pending.Definition.songClip);
            ui.PlaySong();
        }

        private void Resolve(ArtifactResolution choice)
        {
            // Validate both sequence and current distance again. Room-scale movement or
            // respawning after opening the panel must not permit remote collection.
            if (!CanResolve(pending))
            {
                CancelInteraction();
                return;
            }

            if (choice == ArtifactResolution.PhotographAndPreserve)
            {
                string photoPath;
                if (researchCamera == null || !researchCamera.TryCapture(pending.Definition.artifactName, out photoPath))
                {
                    ui.Notify("The photograph could not be recorded. Try again or choose Restore.");
                    return;
                }
                // This log is for developers. File paths are not part of the player's story UI.
                Debug.Log("Research photograph saved: " + photoPath, researchCamera);
            }

            ArtifactInteractable resolved = pending;
            resolved.Resolve(choice);
            FoundCount++;
            player.SetCheckpoint(resolved.Checkpoint);
            ui.SetCount(FoundCount);
            ui.SetSong(resolved.Definition.verse, resolved.Definition.songClip);
            ui.PlaySong();
            CancelInteraction();
            RefreshSignals();
            ui.ShowJournal();
            ui.Notify(choice == ArtifactResolution.RestoreHabitat
                ? "Artifact found. The cyanobacteria answer; a quiet light returns."
                : "Artifact found. Your photograph preserves a memory of this place.");
        }

        public void CancelInteraction()
        {
            pending = null;
            if (ui != null)
                ui.Close();
        }

        private void RefreshSignals()
        {
            for (int i = 0; i < route.Length; i++)
                route[i].SetCurrent(i == FoundCount);
            Destination.SetUnlocked(FoundCount == ArtifactTotal);
        }

        public void ReachHiddenLocation(HiddenLocation location)
        {
            if (IsInputBlocked || FoundCount != ArtifactTotal || location != Destination ||
                !WithinReach(location.transform.position))
                return;
            IsCompleted = true;
            ui.ShowVictory();
        }
    }
}
