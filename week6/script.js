//we can use window to find certain properties
letwindowWidth = window.innerWidth;
//console.log(windowWidth);
//find out information about url location
//console.log(window.location);
//document can be use to find html
//console.log(document.title);
//set the tittle
//document.tittle = "new tittle"
//can find the body
//document.body.style.backgroundColor = "red";
//navigator can find more details of hardware/ software

const myImage = document.querySelector("#myImage");

console.log(myImage);

const firstParagraphs = document.querySelector(inner);

console.log(firstParagraphs);

myParagraphs.forEach(changeParaBG);

function changeParaBG(item) {
  console.log(item);
  item.style.backgroundColor = "red'";
}

//first find content of hello P
console.log(helloParagraph.textContent);

function updateCatName() {
  helloParagraph.textContent = `Hi! My name is ${myImage.dataset.catname}`;
  //classList.add() adds a class
  //classList.remove() remove a class
  //classList.toggle() toggle a class
  myImage.classList.add("round");
  myImage.classList.toggle("round");
}

//find outer sexction
const outerSection = document.querySelector(".outer");
const myButton = document.querySelector("my-button");

// create element using document methods
const newPara = document.createElement("p");
newPara.textContent = "I'm a new paragraph!";
newPara.classList.add("coral-box");
//document.body.appendChild(newPara);

//

//add new element to header
const myHeader = document.querySelector("header");
myHeader.innerHTML += ``;
