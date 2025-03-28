import main from './onlineChess.js';

const DB_URL = `https://struglauk-default-rtdb.firebaseio.com`;
export { DB_URL };

// Online
let isHosting = false;
let hostColor;

/* Pages */
const gamemodeSelection = document.getElementById("gamemodeSelection");
const multiplayerConfig = document.getElementById("multiplayerConfig");
const canvas = document.getElementById("canvas");
const pages = [
    gamemodeSelection, multiplayerConfig, canvas
];

window.onload = function (){
    // Page select
    selectPage(multiplayerConfig);
    // Gamemode Selection
    const localGameButton = document.getElementById("localGame");
    const onlineGameButton = document.getElementById("onlineGame");
    const botGameButton = document.getElementById("botGame");
    // Join
    const enterRoomCode = document.getElementById("enterRoomCode");
    const enterRoomCodeSubmit = document.getElementById("enterRoomCodeSubmit");
    // Host
    const hostRoom = document.getElementById("hostRoom");
    const roomCodeDisplay = document.getElementById("roomCodeDisplay");
    // Color select
    const selectWhite = document.getElementById("selectWhite");
    const selectBlack = document.getElementById("selectBlack");
    // Add event listeners
    // DEBUG
    window.addEventListener("keydown", function (event){
        if (event.key === "ArrowLeft"){
            console.log("LL");
            DELETE(DB_URL);
        } else if (event.key === "ArrowRight"){
            console.log("RR");
        }
    });

    // Game Options Navigation
    localGameButton.addEventListener("click", function (){
        console.log("local");
    });
    onlineGameButton.addEventListener("click", function (){   
        selectPage(multiplayerConfig);  
    });
    botGameButton.addEventListener("click", function (){
        console.log("bot");
    });

    // Multiplayer Game Config
    hostRoom.addEventListener("click", async function(){
        // DEBUG
        isHosting = true;
        // Generate a random 4-letter room code
        const hostRoomCode = generateRoomCode();
        // Copy the room code to clipboard
        navigator.clipboard.writeText(hostRoomCode);
        // Display the code 
        roomCodeDisplay.textContent = hostRoomCode;
        roomCodeDisplay.alert("code copied to clipboard")
        // If a color has not been picked, then choose one randomly
        hostColor = (hostColor !== undefined) ? hostColor :  Math.random() >= 0.5 ? 1 : -1;
        // Put the room on firebase
        await POST(`${DB_URL}/rooms/${hostRoomCode}`, {"joined": 0, "hostColor": hostColor})
        // Wait for someone to join and then start
        waitForOtherPlayer(hostRoomCode, hostColor);
    });    
    // Join room code
    enterRoomCodeSubmit.addEventListener("click", function(){
        if (isHosting) {
            alert("Can not join a game while hosting!")
            return;
        }
        if (enterRoomCode.value == "CLEAR") DELETE(DB_URL);
        joinRoom(enterRoomCode.value);
    });
    // Select a color (default random)
    selectWhite.addEventListener("click", function(){
        selectWhite.classList.add("border-cyan-500", "border-8", "scale-105");
        selectBlack.classList.remove("border-cyan-500", "border-8", "scale-105");
        hostColor = 1;
    });
    selectBlack.addEventListener("click", function (){
        selectBlack.classList.add("border-cyan-500", "border-8", "scale-105");
        selectWhite.classList.remove("border-cyan-500", "border-8", "scale-105");
        hostColor = -1;
    });



    
}

function selectPage(page){
    for (const page of pages){
        page.classList.add("hidden");
    }
    page.classList.remove("hidden");
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
    selectPage(canvas);
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
    selectPage(canvas);
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

