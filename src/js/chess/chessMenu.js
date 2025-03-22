import main from './onlineChess.js';

const DB_URL = `https://struglauk-default-rtdb.firebaseio.com`;
export { DB_URL };

// HTML 
const windowContent = document.querySelector("window-content");
const gameOptionsHTML = `<!-- Game Options -->
<div id="boardDisplay" class="flex flex-col space-y-3 text-center items-center p-8 min-w-1/2 w-fit min-h-1/2 h-fit bg-white rounded-2xl shadow-2xl">
    <h1 class="text-4xl font-bold">Teddy Chess</h1>
    <button id="localGame" class="chess_button">Pass and Play (lame)</button>
    <button id="onlineGame" class="chess_button">Play Online (cool)</button>
    <button id="botGame" class="chess_button">Play my bot</button>
</div>`;
const roomOptionsHTML = `
<div class="flex flex-col p-8 rounded-2xl shadow-2xl justify-start space-y-2 items-center text-center bg-white w-3/4 lg:w-1/2 min-h-1/2 h-fit">
    <h1 class="text-4xl font-bold">Online Room</h1>
    <div class="flex flex-col lg:flex-row w-full h-full text-2xl font-bold space-x-2 space-y-2 ">
        <div class="flex items-center space-y-4 flex-col w-full lg:w-1/2 h-full border-2 border-black rounded-xl p-2 lg:p-4">
            <h1>Host</h1>
            <button id="hostRoom" class="bg-white rounded-xl border-2 border-black hover:scale-105 p-2">
                Host Room
            </button>
            <div class="flex flex-col">
                <b>Your room code: </b> <p id="roomCodeDisplay"> .... </p>
            </div>
            <div class="w-full h-full">
                <h1 class="italic">Play As (Default Random):</h1>
                <div class="flex flex-row w-full h-full justify-around">
                    <button id="selectWhite" class="w-36 h-36 bg-white rounded-xl border-2 border-aqua hover:scale-105"></button>
                    <button id="selectBlack" class="w-36 h-36 bg-black rounded-xl border-2 hover:scale-105"></button>
                </div>
            </div>
            
        </div>
        <div class="flex items-center space-y-4 flex-col w-full lg:w-1/2 h-full border-2 border-black rounded-xl p-2 lg:p-4">
            <h1>Join</h1>
            <div class="flex flex-col space-y-2 w-full">
                <input type="text" 
                    placeholder="Enter Room Code..." 
                    class="bg-white text-lg border-2 p-2 w-full max-w-full rounded-xl border-black" 
                    id="enterRoomCode">
                <input type="submit" id="enterRoomCodeSubmit" value="Enter"
                    class="border-2 w-24 h-12 border-black p-2 rounded-xl hover:scale-105">
            </div>
        </div>
    </div>
</div>
`
const onlineGameHTML = `<canvas class="border-8 border-amber-950 rounded-xl shadow-2xl" id="canvas" width="800" height="800"></canvas>
    <div id="notification" class="hidden flex absolute flex-col justify-around items-center
        bg-slate-500 w-1/2 h-1/2 top-1/4 left-1/4 rounded-xl shadow-2xl border-black border-8">
        <h1 id="winner" class="text-bold italic text-white text-3xl">
            Winner Holder Text
        </h1>
        <!-- Restart -->
        <button id="restartButton" class="text-black text-bold text-2xl border-4 p-2 hover:scale-110 rounded-2xl shadow-2xl border-black bg-white">
            Play Again
        </button>
    </div>
</div>`;

// Default to main page
windowContent.innerHTML = gameOptionsHTML;

// Main Page Options
const localGameButton = document.getElementById("localGame");
const onlineGameButton = document.getElementById("onlineGame");
const botGameButton = document.getElementById("botGame");

// Online
let isHosting = false;
let hostColor;

