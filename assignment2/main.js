/* find the elements i want to interact with */
const videoElement = document.querySelector("#mediaPlayer");
const playPauseButton = document.querySelector("#playPauseButton");
const playPauseIcon = document.querySelector("#playPauseIcon");
const timeline = document.querySelector("#timelineProgress");
const currentTimeText = document.querySelector("#currentTimeFeedback");
const totalTimeText = document.querySelector("#totalTimeFeedback");
const mediaSource = document.querySelector("#mediaSource");

// Comment related elements
const commentInput = document.querySelector("#commentInput");
const submitCommentButton = document.querySelector("#submitCommentButton");
const commentDisplayContainer = document.querySelector(
  "#commentDisplayContainer"
);
const commentMarkersContainer = document.querySelector("#commentMarkers");

/* when JS loads remove default controls */
videoElement.removeAttribute("controls");

// Array to store comments (in-memory storage)
let comments = [];

// I want to update total time based on the currently loaded media file
// this will run when page loads, but if I wanted to change the file afterwards, I'd have to
// update there too
videoElement.addEventListener("canplay", () => {
  updateTotalTime();
  renderCommentMarkers(); // Render markers once the duration is known
});

function updateTotalTime() {
  let videoSeconds = videoElement.duration;
  let totalMin = Math.floor(videoSeconds / 60);
  let totalSec = Math.floor(videoSeconds % 60); // Use Math.floor for seconds
  if (totalSec < 10) {
    totalSec = "0" + totalSec;
  }
  totalTimeText.textContent = `${totalMin}:${totalSec}`;
}

/* 
Play/pause button behaviour:
if media is not playing - When I click it begins the playback of the media file
if media is playing - When I click again it pauses the playback of the media file
Feedback:
toggle icon based on playing state
cursor change on hover
*/

function playPause() {
  if (videoElement.paused || videoElement.ended) {
    videoElement.play();
    playPauseIcon.src = "./assets/icons8-pause-30.png"; // fixed path
    playPauseIcon.alt = "pause icon";
  } else {
    videoElement.pause();
    playPauseIcon.src = "./assets/icons8-play-30.png"; // fixed path
    playPauseIcon.alt = "play icon";
  }
}

playPauseButton.addEventListener("click", playPause);

/* 
Timeline behaviour:
it should update as media playback occurs to show current time
i should be able to click and jump to particular time
*/

function updateTimeline() {
  /* find percentage of total time */
  let timePercent = (videoElement.currentTime / videoElement.duration) * 100;
  timeline.value = timePercent;
  updateCurrentTime();
  renderComments(); // Update visible comments during playback
}

function updateCurrentTime() {
  let videoSeconds = videoElement.currentTime;
  let totalMin = Math.floor(videoSeconds / 60);
  let totalSec = Math.floor(videoSeconds % 60);
  if (totalSec < 10) {
    totalSec = "0" + totalSec;
  }
  currentTimeText.textContent = `${totalMin}:${totalSec}`;
}

videoElement.addEventListener("timeupdate", updateTimeline);

// find when I click my timeline and then jump to appropriate time
timeline.addEventListener("click", jumpToTime);

function jumpToTime(ev) {
  // find how far from the left we clicked
  let clickX = ev.offsetX;
  // find how wide my timeline is
  let timeLineWidth = timeline.offsetWidth;
  // find the ratio of click to width
  let clickPercent = clickX / timeLineWidth;
  // update the current time
  videoElement.currentTime = videoElement.duration * clickPercent;
}

// Commenting functionality
submitCommentButton.addEventListener("click", addComment);

function addComment() {
  const commentText = commentInput.value.trim();
  if (commentText === "") {
    return; // Don't add empty comments
  }

  const currentTime = videoElement.currentTime;
  comments.push({ time: currentTime, text: commentText });

  // Sort comments by time to ensure they are displayed in order
  comments.sort((a, b) => a.time - b.time);

  commentInput.value = ""; // Clear the input field
  renderComments(); // Re-render comments
  renderCommentMarkers(); // Re-render markers to include the new one
}

function renderComments() {
  commentDisplayContainer.innerHTML = ""; // Clear existing comments

  // Display comments that have already occurred
  const currentVideoTime = videoElement.currentTime;

  comments.forEach((comment) => {
    // Only display comments that have passed or are very near the current time
    if (comment.time <= currentVideoTime + 0.5) {
      // +0.5s buffer for visibility
      const commentElement = document.createElement("p");
      commentElement.classList.add("comment");

      const timeSpan = document.createElement("span");
      timeSpan.classList.add("comment-time");
      timeSpan.textContent = formatTime(comment.time);

      commentElement.appendChild(timeSpan);
      commentElement.append(comment.text);
      commentDisplayContainer.appendChild(commentElement);
    }
  });
  // Auto-scroll to the bottom to show latest comments
  commentDisplayContainer.scrollTop = commentDisplayContainer.scrollHeight;
}

function renderCommentMarkers() {
  commentMarkersContainer.innerHTML = ""; // Clear existing markers

  if (!videoElement.duration || isNaN(videoElement.duration)) {
    return; // Can't render markers if duration is not available
  }

  comments.forEach((comment) => {
    const marker = document.createElement("div");
    marker.classList.add("comment-marker");
    const position = (comment.time / videoElement.duration) * 100;
    marker.style.left = `${position}%`;
    marker.title = `${formatTime(comment.time)}: ${comment.text}`; // Tooltip

    // Make marker clickable to jump to comment time
    marker.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent timeline click event from firing
      videoElement.currentTime = comment.time;
      if (videoElement.paused) {
        // Optional: Play if paused when jumping to a comment
        playPause();
      }
    });

    commentMarkersContainer.appendChild(marker);
  });
}

function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec < 10 ? "0" : ""}${sec}`;
}

// Song playlist functionality (as per your original code)
let currentSongNumber = 0;

const songArray = [
  "https://thelongesthumstore.sgp1.cdn.digitaloceanspaces.com/IM-2250/p-hase_Hes.mp3",
  "https://thelongesthumstore.sgp1.cdn.digitaloceanspaces.com/IM-2250/p-hase_Dry-Down-feat-Ben-Snaath.mp3",
  "https://thelongesthumstore.sgp1.cdn.digitaloceanspaces.com/IM-2250/p-hase_Leapt.mp3",
  "https://thelongesthumstore.sgp1.cdn.digitaloceanspaces.com/IM-2250/p-hase_Water-Feature.mp3",
];

function updateCurrentSong(songNumber) {
  mediaSource.src = songArray[songNumber];
  videoElement.load();
  videoElement.play();
  // Clear comments and re-render for new song (if you want comments per song)
  comments = []; // Reset comments for a new track
  renderComments();
  renderCommentMarkers();
}

videoElement.addEventListener("ended", playNextOnEnd);

function playNextOnEnd() {
  if (currentSongNumber < songArray.length - 1) {
    updateCurrentSong(currentSongNumber + 1);
    currentSongNumber += 1;
  } else {
    updateCurrentSong(0);
    currentSongNumber = 0;
  }
}

// Initial render of comments and markers if any exist on load
videoElement.addEventListener("loadedmetadata", () => {
  // This event fires when metadata (like duration) is loaded
  renderCommentMarkers();
});

// Immediately render comments if any are pre-loaded (though none are in this example)
renderComments();
renderCommentMarkers(); // Call initially in case video loads fast or has preset comments
