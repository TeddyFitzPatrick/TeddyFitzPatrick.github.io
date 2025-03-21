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
        let color;
        const selectWhite = document.getElementById("selectWhite");
        const selectBlack = document.getElementById("selectBlack");
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
            color = 1;
        });
        selectBlack.addEventListener("click", function (){
            selectBlack.classList.add("border-cyan-500", "border-8");
            selectWhite.classList.remove("border-cyan-500", "border-8");
            color = -1;
        });
        // Host a room
        hostRoom.addEventListener("click", function(){
            isHosting = true;
            // Generate a random 4-letter room code
            const roomCode = generateRoomCode();
            // Display the code 
            roomCodeDisplay.textContent = roomCode;
            console.log("Room Code: " + roomCode);
            // If a color has not been picked, then choose one randomly
            if (color == null) color = Math.random() >= 0.5 ? 1 : -1;
            // Put the room on firebase
            establishRoom(roomCode, color);
            // Wait for someone to join and then start
            waitForOtherPlayer(roomCode, color);
        });
        
    });
    // TODO: BOT
    botGameButton.addEventListener("click", function (){
        console.log("bot");
    });
    
}

async function establishRoom(roomCode, color){
    // Room Establishment Info
    const roomPacket = {
        joined: 0,
        hostColor: color
    };
    fetch(`https://struglauk-default-rtdb.firebaseio.com/rooms/${roomCode}.json`, {
    method: 'POST', 
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(roomPacket)  
    })
    .then(response => response.json())  
    .then(data => {
        //Success
        })
    .catch(error => {
        console.error('Error sending data:', error);
    });
}

async function waitForOtherPlayer(roomCode, color) {
    // Poll every two seconds to check if the "joined" variable has been set to 1
    // Once a player has joined, start the game by navigating to the online game's HTML page
    const waitInterval = setInterval(async () => {
        const codeResponse = await fetch(`${DB_URL}/rooms/${roomCode}.json`);
        const data = await codeResponse.json();
        const roomId = getRoomId(data);
        if (data !== null){
            const joinedResponse = await fetch(`${DB_URL}/rooms/${roomCode}/${roomId}/joined.json`);
            const joined = await joinedResponse.json();
            if (joined == 0){
                console.log("Waiting on player to join...");
            } else{
                // Player has joined, stop polling, and start the game
                clearInterval(waitInterval);
                console.log("Opponent joined, game starting.");
                windowContent.innerHTML = onlineGameHTML;
                main(roomCode, roomId, color);
                return;
            }
        }
    }, 2000); 
}

async function joinRoom(roomCode) {
    const response = await fetch(`${DB_URL}/rooms/${roomCode}.json`);
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    const roomId = getRoomId(data);
    // Update the joined field to signal to the host the game has started
    fetch(`https://struglauk-default-rtdb.firebaseio.com/rooms/${roomCode}/${roomId}.json`, {
        method: 'PATCH', 
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({"joined": 1})  
    })
    .then(response => response.json())  
    .then(data => {
        // Success
    })
    .catch(error => {
        console.error('Error sending data:', error);
    });
    // Host chooses their color first
    let hostColor = data[roomId]["hostColor"];
    let color = -1 * hostColor;
    // Start the game
    windowContent.innerHTML = onlineGameHTML;
    main(roomCode, roomId, color);
}

async function clearDatabase(){
    fetch(`${DB_URL}/.json`, {
        method: 'DELETE', 
        headers: {
          'Content-Type': 'application/json'
        }
    })
    .then(response => {// Poll every 2 seconds
        if (!response.ok) {
        console.error('Failed to delete data, status:', response.status);
        }
    })
    .catch(error => {
        console.error('Error deleting data:', error);
    });
}

function getRoomId(data){
    let roomId;
    for (let id of Object.keys(data)){
        roomId = id;
    }
    return roomId;
    
}

function generateRoomCode(color){
    // Generate a random 4-letter room code
    let roomCode = "";
    for (let i=1; i<=4; i++){
        roomCode += String.fromCharCode('A'.charCodeAt(0) + Math.floor(Math.random() * 26));
    }
    return roomCode;
}