using System;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace ArtifactTrail
{
    /// <summary>
    /// Attach to Canvas. Uses built-in uGUI Text/Button components, not TextMeshPro.
    /// Assign every reference, or let the included editor command wire the demo for you.
    /// Use a dynamic font containing Vietnamese glyphs for final art/text production.
    /// </summary>
    public class GameUI : MonoBehaviour
    {
        public Text artifactCountText, promptText, clueText, discoveryText;
        public Text dialogueTitleText, dialogueBodyText;
        public GameObject dialogueRoot, victoryRoot;
        public Button listenButton, collectButton, leaveButton, replayButton;
        public AudioSource songSource;

        private AudioClip currentClip;
        private float notificationRemaining;

        public void Initialize(GameProgress progress)
        {
            // The demo keeps a visible cursor. No look-locking is required for this fixed
            // follow camera, so UI can always be operated by mouse, Tab and Enter.
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
            dialogueRoot.SetActive(false);
            victoryRoot.SetActive(false);
            discoveryText.text = "";
            promptText.text = "";
            replayButton.onClick.RemoveAllListeners();
            replayButton.onClick.AddListener(PlayCurrentSong);
            songSource.playOnAwake = false;
            songSource.spatialBlend = 0f; // Clues are audible consistently across the route.
        }

        private void Update()
        {
            if (notificationRemaining <= 0f)
                return;
            notificationRemaining -= Time.unscaledDeltaTime;
            if (notificationRemaining <= 0f)
                discoveryText.text = "";
        }

        public void SetCount(int count)
        {
            artifactCountText.text = "Artifacts found: " + count + " / " + GameProgress.ArtifactTotal;
        }

        public void SetPrompt(string prompt) => promptText.text = prompt;

        public void SetClue(string verse, AudioClip clip)
        {
            // The Canvas already supplies a heading; reserve this label's height for lyrics.
            clueText.text = verse;
            currentClip = clip;
            replayButton.interactable = clip != null;
        }

        public void PlayCurrentSong()
        {
            // Audio is optional in the base framework. Missing recordings never prevent
            // progression: the same clue is always readable in the persistent song panel.
            songSource.Stop();
            if (currentClip != null)
                songSource.PlayOneShot(currentClip);
        }

        public void OpenChoices(string name, Action listen, Action collect, Action leave)
        {
            dialogueTitleText.text = name;
            dialogueBodyText.text = "A lost transmission answers your presence.\nListen to its song, attune the artifact, or return later.";
            Bind(listenButton, listen);
            Bind(collectButton, collect);
            Bind(leaveButton, leave);
            dialogueRoot.SetActive(true);
            listenButton.Select();
        }

        // Rebinding clears our previous callbacks; reopening a dialog cannot accumulate
        // listeners and accidentally collect multiple artifacts on a single button press.
        private static void Bind(Button button, Action action)
        {
            button.onClick.RemoveAllListeners();
            button.onClick.AddListener(() => action());
        }

        public void CloseChoices()
        {
            dialogueRoot.SetActive(false);
            if (EventSystem.current != null)
                EventSystem.current.SetSelectedGameObject(null);
        }

        public void ShowDiscovery(string message)
        {
            discoveryText.text = message;
            notificationRemaining = 4f;
        }

        public void ShowVictory()
        {
            CloseChoices();
            victoryRoot.SetActive(true);
            // GameProgress blocks player input after completion. Keep the scene running
            // so the camera and particles can continue instead of freezing Time.timeScale.
        }
    }
}
