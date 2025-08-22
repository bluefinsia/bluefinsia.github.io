//find my elements
const appBody = document.querySelector("body");
const tempInput = document.querySelector("#tempInput");
const tempReturnText = document.querySelector("tempReturn");


function interpretTemp(){
    //console.log(tempInput.value);
    let inputTemp = tempInput.value;
    if (inputTemp < 10){
        tempReturnText.textContent = "It's freezing";
        appBody.style.backgroundColor = 'skyblue"";
    }else if (inputTemp < 18){
        tempReturnText.textContent = "It's cold";
        appBody.style.backgroundColor = 'blue"";
    }

    //for loop
    for (let steps = 0; steps <5; steps++){
        console.log("Steps taken:", steps);
    }

    //for each
    const numbers = [12, 14, 8, 6];
    let total = 0;

    numbers.forEach(totalNumber);
    function totalNumbers(item){
        total = total + item;
        console.log
    }
}

    //temp 0 - 10 : freezing
    //temp 10 - 18 : cold
    //temp 18 - 26 : mild
    //temp 26 - 30 : warm
    // temp 30+ : hot
}
//this is a function call
//interpretTemp();