window.onload = function (){
    // Add event listeners
    // TODO: Local Game
    localGameButton.addEventListener("click", function (){
        console.log("local");
    });
    // Online => Room Selector / Generator
    onlineGameButton.addEventListener("click", function (){
        windowContent.innerHTML = roomOptionsHTML;
        // Join
        const enterRoomCode = document.getElementById("enterRoomCode");
        const enterRoomCodeSubmit = document.getElementById("enterRoomCodeSubmit");
        // Host
        const hostRoom = document.getElementById("hostRoom");
        const roomCodeDisplay = document.getElementById("roomCodeDisplay");
        // Color select
        const selectWhite = document.getElementById("selectWhite");
        const selectBlack = document.getElementById("selectBlack");
        // DEBUG
        window.addEventListener("keydown", function (event){
            if (event.key === "ArrowLeft"){
                console.log("LL");
                DELETE(DB_URL);
            } else if (event.key === "ArrowRight"){
                console.log("RR");
            }
        });
        // Join room code
        enterRoomCodeSubmit.addEventListener("click", function(){
            if (isHosting) {
                alert("Can not join a game while hosting!")
                return;
            }
            joinRoom(enterRoomCode.value);
        });
        // Select a color (default random)
        selectWhite.addEventListener("click", function(){
            selectWhite.classList.add("border-cyan-500", "border-8");
            selectBlack.classList.remove("border-cyan-500", "border-8");
            hostColor = 1;
        });
        selectBlack.addEventListener("click", function (){
            selectBlack.classList.add("border-cyan-500", "border-8");
            selectWhite.classList.remove("border-cyan-500", "border-8");
            hostColor = -1;
        });
        // Host a room
        hostRoom.addEventListener("click", async function(){
            // DEBUG

            isHosting = true;
            // Generate a random 4-letter room code
            const hostRoomCode = generateRoomCode();
            // Display the code 
            roomCodeDisplay.textContent = hostRoomCode;
            // If a color has not been picked, then choose one randomly
            hostColor = (hostColor !== undefined) ? hostColor :  Math.random() >= 0.5 ? 1 : -1;
            // Put the room on firebase
            await POST(`${DB_URL}/rooms/${hostRoomCode}`, {"joined": 0, "hostColor": hostColor})
            // Wait for someone to join and then start
            waitForOtherPlayer(hostRoomCode, hostColor);
        });
        
    });
    // TODO: BOT
    botGameButton.addEventListener("click", function (){
        console.log("bot");
    });
    
}

async function waitForOtherPlayer(hostRoomCode, hostColor) {
    const hostRoomId = await getRoomId(hostRoomCode);
    // Wait for the opponent to update the joined status to start the game
    while (true){
        const check = await GET(`${DB_URL}/rooms/${hostRoomCode}/${hostRoomId}/joined`);
        // Player has joined
        if (check == 1) break;
        // Wait 1 second to check again if the opponent joined
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    // Player has joined, start the game
    windowContent.innerHTML = onlineGameHTML;
    main(hostRoomCode, hostRoomId, hostColor);
}

async function joinRoom(joinRoomCode) {
    const joinRoomId = await getRoomId(joinRoomCode);
    // Update the joined field to signal to the host the game has started
    const data = await PATCH(`${DB_URL}/rooms/${joinRoomCode}/${joinRoomId}`, {"joined": 1});
    // Host chooses their color first
    const hostColor = await GET(`${DB_URL}/rooms/${joinRoomCode}/${joinRoomId}/hostColor`)
    const joinColor = -hostColor;
    // Start the game
    windowContent.innerHTML = onlineGameHTML;
    main(joinRoomCode, joinRoomId, joinColor);
}

async function getRoomId(roomCode){
    const roomData = await GET(`${DB_URL}/rooms/${roomCode}`);
    return Object.keys(roomData)[0];
}

function generateRoomCode(color){
    // Generate a random 4-letter room code
    let roomCode = "";
    for (let i=1; i<=4; i++){
        roomCode += String.fromCharCode('A'.charCodeAt(0) + Math.floor(Math.random() * 26));
    }
    return roomCode;
}

/* Firebase GET Operation */
export async function GET(URL){
    const response = await fetch(`${URL}/.json`);
    if (!response.ok){
        console.log(`Failed to GET data at ${URL}`);
    }
    return await response.json();
}
/* Firebase POST Operation */
export async function POST(URL, data){
    return fetch(`${URL}/.json`, {
        method: 'POST', 
        headers: {
            'Content-Type': 'application/json',  
        },
        body: JSON.stringify(data),  
    })
    .then(response => response.json())
    .then(data => {
        // Data successfully posted
    })
    .catch(error => {
        // Error sending data
        console.log("POST error: " + error);
    });
}
/* Firebase DELETE Operation */
export async function DELETE(URL) {
    return fetch(`${URL}/.json`, {
        method: 'DELETE', 
    })
    .then(response => {
        // Data successfully posted

    })
    .catch(error => {
        // Error deleting data
        console.log(error);
    });
}
/* Firebase PATCH Operation */
export async function PATCH(URL, data) {
    return fetch(`${URL}/.json`, {
        method: 'PATCH',  
        headers: {
            'Content-Type': 'application/json',  
        },
        body: JSON.stringify(data),  
    })
    .then(response => response.json())
    .then(data => {
        // Data successfully patched
    })
    .catch(error => {
        // Error updating data
        console.log(error);
    });
}

