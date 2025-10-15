const card = document.querySelector(".card");
// console.log(card);
let draggedCard = null;

card.addEventListener("dragstart", function () {
  // we want to know which card we are dragging
  draggedCard = card;
});
const dropBox = document.querySelector(".dropbox");
dropBox.innerHTML = "";

dropBox.addEventListener("dragover", function (e) {
  // prevent default event action
  e.preventDefault();
});

dropBox.addEventListener("drop", function () {
  // create new variable for our moved card
  let clone = draggedCard;
  // make sure it doesn't have the flip class
  clone.classList.remove("flip");
  // add click flip toggle
  clone.addEventListener("click", function () {
    clone.classList.toggle("flip");
  });
  // add it to the dropBox
  dropBox.appendChild(clone);
});
