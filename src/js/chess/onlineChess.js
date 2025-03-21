import { DB_URL } from "./chessMenu.js";
/* Image assets for pieces */
// Pawns
const pieceImageMap = new Map([
    [0,  loadImage("../assets/whitePawn.png")],
    [1,  loadImage("../assets/whitePawn.png")],
    [-1, loadImage("../assets/blackPawn.png")],
    [2,  loadImage("../assets/whiteKnight.png")],
    [-2, loadImage("../assets/blackKnight.png")],
    [3,  loadImage("../assets/whiteBishop.png")],
    [-3, loadImage("../assets/blackBishop.png")],
    [4,  loadImage("../assets/whiteRook.png")],
    [-4, loadImage("../assets/blackRook.png")],
    [5,  loadImage("../assets/whiteQueen.png")],
    [-5, loadImage("../assets/blackQueen.png")],
    [6,  loadImage("../assets/whiteKing.png")],
    [-6, loadImage("../assets/blackKing.png")]
]);

/* Encodings */
const Piece = Object.freeze({
    EMPTY: 0,
    WHITE_PAWN: 1,
    BLACK_PAWN: -1,
    WHITE_KNIGHT: 2,
    BLACK_KNIGHT: -2,
    WHITE_BISHOP: 3,
    BLACK_BISHOP: -3,
    WHITE_ROOK: 4,
    BLACK_ROOK: -4,
    WHITE_QUEEN: 5,
    BLACK_QUEEN: -5,
    WHITE_KING: 6,
    BLACK_KING: -6
});
const Color = Object.freeze({
    WHITE: 1,
    BLACK: -1
})

/* Piece Move Rules */
const bishopMoveDirections = [
    [-1, -1], [-1, 1], 
    [1, -1], [1, 1]   
];
const knightMoveDirections = [
    [-2, -1], [-2, 1], 
    [-1, -2], [-1, 2],
    [1, -2], [1, 2],   
    [2, -1], [2, 1]    
];
const rookMoveDirections = [
    [-1, 0], [1, 0], 
    [0, -1], [0, 1]  
];
const queenMoveDirections = [
    [-1, -1], [-1, 1], [1, -1], [1, 1], 
    [-1, 0], [1, 0], [0, -1], [0, 1]    
];
const kingMoveDirections = [
    [-1, -1], [-1, 1], [1, -1], [1, 1], 
    [-1, 0], [1, 0], [0, -1], [0, 1]   
];

// Board State
export let board
let canvas, ctx
let boardLength
/* Castling */
let whiteKingMoved = false;
let whiteShortRookMoved = false;
let whiteLongRookMoved = false;
let blackKingMoved = false;
let blackShortRookMoved = false;
let blackLongRookMoved = false;
// Game play
let playerColor; // -1 (black), 1 (white)
let turnToMove;  // -1 (black), 1 (white)
let pieceHeldRank = null;
let pieceHeldFile = null;
let isHoldingPiece = false;
let gameOver = false;
// Move order
// movesPlayed = [];

// Canvas Rendering
const TILE_SIZE = 100;
// Game results
let gameOverMessage;
const notification = document.getElementById("notification");
const winner = document.getElementById("winner");
// Options
const options = document.getElementById("options");
const boardDisplay = document.getElementById("boardDisplay"); 

// Firebase
const POLL_SPEED = 1000;
let roomId, roomCode;

export default function main(rCode, rId, color) {
    // GAME ENTRY
    console.log("RUNNING ONLINE: " + color);
    roomCode = rCode;
    roomId = rId;
    // Set up canvas rendering
    resizeCanvas();

    // Add event listeners
    const restartButton = document.getElementById("restartButton");
    restartButton.addEventListener("click", function(){
        gameOver = false;
        hideResults();
        gameLoop();
    });
    window.addEventListener("resize", resizeCanvas());
    window.addEventListener("click", (event) => {handleClick(event)});
    window.addEventListener("keydown", function (event){
        if (event.key === "ArrowLeft"){
            console.log("YIPPEE");
            clearDatabase();
        } else if (event.key === "ArrowRight"){
            clearDatabase();
        }
    });
    // Start game
    startGame(color);
}

