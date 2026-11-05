using UnityEngine;

namespace ArtifactTrail
{
    /// <summary>
    /// Attach to the Player. E opens choices for the next artifact in range, or enters the
    /// unlocked finale. Direct distance checks avoid trigger/Rigidbody setup dependencies.
    /// </summary>
    [RequireComponent(typeof(PlayerController))]
    public class PlayerInteractor : MonoBehaviour
    {
        public GameProgress progress;

        private void Update()
        {
            if (progress == null || progress.ui == null)
                return;

            if (progress.IsInputBlocked)
            {
                progress.ui.SetPrompt("");
                return;
            }

            ArtifactCollectible target = progress.CurrentArtifact;
            if (target != null && IsNear(target.transform.position))
            {
                progress.ui.SetPrompt("[E] Interact: " + target.Definition.artifactName);
                if (Input.GetKeyDown(KeyCode.E))
                    progress.RequestInteraction(target);
                return;
            }

            HiddenLocation destination = progress.Destination;
            if (destination != null && destination.IsUnlocked && IsNear(destination.transform.position))
            {
                progress.ui.SetPrompt("[E] Enter the hidden observatory");
                if (Input.GetKeyDown(KeyCode.E))
                    progress.ReachHiddenLocation(destination);
                return;
            }

            progress.ui.SetPrompt("WASD / arrows: move   Space: jump / double jump");
        }

        private bool IsNear(Vector3 position)
        {
            // The manager repeats this check on confirmation, using one shared radius.
            // Distance includes height: falling below a platform prevents interaction.
            return progress.IsWithinReach(position);
        }
    }
}
