const myCards = [
  { id: 1, name: "Queen", src: "queen.png" },
  { id: 2, name: "King", src: "king.png" },
  { id: 3, name: "Jack", src: "jack.png" },
];

let cardComposition = "";

for (let i = 0; i < myCards.length; i++) {
  cardComposition += `
<div class="card-container">
        <div class="card" draggable="true">
          <div class="card-face"><img src="cloud.png" alt="Back" /></div>
          <div class="card-face flip">
            <img src="${myCards[i].src}" alt="${myCards[i].name}" class="card-front" />
          </div>
        </div>
      </div>
`;
  // console.log(cardComposition);
}

const deck = document.querySelector(".deck");
deck.innerHTML = "";
deck.innerHTML = cardComposition;

const cards = document.querySelectorAll(".card");
// console.log(cards);

let draggedCard = null;

const dropBox = document.querySelector(".dropbox");
dropBox.innerHTML = "";
// loop through each created card, and add event listener 
for (let i = 0; i < cards.length; i++) {
  // console.log(cards[i]);
  // add our dragstart function
  cards[i].addEventListener("dragstart", function (){
    // when we start the drag, store which card is being dragged
    draggedCard = cards[i];
    // when we drag new card, always make sure dropbox is empty 
    dropBox.innerHTML = "";


  })
  // make sure that dropBox empty
}

dropBox.addEventListener("dragover", function (e) {
  e.preventDefault();
});

dropBox.addEventListener("drop", function () {
  // test to see if we're dragging a card and that the dropbox doesn't contain a card already
  if (draggedCard && !dropBox.querySelector(".card")) {
    const clone = draggedCard;
    clone.classList.remove("flip");
    clone.addEventListener("click", function () {
      clone.classList.toggle("flip");
    });
    dropBox.appendChild(clone);
  }
});
