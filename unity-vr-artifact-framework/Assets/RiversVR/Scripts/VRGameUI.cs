using System;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace RiversVR
{
    /// <summary>
    /// Attach to the world-space journal Canvas. XRI's TrackedDeviceGraphicRaycaster and
    /// XRUIInputModule deliver right-controller button clicks (mouse works in desktop mode).
    /// The panel is positioned once when opened, rather than dragging behind headset motion.
    /// </summary>
    public class VRGameUI : MonoBehaviour
    {
        public Canvas worldCanvas;
        public Transform head;
        public VRInputReader input;
        public Text countText, promptText, verseText, notificationText, titleText, eventText;
        public GameObject choicesRoot, victoryRoot;
        public Button listenButton, photoButton, restoreButton, leaveButton, replayButton;
        public AudioSource songSource;
        public bool IsJournalOpen { get; private set; }

        private GameProgress owner;
        private AudioClip currentClip;
        private float noticeTime;
        private CanvasGroup interactionGate;
        private bool waitForTriggerRelease;

        public void Initialize(GameProgress progress)
        {
            owner = progress;
            interactionGate = GetComponent<CanvasGroup>();
            if (interactionGate == null)
                interactionGate = gameObject.AddComponent<CanvasGroup>();
            worldCanvas.worldCamera = head.GetComponent<Camera>();
            songSource.spatialBlend = 0f;
            songSource.playOnAwake = false;
            Bind(replayButton, PlaySong);
            Bind(leaveButton, owner.CancelInteraction);
            notificationText.text = "";
            Close();
        }

        private void Update()
        {
            // Opening a panel from trigger-down must not click a newly appeared choice
            // with that same press. Require release before accepting the next UI press.
            if (waitForTriggerRelease && (input == null || !input.InteractHeld))
            {
                waitForTriggerRelease = false;
                interactionGate.interactable = true;
                interactionGate.blocksRaycasts = true;
            }
            if (noticeTime > 0f)
            {
                noticeTime -= Time.unscaledDeltaTime;
                if (noticeTime <= 0f)
                    notificationText.text = "";
            }
        }

        public void SetCount(int count) => countText.text = "Artifacts found: " + count + " / 5";
        public void SetSong(string verse, AudioClip clip)
        {
            verseText.text = verse;
            currentClip = clip;
            replayButton.interactable = clip != null;
        }
        public void PlaySong()
        {
            songSource.Stop();
            if (currentClip != null)
                songSource.PlayOneShot(currentClip);
        }

        public void ShowJournal()
        {
            IsJournalOpen = true;
            choicesRoot.SetActive(false);
            victoryRoot.SetActive(false);
            titleText.text = "Đi Cấy · Field journal";
            eventText.text = "Read the song. Follow its images through the palace ruins.";
            promptText.text = "Close to explore · Left primary button / Tab recalls this journal";
            Bind(leaveButton, owner.CancelInteraction);
            OpenAtComfortableDistance();
        }

        public void OpenChoices(ArtifactDefinition data, Action listen, Action photo, Action restore, Action leave)
        {
            IsJournalOpen = false; // The manager's pending artifact blocks input instead.
            titleText.text = data.artifactName;
            eventText.text = data.eventDialogue;
            promptText.text = "Aim the right ray at a choice and press its trigger";
            victoryRoot.SetActive(false);
            choicesRoot.SetActive(true);
            Bind(listenButton, listen);
            Bind(photoButton, photo);
            Bind(restoreButton, restore);
            Bind(leaveButton, leave);
            OpenAtComfortableDistance();
        }

        private void OpenAtComfortableDistance()
        {
            Vector3 forward = Vector3.ProjectOnPlane(head.forward, Vector3.up);
            if (forward.sqrMagnitude < 0.001f)
                forward = Vector3.forward;
            forward.Normalize();
            transform.position = head.position + forward * 2f - Vector3.up * 0.1f;
            // Canvas local +Z points away from the viewer; its front faces back toward them.
            transform.rotation = Quaternion.LookRotation(forward, Vector3.up);
            worldCanvas.enabled = true;
            waitForTriggerRelease = true;
            interactionGate.interactable = false;
            interactionGate.blocksRaycasts = false;
            worldCanvas.gameObject.SetActive(true);
        }

        public void Close()
        {
            IsJournalOpen = false;
            if (worldCanvas != null)
            {
                worldCanvas.enabled = false;
                // Disabling only Canvas rendering would leave its UI raycaster active.
                // Disable the root too, so invisible buttons cannot intercept controller rays.
                worldCanvas.gameObject.SetActive(false);
            }
            if (EventSystem.current != null)
                EventSystem.current.SetSelectedGameObject(null);
        }

        private static void Bind(Button button, Action callback)
        {
            button.onClick.RemoveAllListeners();
            button.onClick.AddListener(() => callback());
        }

        public void Notify(string text)
        {
            notificationText.text = text;
            noticeTime = 7f;
        }

        public void ShowVictory()
        {
            IsJournalOpen = false;
            choicesRoot.SetActive(false);
            victoryRoot.SetActive(true);
            titleText.text = "There are rivers in the sky";
            eventText.text = "This changed world was Earth. You found a home still learning to live.";
            promptText.text = "Five artifacts · One remembered song";
            leaveButton.gameObject.SetActive(false);
            OpenAtComfortableDistance();
        }
    }
}
