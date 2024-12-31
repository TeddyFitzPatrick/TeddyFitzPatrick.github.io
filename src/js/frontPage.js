// Global vars
let index, par, titleInterval
// Consts
const titleStr = "Hi, I'm Teddy" 



window.onload = function () {
    par = document.getElementById("title");
    index = 0;


    titleInterval = setInterval(addLetter, 150);

}


function addLetter(){
    // Stop the interval
    if (index >= titleStr.length){
        clearInterval(titleInterval);
        return;
    }
    // Add a character from the title string
    par.textContent = par.textContent + titleStr[index++];
}