const hoverClickButton = document.querySelector("#hoverclick-button");
// console.log(hoverClickButton);
hoverClickButton.addEventListener("click", function () {
  // we want to link to flip.html
  // we can change the url using the loaction.href attribute
  console.log(location.href);
  //set the value of location : requires string value of html file name 
  location.href = "flip.html"; 
});

const dragDropButton = document.querySelector("#dragdrop-button");
// console.log(dragDropButton);
dragDropButton.addEventListener("click", function () {
  // we want to change textContent to ...
  dragDropButton.textContent = "...";
  // then we want to link to dragdrop.html after 1 second
  //create delay variable : needs to be number of ms
  let delay = 1000;
  // use setTimeout
  setTimeout(function(){
    location.href = "dragdrop.html";
  }, delay);
});

const multiDragDropButton = document.querySelector("#multidragdrop-button");
// console.log(multiDragDropButton);
multiDragDropButton.addEventListener("click", function () {
  location.href = "multidragdrop.html";
});

const findQueenButton = document.querySelector("#findqueen-button");
// console.log(findQueenButton);
findQueenButton.addEventListener("click", function () {
  location.href = "findqueen.html";
});

const gameButton = document.querySelector("#completegame-button");
// console.log(gameButton);
gameButton.addEventListener("click", function () {
  location.href = "game.html";
});
