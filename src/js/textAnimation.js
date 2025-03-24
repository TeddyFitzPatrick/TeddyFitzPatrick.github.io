class TextAnimation{
    constructor(id, text, animationSpeed){
        this.HTMLContainer = document.getElementById(id);
        this.text = text;
        this.animationSpeed = animationSpeed;
        this.charIndex = 0;
    }
    async animate(){
        // When the string has been completely rendered, stop the animation interval
        if (this.charIndex >= this.text.length){
            return;
        }
        // Add the letter to the HTML element
        this.HTMLContainer.textContent += this.text[this.charIndex++];
        // Tail recurse to wait and then add the next letter
        await new Promise(resolve => setTimeout(resolve, this.animationSpeed));
        this.animate();
    }
}

window.onload = function () {
    // Create animations
    const animations = [
        new TextAnimation("title", "Hi I'm Teddy", 90),
        new TextAnimation("plifeDemo", "{ Particle Life Demo }", 40),
        new TextAnimation("chessDemo", "{ NEW: Multiplayer Chess Demo }", 30)
    ];
    // Load animations
    for (let animation of animations){
        animation.animate();
    }
}
