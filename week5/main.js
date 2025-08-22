//variables
//this is how
const documentBody = document.querySelector("body");
console.log(documentBody);
const myName = "Sia";
let myHungriness = 0.3;
console.log(myHungriness);
myHungriness = 0.5;
console.log(myHungriness);

//console.log() sends message to browser console
console.log("hello");

let stepNumber = 4;
console.log("Taking step:", stepNumber, "...I think");

let name = prompt("What's your name");

// let name = prompt ("What's your name?");

//strings
let firstName = "Sia";
let sureName = "Le";
let quote = "This is a'quote'";
console.log(quote);
let nameString = `My full name

is ${firstName} ${sureName}`;
console.log(nameString);

//type coversation
let myAge = 37;
let timePass = "5";
let updatedAge = myAge + parseInt(timePass);

//math operator
console.log(updatedAge);

//arrays
let myPets = ["spot", "joey", "charlie", "lola"];

console.log(myPets);
console.log(myPets[0]);

//conditionals

const a = 10;
let b = "10";
letSetToBlue = false;

if (a == b) {
  documentBody.style.backgroundColor = "red";
} else {
  documentBody.style.backgroundColor = "blue";
}

let hiddenVariable = "?";

//functions
function tellMeHowHungryIAm() {
  let hiddenVariable = "?";
  console.log("I'm not sure");
}

console.log(hiddenVariable);

function addTwonumbers(a, b) {
  let total = a + b;
  return addtotal;
}

let numberTotal = addTwoNumbers();
console.log(numberTotal);
