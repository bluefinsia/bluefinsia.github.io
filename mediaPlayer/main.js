/* find the elements i want to interact with */
const videoElement = document.querySelector("#mediaPlayer");
const playPauseButton = document.querySelector("#playPauseButton");
const timeline = document.querySelector("#timelineProgress");

/* when JS loads remove default controls */
videoElement.removeAttribute("controls");

/* 
Play/pause button behaviour:
if media is not playing - When I click it begins the playback of the media file
if media is playing - When I click again it pauses the playback of the media file
Feedback:
toggle icon based on playing state
cursor change on hover
*/

function playPause(){
  if(videoElement.paused || videoElement.ended){
    videoElement.play();
    playPauseButton.textContent = "⏸";
  } else {
    videoElement.pause();
    playPauseButton.textContent = "▶";
  }
}

playPauseButton.addEventListener("click", playPause);

/* 
Timeline behaviour:
it should update as media playback occurs to show current time
i should be able to click and jump to particular time
*/

function updateTimeline(){
  /* find percentage of total time */
  let timePercent = (videoElement.currentTime / videoElement.duration) * 100;
  //console.log(timePercent);
  timeline.value = timePercent;
}

videoElement.addEventListener("timeupdate", updateTimeline);