async function startGame(color){
    // Initial board layout
    resetBoard();
    // Assign the player color. White goes first
    playerColor = color;
    turnToMove = Color.WHITE;
    // Black starts by waiting for white's initial move
    if (playerColor == Color.BLACK){
        readMove();
    }
    // Render the original board
    render();
}

async function clearDatabase(){
    fetch(`${DB_URL}/.json`, {
        method: 'DELETE', 
        headers: {
          'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
        console.error('Failed to delete move, status:', response.status);
        }
    })
    .catch(error => {
        console.error('Error deleting move:', error);
    });
}

async function clearMove(){
    // Delete the opponent's from component of their move
    fetch(`${DB_URL}/rooms/${roomCode}/${roomId}/${-playerColor}from.json`, {
        method: "DELETE"
    })
    .then(response => response.json())
    .then(data => console.log("Field deleted successfully:", data))
    .catch(error => console.error("Error deleting field:", error));
    // Delete the opponent's to component of their move
    fetch(`${DB_URL}/rooms/${roomCode}/${roomId}/${-playerColor}to.json`, {
        method: "DELETE"
    })
    .then(response => response.json())
    .then(data => console.log("Field deleted successfully:", data))
    .catch(error => console.error("Error deleting field:", error));
}

async function readMove(){
    let validMoveReceived = false;
    await fetch(`${DB_URL}/rooms/${roomCode}/${roomId}.json`)
    .then(response => response.json())
    .then(data => {
        // Check that the database contains a single move
        if (data != null && Object.keys(data).length == 4 && `${-playerColor}from` in data){
            // Mark that a move was read to stop polling
            validMoveReceived = true;
            // Get the move
            const fromRank = data[`${-playerColor}from`][0]; 
            const fromFile = data[`${-playerColor}from`][1]; 
            const toRank = data[`${-playerColor}to`][0]; 
            const toFile = data[`${-playerColor}to`][1]; 
            // Clear the move from the database
            clearMove();
            // Play the move on the board
            movePiece(fromRank, fromFile, toRank, toFile);
            // Switch turns
            turnToMove *= -1;
        }
    })
    .catch(error => {
        console.error('Error reading moves:', error);
    });
    // Exit if a valid move was read and played
    if (validMoveReceived){
        return;
    }
    // Otherwise, poll again every two seconds
    console.log("poll");
    await new Promise(resolve => setTimeout(resolve, POLL_SPEED));
    readMove();
}

async function sendMove(moveData){
    console.log("send move: " + moveData);

    fetch(`${DB_URL}/rooms/${roomCode}/${roomId}.json`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(moveData)
      })
      .then(response => response.json())
      .then(data => console.log("Move added successfully:", data))
      .catch(error => console.error("Error updating move:", error))
}

function handleClick(event){
    if (gameOver) return;
    // Only handle the mouse click if it's the player's turn to move
    if (turnToMove != playerColor) return;
    // Get the rank and file of the mouse click
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const file = Math.floor(mouseX / TILE_SIZE);
    const rank = Math.floor(mouseY / TILE_SIZE); 
    // Get the piece clicked
    const pieceClicked = board[rank][file];
    renderBoard();
    if (isHoldingPiece){
        // Play a legal move
        if (getLegalMoves(pieceHeldRank, pieceHeldFile).some(move => move[0] == rank && move[1] == file)){
            // Switch the pieces on the board representation
            movePiece(pieceHeldRank, pieceHeldFile, rank, file);
            turnToMove *= -1;
            // Check if the move played checkmated the opponents
            if (isCheckmate()){
                gameOver = true;
                gameOverMessage = `${turnToMove == Color.WHITE ? "Black" : "White"} wins by checkmate`;
                showResults();
            }
            // Send the move to the opponent
            sendMove({[`${playerColor}from`]: [pieceHeldRank, pieceHeldFile], [`${playerColor}to`]: [rank, file]});
            // Wait for their response
            readMove();
            // TODO: Store move history
            // ...
        }
        // Reselect same piece to deselect
        else if (rank == pieceHeldRank && file == pieceHeldFile){
            isHoldingPiece = false;
        }
        // Select another piece
        else if (pieceClicked != 0 && Math.sign(pieceClicked) == Math.sign(turnToMove)){
            pickupPiece(rank, file);
        }
        // Empty square or enemy piece selected, deselect held piece
        else{
            isHoldingPiece = false;
        }
    }
    // Pick up a piece
    else if (pieceClicked != Piece.EMPTY && Math.sign(pieceClicked) === Math.sign(turnToMove)){
        pickupPiece(rank, file);
    }       
    // Render the pieces
    renderPieces();
}

