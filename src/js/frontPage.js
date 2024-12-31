// Global vars
let titleIndex, demoTitleIndex, demoTextIndex;
let titleObject, demoTitleObject, demoTextObject;
let titleInterval, demoTitleInterval, demoTextInterval;
// Consts
const titleStr = "Hi, I'm Teddy";
const demoTitleStr = "* NEW *";
const demoTextStr = " { Particle Life Demo }";


window.onload = function () {
    // Get the DOM objects
    titleObject = document.getElementById("title");
    demoTitleObject = document.getElementById("demo_title");
    demoTextObject = document.getElementById("demo_text");
    // Set the indices
    titleIndex = {value: 0};
    demoTitleIndex = {value: 0};
    demoTextIndex = {value: 0};
    // Set the intervals
    titleInterval = setInterval(addLetter, 150, titleObject, titleStr, titleIndex);
    demoTitleInterval = setInterval(addLetter, 150, demoTitleObject, demoTitleStr, demoTitleIndex);
    demoTextInterval = setInterval(addLetter, 150, demoTextObject, demoTextStr, demoTextIndex);

}

function addLetter(element, string, index){
    console.log("?" + element.textContent);
    if (index.value >= string.length){
        return;
        clearInterval(titleInterval);
        clearInterval(demoTitleInterval);
        clearInterval(demoTextInterval);
    }
    // Add a character from the title string
    element.textContent += string[index.value++];
}