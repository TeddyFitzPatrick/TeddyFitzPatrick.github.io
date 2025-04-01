import main from './chess.js';
import { database, WaitFor, GET, REMOVE, UPDATE } from "./networking.js";

// Online
let isHosting = false;
let hostColor;

/* Pages */
const gamemodeSelection = document.getElementById("gamemodeSelection");
const multiplayerConfig = document.getElementById("multiplayerConfig");
const chessBoard = document.getElementById("chessBoard");
const pages = [
    gamemodeSelection, multiplayerConfig, chessBoard
];
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

window.onload = function (){
    // Page select
    selectPage(gamemodeSelection)

    // selectPage(chessBoard);
    // main(1, 1, 1);

    // Add event listeners
    // DEBUG
    window.addEventListener("keydown", function (event){
        if (event.key === "Enter"){
            REMOVE("/");
            console.log("deleted")
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
        // If a color has not been picked, then choose one randomly
        hostColor = (hostColor !== undefined) ? hostColor :  Math.random() >= 0.5 ? 1 : -1;
        // Put the room on firebase
        await UPDATE(hostRoomCode, {"joined": 0, "hostColor": hostColor})
        // Wait for the opponent to update the joined status to start the game
        await WaitFor(`${hostRoomCode}/joined`, 1);
        // Player has joined, start the game
        selectPage(chessBoard);
        main(hostRoomCode, hostColor);

    });    
    // Join room code
    enterRoomCodeSubmit.addEventListener("click", (event) => {joinRoom()});
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

export function selectPage(pageSelected){
    for (const page of pages){
        page.classList.add("hidden");
    }
    pageSelected.classList.remove("hidden");
}

async function joinRoom() {
    // Read the room code
    const joinRoomCode = enterRoomCode.value.toUpperCase();
    console.log("Join Room: " + joinRoomCode);
    if (isHosting) {
        alert("Can not join a game while hosting!")
        return;
    }
    if (joinRoomCode.length != 4){
        alert("Invalid room code length (must be four letters)")
        return;
    }
    // Update the joined field to signal to the host the game has started
    const data = await UPDATE(joinRoomCode, {"joined": 1});
    // Host chooses their color first
    const hostColor = await GET(`${joinRoomCode}/hostColor`)
    // Start the game
    selectPage(chessBoard);
    main(joinRoomCode, -hostColor);
}

function generateRoomCode(color){
    // Generate a random 4-letter room code
    let roomCode = "";
    for (let i=1; i<=4; i++){
        roomCode += String.fromCharCode('A'.charCodeAt(0) + Math.floor(Math.random() * 26));
    }
    return roomCode;
}