function movePiece(fromRank, fromFile, toRank, toFile){
    const pieceMoved = board[fromRank][fromFile];
    /* Move the rook during a castle move */
    // White short castle
    if (pieceMoved == Piece.WHITE_KING && fromFile + 2 == toFile){
        board[7][5] = Piece.WHITE_ROOK;
        board[7][7] = Piece.EMPTY;
    }
    // White long castle
    else if (pieceMoved == Piece.WHITE_KING && fromFile - 2 == toFile){
        board[7][3] = Piece.WHITE_ROOK;
        board[7][0] = Piece.EMPTY;
    }
    // Black short castle
    else if (pieceMoved == Piece.BLACK_KING && fromFile + 2 == toFile){
        board[0][5] = Piece.BLACK_ROOK; 
        board[0][7] = Piece.EMPTY;
    }
    // Black long castle
    else if (pieceMoved == Piece.BLACK_KING && fromFile - 2 == toFile){
        board[0][3] = Piece.BLACK_ROOK;
        board[0][0] = Piece.EMPTY;
    }

    /* Keep track if the king or rook moved to disqualifying castling */
    // King moved
    if (pieceMoved == Piece.WHITE_KING){
        whiteKingMoved = true;
    } else if (pieceMoved == Piece.BLACK_KING){
        blackKingMoved = true;
    }
    // Rook moved
    else if (pieceMoved == Piece.WHITE_ROOK) {
        if (fromRank == 7 && fromFile == 7) whiteShortRookMoved = true; 
        if (fromRank == 7 && fromFile == 0) whiteLongRookMoved = true; 
    }
    else if (pieceMoved == Piece.BLACK_ROOK) {
        if (fromRank == 0 && fromFile == 7) blackShortRookMoved = true; 
        if (fromRank == 0 && fromFile == 0) blackLongRookMoved = true;
    }
    // Move the piece from the old square to the new 
    isHoldingPiece = false;
    board[toRank][toFile] = pieceMoved;
    board[fromRank][fromFile] = Piece.EMPTY;
    // Render the move played
    render();
}


