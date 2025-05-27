import main from './chess.js';
import { WaitFor, GET, REMOVE, UPDATE } from "./networking.js";

// Online
let isHosting = false;
let hostColor;

/* Pages */
const gamemodeSelection = document.getElementById("gamemodeSelection"),
    multiplayerConfig = document.getElementById("multiplayerConfig"),
    chessBoard = document.getElementById("chessBoard"),
    pages = [gamemodeSelection, multiplayerConfig, chessBoard];
// Gamemode Selection
const localGameButton = document.getElementById("localGame"),
    onlineGameButton = document.getElementById("onlineGame"),
    botGameButton = document.getElementById("botGame");
// Join
const enterRoomCode = document.getElementById("enterRoomCode"),
    enterRoomCodeSubmit = document.getElementById("enterRoomCodeSubmit");
// Host
const hostRoomSubmit = document.getElementById("hostRoomSubmit"),
    roomCodeDisplay = document.getElementById("roomCodeDisplay");
// Color select
const selectWhite = document.getElementById("selectWhite"),
    selectBlack = document.getElementById("selectBlack");

window.onload = function (){
    // Page select
    selectPage(gamemodeSelection)
    // Add event listeners
    // DEBUG
    window.addEventListener("keydown", function (event){
        if (event.key === "Enter"){
            REMOVE("/");
            console.log("deleted")
        }
    });
    // Game Options Navigation
    localGameButton.addEventListener("click", function (){
        // Start a local game
        selectPage(chessBoard);
        main();
    });
    onlineGameButton.addEventListener("click", function (){   
        selectPage(multiplayerConfig);  
    });
    botGameButton.addEventListener("click", function (){
        selectPage(chessBoard);
        main(true, "bot");
    });
    // Multiplayer Game Config
    hostRoomSubmit.addEventListener("click", (event) => {hostRoom()});
    // Join room code
    enterRoomCodeSubmit.addEventListener("click", (event) => {joinRoom()});
    // Select a color (default random)
    selectWhite.addEventListener("click", function(){
        selectWhite.classList.add("border-cyan-500", "border-8", "scale-105");
        selectBlack.classList.remove("border-cyan-500", "border-8", "scale-105");
        hostColor = 1;
    });
    selectBlack.addEventListener("click", async function (){
        selectBlack.classList.add("border-cyan-500", "border-8", "scale-105");
        selectWhite.classList.remove("border-cyan-500", "border-8", "scale-105");
        hostColor = -1;
        if (isHosting) await UPDATE(hostRoomCode, {"joined": 0, "hostColor": hostColor})
    });
}

async function hostRoom(){
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
    main(true, hostRoomCode, hostColor);
}

async function joinRoom() {
    // Read the room code
    const joinRoomCode = enterRoomCode.value.toUpperCase();
    // Block joining a room while hosting
    if (isHosting) {
        alert("Can not join a game while hosting!")
        return;
    }
    if (joinRoomCode.length != 4){
        alert("Invalid room code length (must be four letters)")
        return;
    }
    // Update the joined field to signal to the host the game has started
    await UPDATE(joinRoomCode, {"joined": 1});
    // Host chooses their color first
    const hostColor = await GET(`${joinRoomCode}/hostColor`)
    // Start the game
    selectPage(chessBoard);
    main(true, joinRoomCode, -hostColor);
}

function generateRoomCode(color){
    // Generate a random 4-letter room code
    let roomCode = "";
    for (let i=1; i<=4; i++){
        roomCode += String.fromCharCode('A'.charCodeAt(0) + Math.floor(Math.random() * 26));
    }
    return roomCode;
}

export function selectPage(pageSelected){
    for (const page of pages){
        page.classList.add("hidden");
    }
    pageSelected.classList.remove("hidden");
}
