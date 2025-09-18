/* find the element i want to interact with */
const videoElement = document.querySelector("#mediaPlayer");
const playPauseButton = document.querySelector("#playPauseButton");
const timeline = document.querySelector("controls");


/*
Play/pause button behaviour:
if media is not playing - When I click it begins the playback of the media file
if media is playing - When I click it pause the playback of the media file
Feedback:
toggle icon based on playing state
cursor change on hover
*/

function playPause(){
    if(videoElement.paused || videoElement.ended){
        videoElement.play();
    } else { 
        videoElement.pause();

    }
}

playPauseButton.addEventListener("click")

/*
Timeline behaviour: 
it should update as media playback occurs to show current time
i should be able to click and jump to particular time
*/