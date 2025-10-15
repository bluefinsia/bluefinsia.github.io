const card = document.querySelector(".card");
// console.log(card);

// Flip on hover
// card.addEventListener("mouseenter", flipMe);
// card.addEventListener("mouseleave", revertBack);
// function flipMe() {
//   // we want to add the flip class
//   card.classList.add("flip");
// }
// function revertBack() {
//   // we want to remove the flip class
//   card.classList.remove("flip");
// }

// Flip on click
  card.addEventListener("click", toggleFlip);

  function toggleFlip() {
// we want to toggle the flip class
  card.classList.toggle("flip");
 }
