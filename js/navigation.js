// Wait for the page to load before updating temperature
window.addEventListener('load', () => {
    const button = document.getElementById('nav_button')
    if(button !== null) button.addEventListener('click', () => nav_menu());
});

// Navigate between pages
function nav_menu() {
    let navigation = document.getElementById("navigation");
    let popup_button = document.getElementById("nav_button");
    let arrow = document.getElementById("arrow");
    // If the nav bar is currently up 
    if (navigation.style.visibility == "visible") {
        //Hide the nav bar
        navigation.style.visibility = "hidden";
        popup_button.style.visibility = "visible";
        popup_button.style.marginTop = "0px";
        //Rotate the arrow
        arrow.classList.remove("rotate-180");
    // If the nav bar is currently down 
    } else {
        //Open the nav bar
        navigation.style.visibility = "visible";
        popup_button.style.visibility = "visible";
        popup_button.style.marginTop = "12.5vh";
        //Rotate the arrow
        arrow.classList.add("rotate-180");
    }
}