function pickupPiece(rank, file){
    isHoldingPiece = true;
    pieceHeldRank = rank;
    pieceHeldFile = file;
    // Highlight legal moves
    ctx.strokeStyle = "lightgreen";
    ctx.lineWidth = 5;
    for (const [legalRank, legalFile] of getLegalMoves(rank, file)){
        // Draw a circle around legal spots to move
        ctx.beginPath();
        ctx.arc(legalFile * TILE_SIZE+TILE_SIZE/2, legalRank * TILE_SIZE+ TILE_SIZE/2, 20, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function isCheckmate(){
    for (let rank = 0; rank <= 7; rank++){
        for (let file = 0; file <= 7; file++){
            if (Math.sign(board[rank][file]) == turnToMove){
                // If one of the player's pieces has a legal move, checkmate has not occurred 
                if (getLegalMoves(rank, file).length > 0){
                    return false
                }
            }
        }
    }
    return true;
}

function getLegalMoves(rank, file){
    // Get the set of all moves possible for a piece at a given rank and file
    let allMoves = getAllMoves(rank, file);
    let legalMoves = [];
    const piece = board[rank][file];

    /* Remove moves that put the king in check */
    for (const move of allMoves){
        let legalMove = true;
        let newRank = move[0], newFile = move[1];
        // Temporary play the move
        let originalPiece = board[newRank][newFile];
        board[newRank][newFile] = board[rank][file];
        board[rank][file] = Piece.EMPTY; 
        /* Check all legal moves available to the opponent to see if any capture the king */
        // Find the king's positions
        let kingPos = findPiece(Math.sign(piece) * Math.abs(Piece.WHITE_KING));
        // Check if the opponent's can capture the king after playing the move
        if (isAttacked(kingPos[0], kingPos[1], -Math.sign(piece))) legalMove = false;
        // Undo the move
        board[rank][file] = board[newRank][newFile];
        board[newRank][newFile] = originalPiece; 
        // Add the move to the legal move set if does not expose the king
        if (legalMove) legalMoves.push(move);
    }

    return legalMoves;
}

function getAllMoves(rank, file){
    // Get the set of all moves of a piece at a given rank and file
    const piece = board[rank][file];
    // Generate the set of legal moves
    let allMoves = [];
    if (piece == Piece.EMPTY) return allMoves;
    // Pawns
    else if (Math.abs(piece) == Math.abs(Piece.WHITE_PAWN)){
        const forward = piece > 0 ? -1 : 1; 
        const startRank = piece > 0 ? 6 : 1;
        // Move forward 1
        if (isInBounds(rank + forward, file) && board[rank + forward][file] == Piece.EMPTY){
            allMoves.push([rank + forward, file]);
        }
        // Move forward 2 
        if (rank == startRank && isInBounds(rank + 2 * forward, file) && board[rank + forward][file] == Piece.EMPTY && board[rank + 2 * forward][file] == Piece.EMPTY){
            allMoves.push([rank + 2 * forward, file]);
        }
        // Captures
        for (const df of [-1, 1]) {
            if (isInBounds(rank + forward, file + df) && Math.sign(board[rank + forward][file + df]) == -Math.sign(piece)) {
                allMoves.push([rank + forward, file + df]);
            }
        }
        // TODO: En passant
    }   
    // Bishops
    else if (Math.abs(piece) == Math.abs(Piece.WHITE_BISHOP)){
        for (const [dr, df] of bishopMoveDirections) {
            let newRank = rank + dr;
            let newFile = file + df;
            while (isInBounds(newRank, newFile) && Math.sign(board[newRank][newFile]) != Math.sign(piece)) {
                // Move to empty square
                allMoves.push([newRank, newFile]);
                // Capture
                if (board[newRank][newFile] != 0) break; 
                newRank += dr;
                newFile += df;
            }
        }
    }
    // Knights
    else if (Math.abs(piece) == Math.abs(Piece.WHITE_KNIGHT)){
        for (const [dr, df] of knightMoveDirections) {
            const newRank = rank + dr;
            const newFile = file + df;
            if (isInBounds(newRank, newFile) && Math.sign(board[newRank][newFile]) != Math.sign(piece)) {
                allMoves.push([newRank, newFile]);
            }
        }
    }
    // Rooks
    else if (Math.abs(piece) == Math.abs(Piece.WHITE_ROOK)){
        for (const [dr, df] of rookMoveDirections) {
            let newRank = rank + dr;
            let newFile = file + df;
            while (isInBounds(newRank, newFile) && Math.sign(board[newRank][newFile]) != Math.sign(piece)) {
                // Move to empty square
                allMoves.push([newRank, newFile]);
                // Capture
                if (board[newRank][newFile] != Piece.EMPTY) break;
                newRank += dr;
                newFile += df;
            }
        }
    }
    // Queens
    else if (Math.abs(piece) == Math.abs(Piece.WHITE_QUEEN)) {
        for (const [dr, df] of queenMoveDirections) {
            let newRank = rank + dr;
            let newFile = file + df;
            while (isInBounds(newRank, newFile) && Math.sign(board[newRank][newFile]) != Math.sign(piece)) {
                // Move to empty
                allMoves.push([newRank, newFile]);
                // Capture
                if (board[newRank][newFile] != Piece.EMPTY) break; 
                newRank += dr;
                newFile += df;
            }
        }
    }
    // Kings
    else if (Math.abs(piece) == Math.abs(Piece.WHITE_KING)) {
        // Adjacent king moves
        for (const [dr, df] of kingMoveDirections) {
            let newRank = rank + dr;
            let newFile = file + df;
            if (isInBounds(newRank, newFile) && Math.sign(board[newRank][newFile]) != Math.sign(piece)) {
                allMoves.push([newRank, newFile]);
            }
        }
        // White Short Castle
        if (!whiteKingMoved && !whiteShortRookMoved &&
            !isAttacked(7, 5, -1, true) && 
            board[7][5] == Piece.EMPTY && board[7][6] == Piece.EMPTY){
            allMoves.push([7, 6]);
        }
        // White Long Castle
        if (!whiteKingMoved && !whiteLongRookMoved &&
            !isAttacked(7, 3, -1, true) &&
            board[7][1] == Piece.EMPTY && board[7][2] == Piece.EMPTY && board[7][3] == Piece.EMPTY){
            allMoves.push([7, 2]);
        }
        // Black Short Castle
        if (!blackKingMoved && !blackShortRookMoved &&
            !isAttacked(0, 5, 1, true) &&
            board[0][5] == Piece.EMPTY && board[0][6] == Piece.EMPTY){
            allMoves.push([0, 6]);
        }
        // Black Long Castle
        if (!blackKingMoved && !blackLongRookMoved &&
            !isAttacked(0, 3, 1, true) &&
            board[0][1] == Piece.EMPTY && board[0][2] == Piece.EMPTY && board[0][3] == Piece.EMPTY){
            allMoves.push([0, 2]);
        }
    }
    return allMoves;
}

function isAttacked(rank, file, opponentColor, castleCheck=false){
    for (let searchRank = 0; searchRank <= 7; searchRank++){
        for (let searchFile = 0; searchFile <= 7; searchFile++){
            let searchPiece = board[searchRank][searchFile];
            // Look for opponent piece's legal moves
            if (Math.sign(searchPiece) == opponentColor){
                // Ignore king moves to avoid infinite recursion in castle eligibility check
                if (castleCheck && Math.abs(searchPiece) == Math.abs(Piece.WHITE_KING)) continue;
                for (let [attackedRank, attackedFile] of getAllMoves(searchRank, searchFile)){
                    // If any of the opponent's legal moves can reach the given square, it is attacked
                    if (attackedRank == rank && attackedFile == file){
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

function findPiece(piece){
    let rank, file
    for (let searchRank = 0; searchRank <= 7; searchRank++) {
        for (let searchFile = 0; searchFile <= 7; searchFile++) {
            if (board[searchRank][searchFile] == piece){
                return [searchRank, searchFile];
            }
        }
    }
    return [];
}

function resetBoard(){
    board = [
        [-4, -2, -3, -5, -6, -3, -2, -4],
        [-1, -1, -1, -1, -1, -1, -1, -1],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [4, 2, 3, 5, 6, 3, 2, 4]
    ]
    /*   REFERENCE DEFAULT GAME BOARD
        [-4, -2, -3, -5, -6, -3, -2, -4],
        [-1, -1, -1, -1, -1, -1, -1, -1],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [4, 2, 3, 5, 6, 3, 2, 4]
    */
}

function isInBounds(rank, file){
    return (rank >= 0 && rank <= 7) && (file >= 0 && file <= 7);
}

function resizeCanvas(){
    // Set canvas length to the minimum between the screen width and height
    let body = document.getElementById("body");
    boardLength = Math.min(body.offsetWidth, body.offsetHeight);
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");
}

function loadImage(src){
    const img = new Image();
    img.src = src;
    return img;
}

function render(){
    //...
    renderBoard();
    renderPieces();
}

function renderPieces() {
    // Render the pieces
    for (let rank = 0; rank <= 7; rank++) {
        for (let file = 0; file <= 7; file++) {
            let piece = board[rank][file];
            // Ignore empty tiles
            if (piece == Piece.EMPTY) continue;
            // Get the corresponding piece image
            let pieceImg = pieceImageMap.get(piece);
            
            // Render the piece
            ctx.drawImage(pieceImg, file * TILE_SIZE, rank * TILE_SIZE, TILE_SIZE, TILE_SIZE);

            // ctx.drawImage(pieceImg, (7-file) * TILE_SIZE, (7-rank) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
}

function renderBoard(){
    // Render the black and white squares
    let white = false;
    for (let rank = 0; rank <= 7; rank++){
        white = !white
        for (let file = 0; file <= 7; file++){
            // Fill in the square
            ctx.fillStyle = white ? "white" : "brown"; 
            ctx.fillRect(file * TILE_SIZE, rank * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            white = !white;
        }
    }
}

function showResults(){
    notification.style.display = "flex";
    winner.textContent = gameOverMessage;
}

function hideResults(){
    notification.style.display = "none";
}