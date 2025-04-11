import { selectPage } from "./chessMenu.js";
import { database, WaitFor, GET, REMOVE, UPDATE } from "./networking.js";

/* Canvas Rendering */
let canvas, ctx;
let boardLength;
let TILE_SIZE;
/* Image assets for pieces */
export const pieceImageMap = new Map([
    [0,  loadImage("../chessAssets/whitePawn.png")],
    [1,  loadImage("../chessAssets/whitePawn.png")],
    [-1, loadImage("../chessAssets/blackPawn.png")],
    [2,  loadImage("../chessAssets/whiteKnight.png")],
    [-2, loadImage("../chessAssets/blackKnight.png")],
    [3,  loadImage("../chessAssets/whiteBishop.png")],
    [-3, loadImage("../chessAssets/blackBishop.png")],
    [4,  loadImage("../chessAssets/whiteRook.png")],
    [-4, loadImage("../chessAssets/blackRook.png")],
    [5,  loadImage("../chessAssets/whiteQueen.png")],
    [-5, loadImage("../chessAssets/blackQueen.png")],
    [6,  loadImage("../chessAssets/whiteKing.png")],
    [-6, loadImage("../chessAssets/blackKing.png")]
]);

/* Encodings */
export const Piece = Object.freeze({
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
let heldRank = null;
let heldFile = null;
let isHoldingPiece = false;
// Move order
// movesPlayed = [];
// Firebase
const POLL_SPEED = 200;
let roomCode;

/* Pawn Promotion Window */
const promotionWindow = document.getElementById("promotionWindow");
const queenPromote = document.getElementById("queenPromote");
const rookPromote = document.getElementById("rookPromote");
const bishopPromote = document.getElementById("bishopPromote");
const knightPromote = document.getElementById("knightPromote");
let promotionSelection = null;

/* Restart Window */
const restartButton = document.getElementById("restart");
const restartWindow = document.getElementById("restartWindow");
const gameOverText = document.getElementById("gameOverText");
let gameOver = false;
let gameOverMessage;


export default function main(code, color) {
    // GAME ENTRY
    console.log("RUNNING ONLINE: " + color);
    // Store the room code
    roomCode = code;
    // Canvas rendering
    resizeCanvas();
    // Add event listeners
    let wathteufkc = false;
    window.addEventListener("keydown", (event) => {
        // TODO: Previous game states
        // if (event.key == "ArrowLeft") {
        // }
    }); 
    restartButton.addEventListener("click", function(){
        // Remove the last moves of the previous game
        gameOver = false;
        toggle(restartWindow);
        startGame(playerColor);
    });
    window.addEventListener("resize", (event) => {resizeCanvas(); render();});
    canvas.addEventListener("click", (event) => {handleClick(event)});
    /* Pawn Promotion */
    queenPromote.addEventListener("click", (event) => {promotionSelection = Piece.WHITE_QUEEN});
    rookPromote.addEventListener("click", (event) => {promotionSelection = Piece.WHITE_ROOK});
    bishopPromote.addEventListener("click", (event) => {promotionSelection = Piece.WHITE_BISHOP});
    knightPromote.addEventListener("click", (event) => {promotionSelection = Piece.WHITE_KNIGHT});
    // Start game
    startGame(color);
}

async function startGame(color){
    // Initial board layout
    resetBoard();
    // Assign the player color. White goes first
    playerColor = color;
    turnToMove = Color.WHITE;
    // Black starts by waiting for white's first move
    if (playerColor == Color.BLACK){
        receiveMove();
    }
    // Render the original board
    render();
}

/* User Input Handling Functions */
async function handleClick(event){
    // Do not allow moves to be played when it is not the player's turn or if the game is over
    if (gameOver || turnToMove != playerColor) return;
    // Get the rank and file of the mouse click
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    // Flip the rank to put black on the bottom if the player's color is black
    const clickedRank = getFlippedRank(Math.floor(mouseY / TILE_SIZE));
    const clickedFile = Math.floor(mouseX / TILE_SIZE);
    // Ignore out-of-bounds clicks
    if (!isInBounds(clickedRank, clickedFile)) return;
    // Get the piece clicked
    const pieceClicked = board[clickedRank][clickedFile];
    // Render the board
    renderBoard();
    // Pick up a piece
    if (!isHoldingPiece && pieceClicked != Piece.EMPTY && Math.sign(pieceClicked) === Math.sign(turnToMove)){
        pickupPiece(clickedRank, clickedFile);
    } else if (isHoldingPiece){
        // Play a legal move
        if (isLegalMove(heldRank, heldFile, clickedRank, clickedFile)){
            // Switch the pieces on the board representation
            await movePiece(heldRank, heldFile, clickedRank, clickedFile);
            turnToMove *= -1;
            // Send the move to the opponent
            const playerColorStr = (playerColor == 1) ? "whiteMove" : "blackMove";
            let moveData = {};
            moveData[playerColorStr] = {from: [heldRank, heldFile], to: [clickedRank, clickedFile], promote: promotionSelection}
            UPDATE(roomCode, moveData)
            // Reset for future pawn promotions
            promotionSelection = null;
            // Check if the move sent checkmated the opponents
            if (isCheckmate()){
                gameOverMessage = `${turnToMove == Color.WHITE ? "Black" : "White"} wins by checkmate`;
                endGame();
                return;
            }
            // Wait for their response
            receiveMove();
            // TODO: Store move history
            // ...
        }
        // Reselect same piece to deselect
        else if (clickedRank == heldRank && clickedFile == heldFile){
            isHoldingPiece = false;
        }
        // Select another piece
        else if (pieceClicked != 0 && Math.sign(pieceClicked) == Math.sign(turnToMove)){
            pickupPiece(clickedRank, clickedFile);
        }
        // Empty square or enemy piece selected, deselect held piece
        else{
            isHoldingPiece = false;
        }
    }
    // Render the pieces
    renderPieces();
}

async function movePiece(fromRank, fromFile, toRank, toFile){
    renderBoard();
    let pieceMoved = board[fromRank][fromFile];
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
    /* Promote pawns */
    if (Math.abs(pieceMoved) == Piece.WHITE_PAWN && (toRank == 0 || toRank == 7)){
        // You promote a pawn => Wait for a promotion selection to be made
        if (Math.sign(pieceMoved) == playerColor){
            // Show the pawn being moved up and render before promoting
            board[toRank][toFile] = pieceMoved;
            board[fromRank][fromFile] = Piece.EMPTY;
            render();
            // Wait for a promotion selection to be made
            toggle(promotionWindow);
            await new Promise(resolve => {
                const check = setInterval(() => {
                    console.log("wait");
                    if (promotionSelection !== null) {
                        clearInterval(check);
                        resolve();
                    }
                }, 50);
            });
            toggle(promotionWindow);
        }
        // Apply the promotion by changing the pawn's piece type
        pieceMoved = Math.sign(pieceMoved) * promotionSelection;
    }
    // Move the piece from the old square to the new 
    isHoldingPiece = false;
    board[toRank][toFile] = pieceMoved;
    board[fromRank][fromFile] = Piece.EMPTY;
    // Highlight the squares
    ctx.fillStyle=(Math.sign(pieceMoved) === Color.WHITE) ? "lightgreen" : "darkgreen";
    ctx.fillRect(fromFile * TILE_SIZE, getFlippedRank(fromRank) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    ctx.fillRect(toFile * TILE_SIZE, getFlippedRank(toRank) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    // Render the move played
    renderPieces();
}

function pickupPiece(rank, file){
    // Record the piece being picked up
    isHoldingPiece = true;
    heldRank = rank;
    heldFile = file;
    // Circle parameters;
    ctx.strokeStyle = "lightgreen";
    ctx.fillStyle = "lightgreen";
    ctx.lineWidth = 5;
    // Draw a green circle to indicate legal moves for the held piece
    for (const [legalRank, legalFile] of getLegalMoves(rank, file)){
        ctx.beginPath();
        ctx.arc(legalFile * TILE_SIZE+TILE_SIZE/2, getFlippedRank(legalRank) * TILE_SIZE + TILE_SIZE/2, TILE_SIZE/8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fill();
    }
}

/* Chess Implementation Functions */
function isCheckmate(){
    for (let rank = 0; rank <= 7; rank++){
        for (let file = 0; file <= 7; file++){
            // If one of the player's pieces has a legal move, checkmate has not occurred 
            if (Math.sign(board[rank][file]) == turnToMove && getLegalMoves(rank, file).length > 0){
                return false;
            }
        }
    }
    return true;
}

function isLegalMove(fromRank, fromFile, toRank, toFile){
    for (const [legalRank, legalFile] of getLegalMoves(fromRank, fromFile)){
        if (legalRank === toRank && legalFile === toFile){
            return true;
        }
    }
    return false;
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
        const forward = Math.sign(piece) === Math.sign(Color.WHITE) ? Color.BLACK : Color.WHITE; 
        const startRank = Math.sign(piece) === Math.sign(Color.WHITE) ? 6 : 1;
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
            !isAttacked(7, 4, -1, true) &&
            !isAttacked(7, 5, -1, true) && 
            board[7][5] == Piece.EMPTY && board[7][6] == Piece.EMPTY){
            allMoves.push([7, 6]);
        }
        // White Long Castle
        if (!whiteKingMoved && !whiteLongRookMoved &&
            !isAttacked(7, 4, -1, true) &&
            !isAttacked(7, 3, -1, true) &&
            board[7][1] == Piece.EMPTY && board[7][2] == Piece.EMPTY && board[7][3] == Piece.EMPTY){
            allMoves.push([7, 2]);
        }
        // Black Short Castle
        if (!blackKingMoved && !blackShortRookMoved &&
            !isAttacked(0, 4, 1, true) &&
            !isAttacked(0, 5, 1, true) &&
            board[0][5] == Piece.EMPTY && board[0][6] == Piece.EMPTY){
            allMoves.push([0, 6]);
        }
        // Black Long Castle
        if (!blackKingMoved && !blackLongRookMoved &&
            !isAttacked(0, 4, 1, true) &&
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

/* Reading Database Functions */
async function receiveMove(){
    // Wait to receive the opponent's response
    const opponentMovePath = `${roomCode}/${(playerColor == 1) ? "black": "white"}Move`;
    const moveData = await WaitFor(opponentMovePath);
    const from = moveData["from"];
    const to = moveData["to"];
    promotionSelection = moveData["promote"];
    // Clear the opponent's move from the database after storing it
    REMOVE(opponentMovePath)
    // Play the move on the board
    movePiece(from[0], from[1], to[0], to[1]);
    promotionSelection = null;
    // Switch turns
    turnToMove *= -1;
    // Check if the move received resulted in checkmate
    if (isCheckmate()){
        gameOverMessage = `${turnToMove == Color.WHITE ? "Black" : "White"} wins by checkmate`;
        endGame();
        return;
    } 
}


/* Simple Board Utility Functions */
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

function getFlippedRank(rank){
    return (playerColor == Color.WHITE) ? rank : 7 - rank;
}

/* Rendering and Canvas Functions */
function resizeCanvas(){
    // Set canvas length to the minimum between the screen width and height
    let body = document.getElementById("body");
    boardLength = Math.min(body.offsetWidth, body.offsetHeight) - 20;
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");
    // Fit the canvas and the chess squares to match the new window dimensions
    TILE_SIZE = boardLength / 8;
    canvas.width = boardLength;
    canvas.height = boardLength;
}

export function loadImage(src){
    const img = new Image();
    img.src = src;
    return img;
}

function render(){
    // Render everything
    renderBoard();
    renderPieces();
}

function renderBoard(){
    // Render the black and white squares
    let white = playerColor == Piece.WHITE;
    for (let rank = 0; rank <= 7; rank++){
        white = !white
        for (let file = 0; file <= 7; file++){
            // Fill in the square
            ctx.fillStyle = white ? "white" : "brown";
            ctx.fillRect(file * TILE_SIZE, getFlippedRank(rank) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            white = !white;
        }
    }
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
            ctx.drawImage(pieceImg, file * TILE_SIZE, getFlippedRank(rank) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
}

/* Restart Menu */
function endGame(){
    gameOver = true;
    gameOverText.textContent = gameOverMessage;
    toggle(restartWindow);
}

function toggle(window){
    if (window.classList.contains("hidden")){
        window.classList.remove("hidden");
    } else{
        window.classList.add("hidden");
    }
}
