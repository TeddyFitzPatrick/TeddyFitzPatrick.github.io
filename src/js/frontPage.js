// Global vars
let titleIndex, demoIndex;
let titleObject, demoObject;
let titleInterval, demoInterval
// Consts
const titleStr = "Hi, I'm Teddy";
const demoStr = " { Particle Life Demo }";


window.onload = function () {
    // Get the DOM objects
    titleObject = document.getElementById("title");
    demoObject = document.getElementById("demo_text");
    // Set the indices
    titleIndex = {value: 0};
    demoIndex = {value: 0};
    // Set the intervals
    titleInterval = setInterval(addLetter, 150, titleObject, titleStr, titleIndex);
    demoInterval = setInterval(addLetter, 150, demoObject, demoStr, demoIndex);

}

function addLetter(element, string, index){
    if (index.value >= string.length){
        return;
    }
    // Add a character from the title string
    element.textContent += string[index.value++];
}