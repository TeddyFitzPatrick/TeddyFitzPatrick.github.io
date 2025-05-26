import { WaitFor, REMOVE, UPDATE } from "./networking.js";
import { pieceImages, pieceValues, pieceMovements, Piece, Color } from "./consts.js";
import { Move } from "./move.js";

/* DOM */
const promotionWindow = document.getElementById("promotionWindow"),
    queenPromote = document.getElementById("queenPromote"),
    rookPromote = document.getElementById("rookPromote"),
    bishopPromote = document.getElementById("bishopPromote"),
    knightPromote = document.getElementById("knightPromote");
const restartButton = document.getElementById("restart"),
    restartWindow = document.getElementById("restartWindow"),
    gameOverText = document.getElementById("gameOverText");
/* Rendering */

const LIGHT_SQUARE_COLOR = "rgb(173, 189, 143)";
const DARK_SQUARE_COLOR = "rgb(111, 143, 114)";
const MOVE_INDICATOR_COLOR = "rgb(254, 57, 57)";
// const LIGHT_SQUARE_COLOR = "rgb(227, 193, 111)";
// const DARK_SQUARE_COLOR = "rgb(184, 139, 74)";

let canvas, ctx, boardLength, TILE_SIZE; 
let moveIndicators;

/* Game state */
export let board;
let moveHistory = [],
    moveHistoryIndex = -1;
let playerColor,
    turnToMove,
    promotionSelection;
/* Castling Rights */
export const castlingRights = {
    white: {
        kingMoved: false,
        shortRookMoved: false,
        longRookMoved: false
    },
    black: {
        kingMoved: false,
        shortRookMoved: false,
        longRookMoved: false,
    }
}
/* En Passant */

/* Game Over */
let gameOver,
    winner = 0;

/* Piece Held */
const heldPiece = {
    rank: null,
    file: null,
    isHolding: false
}
/* Multiplayer */
let roomCode, isMultiplayer;
/* BOT */
let isBotGame;

export default function main(multiplayer = false, code = null, color = Color.BLACK) {
    /* GAMEMODES */
    // LOCAL
    if (!multiplayer){
        isMultiplayer = false;
        color = Color.WHITE;
    }
    // BOT
    else if (multiplayer && code == "bot"){
        isMultiplayer = false;
        isBotGame = true;
    }
    // ONLINE
    else if (multiplayer && code != "bot"){
        isMultiplayer = true;
        roomCode = code;
    }
    // Rendering
    resizeCanvas();
    // Event Listeners
    addEventListeners();
    // Start game
    startGame(color);
}

async function startGame(color) {
    // Randomly assign a color if one wasn't selected
    playerColor = (color != null) ? color : Math.random() >= 0.5 ? 1 : -1;
    turnToMove = Color.WHITE; // White moves first
    // Initial board layout
    resetBoard();
    // Render the original game board
    render();
    // Player is black, wait for response on online & bot games
    if (playerColor === Color.BLACK){
        if (isMultiplayer){
            // Wait for opponent
            await receiveMove();
            turnToMove *= -1;
        } else if (isBotGame){
            // Bot starts the game
            playBotMove();
            turnToMove *= -1;
        }
    }
}

function endGame() {
    gameOver = true;
    toggle(restartWindow);
}

let positions = 0;
/* Bot */
function playBotMove(){
    const searchDepth = 1;
    // Generate a random move
    const botMove = negamaxMove(searchDepth, -playerColor); 
    console.log("Depth: " + searchDepth + ", Positions: " + positions);
    // Play the bot move
    playMove( botMove );
}

function negamaxMove(depth, color){
    let bestMove;
    let bestScore = Number.MIN_SAFE_INTEGER;
    for (const move of getAllLegalMoves(color)){
        move.play();
        const score = -negamax(depth-1, -color);
        move.undo();
        if (score > bestScore){
            bestScore = score;
            bestMove = move;
        }
    }
    return bestMove;
}

function negamax(depth, color){
    const allLegalMoves = getAllLegalMoves(color);
    // Penalize having no moves
    if (allLegalMoves.length === 0){
        return Number.MIN_SAFE_INTEGER;
    } 
    if (depth === 0){
        positions++;
        return getHeuristicValue(color);        
    }
    let bestScore = Number.MIN_SAFE_INTEGER;
    for (const move of allLegalMoves){
        move.play();
        bestScore = Math.max(bestScore, -negamax(depth-1, -color));
        move.undo();
    }

    return bestScore;
}

function getHeuristicValue(color){
    let heuristicValue = 0;
    for (let rank = 0; rank <= 7; rank++){
        for (let file = 0; file <= 7; file++){
            const piece = board[rank][file];
            const pieceValue = pieceValues.get(Math.abs(piece));
            // Calculate the material advantage
            if (board[rank][file] !== Piece.EMPTY){
                if (Math.abs(piece) === Piece.WHITE_PAWN && (rank === 0 || rank === 7)){
                    // Promoted pawns have same material as queens
                    heuristicValue += (Math.sign(color) === Math.sign(piece)) ? 9 : -9;
                } else{
                    // Every other piece has a fixed material value
                    heuristicValue += (Math.sign(color) === Math.sign(piece)) ? pieceValue : -pieceValue;
                }
            }
            
        }
    } 
    return heuristicValue;
}

/* User Input Handling Functions */
function addEventListeners(){
    // Add event listeners
    window.addEventListener("keydown", (event) => {
        // TODO: Previous game states
        if (moveHistory.length === 0) return;
        if (event.key == "ArrowLeft") {
            if (moveHistoryIndex === -1) return;
            console.log("undo");
            // Undo the last move
            const lastMove = moveHistory.pop();
            lastMove.undo();
            // Switch board if local
            if (!isMultiplayer && !isBotGame) playerColor *= -1;
            // Switch player move
            turnToMove *= -1;
            // Render the new position
            render();
        } else if (event.key == "ArrowRight"){
            if (moveHistoryIndex === moveHistory.length) return;
            // Render the new position
            render();
        }
    });
    restartButton.addEventListener("click", function () {
        // Restart the game
        gameOver = false;
        toggle(restartWindow);
        startGame(playerColor);
    });
    window.addEventListener("resize", (event) => {
        resizeCanvas();
        render();
    });
    /* Piece Manipulation */
    canvas.addEventListener("mousedown", (event) => {pickupPiece(event)});
    canvas.addEventListener("mousemove", (event) => {
        if (!heldPiece.isHolding) return; 
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        // Render the board
        render();
        // Render the held piece
        if (heldPiece.isHolding){
            renderPiece(pieceImages.get(board[heldPiece.rank][heldPiece.file]), mouseX - 0.5 * TILE_SIZE, mouseY - 0.5 * TILE_SIZE);
        }
    }); 
    canvas.addEventListener("mouseup", (event) => {
        if (!heldPiece.isHolding) return;
        heldPiece.isHolding = false;
        moveIndicators = [];
        handleMouseup(event);
    });
    /* Pawn Promotion */
    queenPromote.addEventListener("click", (event) => {
        promotionSelection = Piece.WHITE_QUEEN;
    });
    rookPromote.addEventListener("click", (event) => {
        promotionSelection = Piece.WHITE_ROOK;
    });
    bishopPromote.addEventListener("click", (event) => {
        promotionSelection = Piece.WHITE_BISHOP;
    });
    knightPromote.addEventListener("click", (event) => {
        promotionSelection = Piece.WHITE_KNIGHT;
    });
}

async function pickupPiece(event) {
    // Get the rank and file of the mouse click
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    // Flip the rank to put black on the bottom if the player's color is black
    const clickedRank = getFlippedRank(Math.floor(mouseY / TILE_SIZE));
    const clickedFile = Math.floor(mouseX / TILE_SIZE);
    // Get the piece clicked
    const pieceClicked = board[clickedRank][clickedFile];
    // Moves can't be played if the game's over
    if (gameOver) return;
    // Player must wait for opponent's move
    if ((isBotGame || isMultiplayer) && turnToMove != playerColor) return;
    // Clicked on a piece of the right color
    if (pieceClicked === Piece.EMPTY || Math.sign(pieceClicked) !== Math.sign(turnToMove)) return;
    // Record the piece being picked up
    heldPiece.isHolding = true;
    heldPiece.rank = clickedRank;
    heldPiece.file = clickedFile;
    // Store move indicators
    moveIndicators = [];
    for (const legalMove of getLegalMoves(clickedRank, clickedFile)){
        moveIndicators.push([legalMove.toRank, legalMove.toFile]);
    }
    // Render the board
    render();
    // Render the held piece
    if (heldPiece.isHolding){
        renderPiece(pieceImages.get(board[heldPiece.rank][heldPiece.file]), mouseX - 0.5 * TILE_SIZE, mouseY - 0.5 * TILE_SIZE);
    }

}

async function handleMouseup(event){
    // Render the board on mouse release
    render();
    // Get the rank and file of the mouse click
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    // Flip the rank to put black on the bottom if the player's color is black
    const clickedRank = getFlippedRank(Math.floor(mouseY / TILE_SIZE));
    const clickedFile = Math.floor(mouseX / TILE_SIZE);
    // Get the piece clicked
    const pieceClicked = board[clickedRank][clickedFile];
    // Played move
    const playerMove = new Move(heldPiece.rank, heldPiece.file, clickedRank, clickedFile);
    // Play a legal move
    if (isLegalMove(playerMove)) {
        // Play the move on the board
        await playMove(playerMove);
        // Switch the turn
        turnToMove *= -1;
        /* PROMPT OPPONENT RESPONSE */
        // Multiplayer
        if (isMultiplayer){
            // Send the move to the DB for the opponent to read
            sendMove(playerMove);
            // Wait for the opponent's response
            await receiveMove();
            turnToMove *= -1;
        } 
        // Bot
        else if (isBotGame){
            // Play the bot's response
            playBotMove();
            turnToMove *= -1;
        }
        // Local
        else {
            // Switch the player color to flip the board
            playerColor *= -1;
        }
    }
    render();
}

async function playMove(move) {
    /* Promote pawns */
    if (Math.abs(move.piece) == Piece.WHITE_PAWN && (move.toRank == 0 || move.toRank == 7)) {
        // Player promotes a pawn, wait for a selection
        if (Math.sign(move.piece) === playerColor) {
            // Show the pawn being moved up and render before promoting
            move.play();
            render(move);
            // Turn on the promotion window and wait for a selection
            toggle(promotionWindow);
            await new Promise((resolve) => {
                const check = setInterval(() => {
                    if (promotionSelection != null) {
                        clearInterval(check);
                        resolve();
                    }
                }, 50);
            });
            toggle(promotionWindow);
        }
        // Bot selects queen
        else if (isBotGame) promotionSelection = Math.abs(Piece.WHITE_QUEEN);
        // Apply the promotion by changing the pawn's piece type
        move.piece = Math.sign(move.piece) * promotionSelection;
        // Remove the cached promotion 
        promotionSelection = null;
    }
    /* Apply the move */
    move.play();
    heldPiece.isHolding = false;
    // Store the move
    moveHistory.push(move);
    moveHistoryIndex++;
    // Highlight the move and update the board with the new position
    render(move);
    /* The move played ended the game */
    if (isGameOver()){
        endGame();
    }
}

/* Chess Implementation Functions */
function isGameOver() {
    // TODO: Agreed Draw
    // TODO: Resignation
    // TODO: 50 move rule
    // TODO: 3-move repetition
    // TODO: Insufficient Material 
    
    // Stalemate & Checkmate
    for (let color of [Color.BLACK, Color.WHITE]){
        let hasLegalMoves = false;
        for (let rank = 0; rank <= 7; rank++) {
            for (let file = 0; file <= 7; file++) {
                // If one of the player's pieces has a legal move, checkmate has not occurred
                if (Math.sign(board[rank][file]) === color && getLegalMoves(rank, file).length > 0) {
                    hasLegalMoves = true;
                    break;
                }
            }
        }
        // No legal moves => stalemate or checkmate
        if (!hasLegalMoves){
            const kingPos = findPiece(color * Math.abs(Piece.WHITE_KING));
            // Checkmate
            if (isAttacked(kingPos[0], kingPos[1], color)){
                winner = color;
                gameOverText.textContent = `${color == Color.WHITE ? "Black" : "White"} wins by checkmate`;
            // Stalemate
            } else{
                gameOverText.textContent = `Draw by stalemate`;
            }
            return true;
        }
    }
    return false;
}

function isLegalMove(move) {
    for (const legalMove of getLegalMoves(move.fromRank, move.fromFile)) {
        // Check the move is legal if a legal move exists that ends in the same square
        if (move.toRank === legalMove.toRank && 
            move.toFile === legalMove.toFile) {
            return true;
        }
    }
    return false;
}

function getAllLegalMoves(color){
    let allLegalMoves = [];
    // Get all legal moves for a given color
    for (let rank = 0; rank <= 7; rank++){
        for (let file = 0; file <= 7; file++){
            if (Math.sign(board[rank][file]) === color){
                allLegalMoves.push(...getLegalMoves(rank, file));
            }
        }
    }
    return allLegalMoves;
}

function getLegalMoves(fromRank, fromFile) {
    // Get the set of all moves possible for a piece at a given rank and file
    let legalMoves = [];
    /* Remove moves that put the king in check */
    const piece = board[fromRank][fromFile];
    for (const move of getAllMoves(fromRank, fromFile)) {
        // Temporary play the move
        move.play();
        /* Check all legal moves available to the opponent to see if any capture the king */
        const kingPos = findPiece(Math.sign(piece) * Math.abs(Piece.WHITE_KING));
        // If the opponent cannot capture the king after playing the move, it is legal
        if (!isAttacked(kingPos[0], kingPos[1], Math.sign(piece))) legalMoves.push(move)
        // Undo the move
        move.undo();
    }
    return legalMoves;
}

function getAllMoves(fromRank, fromFile) {
    // Get the set of all moves of a piece at a given rank and file
    const piece = board[fromRank][fromFile];
    const color = Math.sign(piece);
    if (piece == Piece.EMPTY) return [];
    // Generate the set of legal moves
    let allMoves = [];
    /* Bishops, Rooks, and Queens have the same sliding-move behavior */
    if (Math.abs(piece) === Piece.WHITE_BISHOP ||
        Math.abs(piece) === Piece.WHITE_ROOK ||
        Math.abs(piece) === Piece.WHITE_QUEEN) {
        allMoves.push(...getSlidingMoves(fromRank, fromFile));
    }
    /* Knights and kings don't slide, but move adjacently */
    if (Math.abs(piece) == Piece.WHITE_KNIGHT ||
        Math.abs(piece) == Piece.WHITE_KING) {
        allMoves.push(...getAdjacentMoves(fromRank, fromFile));
    }
    /* Pawns have more complicated moves */
    if (Math.abs(piece) == Piece.WHITE_PAWN) {
        const forward = (color === Color.WHITE) ? -1 : 1;
        const startRank = (color === Color.WHITE) ? 6 : 1;
        // Move forward 1
        if (isInBounds(fromRank+forward, fromFile) && board[fromRank + forward][fromFile] == Piece.EMPTY) {
            const toRank = fromRank + forward;
            allMoves.push(new Move(fromRank, fromFile, toRank, fromFile));
        }
        // Move forward 2
        if (fromRank == startRank &&
            board[fromRank + forward][fromFile] == Piece.EMPTY &&
            board[fromRank + 2 * forward][fromFile] == Piece.EMPTY) {
            allMoves.push(new Move(fromRank, fromFile, fromRank + 2 * forward, fromFile));
        }
        // Captures
        for (const df of [-1, 1]) {
            if (isInBounds(fromRank + forward, fromFile + df) && Math.sign(board[fromRank + forward][fromFile + df]) === -color) {
                allMoves.push(new Move(fromRank, fromFile, fromRank + forward, fromFile + df));
            }
        }
        // TODO: En passant
        
    }
    /* Castling Moves */
    if (Math.abs(piece) == Piece.WHITE_KING) {
        // WHITE CASTLING
        if (!castlingRights.white.kingMoved) {
            if (!castlingRights.white.shortRookMoved && board[7][7] === Piece.WHITE_ROOK && canCastle(Color.WHITE, [[7, 4], [7, 5], [7, 6]], [[7, 5], [7, 6]])){
                allMoves.push(new Move(fromRank, fromFile, 7, 6));
            }
            if (!castlingRights.white.longRookMoved && board[7][0] === Piece.WHITE_ROOK && canCastle(Color.WHITE, [[7, 2], [7, 3], [7, 4]], [[7, 1], [7, 2], [7, 3]])){
                allMoves.push(new Move(fromRank, fromFile, 7, 2));
            }
        }
        // BLACK CASTLING
        if (!castlingRights.black.kingMoved) {
            if (!castlingRights.black.shortRookMoved && board[0][7] === Piece.BLACK_ROOK && canCastle(Color.BLACK, [[0, 4], [0, 5], [0, 6]], [[0, 5], [0, 6]])){
                allMoves.push(new Move(fromRank, fromFile, 0, 6));
            }
            if (!castlingRights.black.longRookMoved && board[0][0] === Piece.BLACK_ROOK && canCastle(Color.BLACK, [[0, 2], [0, 3], [0, 4]], [[0, 1], [0, 2], [0, 3]])){
                allMoves.push(new Move(fromRank, fromFile, 0, 2));
            }
        }
    }
    return allMoves;
}

function getSlidingMoves(fromRank, fromFile) {
    let slidingMoves = [];
    const piece = board[fromRank][fromFile];
    const movements = pieceMovements[Math.abs(piece)];
    for (const [dr, df] of movements) {
        let newRank = fromRank + dr;
        let newFile = fromFile + df;
        while (
            isInBounds(newRank, newFile) &&
            Math.sign(board[newRank][newFile]) !== Math.sign(piece)
        ) {
            // Move to empty square
            slidingMoves.push(new Move(fromRank, fromFile, newRank, newFile));
            // Move captures opponent's piece
            if (board[newRank][newFile] != Piece.EMPTY) break;
            // Check the next move
            newRank += dr;
            newFile += df;
        }
    }
    return slidingMoves;
}

function getAdjacentMoves(fromRank, fromFile) {
    let adjacentMoves = [];
    const piece = board[fromRank][fromFile];
    // Adjacent king moves
    for (const [dr, df] of pieceMovements[Math.abs(piece)]) {
        let newRank = fromRank + dr;
        let newFile = fromFile + df;
        if (
            isInBounds(newRank, newFile) &&
            Math.sign(board[newRank][newFile]) != Math.sign(piece)
        ) {
            adjacentMoves.push(new Move(fromRank, fromFile, newRank, newFile));
        }
    }
    return adjacentMoves;
}

function canCastle(color, attackedSquares, emptySquares) {
    for (const [r, f] of attackedSquares) {
        if (isAttacked(r, f, color, true)) return false;
    }
    for (const [r, f] of emptySquares) {
        if (board[r][f] != Piece.EMPTY) return false;
    }
    return true;
}

function isAttacked(rank, file, color, castleCheck = false) {
    let opponentMoves = [];
    for (let rank=0; rank <= 7; rank++){
        for (let file=0; file <= 7; file++){
            const piece = board[rank][file];
            // Ignore castling moves in response to castling to avoid infinite recursion
            if (castleCheck && Math.abs(piece) === Piece.WHITE_KING) continue;
            if (Math.sign(piece) !== color){
                opponentMoves.push(...getAllMoves(rank, file));
            }
        }
    }
    // If any opponent move lands on the square, it is attacked
    for (const opponentMove of opponentMoves){
        if (opponentMove.toRank === rank && opponentMove.toFile === file){
            return true;
        }
    }
    return false;
}

function findPiece(piece) {
    let rank, file;
    for (let searchRank = 0; searchRank <= 7; searchRank++) {
        for (let searchFile = 0; searchFile <= 7; searchFile++) {
            if (board[searchRank][searchFile] === piece) {
                return [searchRank, searchFile];
            }
        }
    }
    return [];
}

/* Database Communication */
async function sendMove(move){
    // Send the move to the opponent
    const playerColorStr = (playerColor == Color.WHITE) ? "whiteMove" : "blackMove";
    let moveData = {};
    moveData[playerColorStr] = {
        from: [move.fromRank, move.fromFile],
        to: [move.toRank, move.toFile],
        promote: (promotionSelection == null) ? "" : promotionSelection
    };
    // Update the move to the DB
    UPDATE(roomCode, moveData);
    // Reset for future pawn promotions
    promotionSelection = null;
}

async function receiveMove() {
    // Wait to receive the opponent's response
    const opponentMovePath = `${roomCode}/${
        playerColor == 1 ? "black" : "white"
    }Move`;
    const moveData = await WaitFor(opponentMovePath);
    const from = moveData["from"];
    const to = moveData["to"];
    promotionSelection = moveData["promote"];
    // Clear the opponent's move from the database after storing it
    REMOVE(opponentMovePath);
    // Play the move on the board
    playMove(new Move(from[0], from[1], to[0], to[1]));
}

/* Simple Board Utility Functions */
function resetBoard() {
    board = [
        [-4, -2, -3, -5, -6, -3, -2, -4],
        [-1, -1, -1, -1, -1, -1, -1, -1],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [4, 2, 3, 5, 6, 3, 2, 4]
    ];
    
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
    /*   TESTING BOARD
        [0, 0, -3, -5, -6, -3, -2, -4],
        [1, 0, -1, -1, -1, -1, -1, -1],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [-1, 0, 1, 1, 1, 1, 1, 1],
        [0, 0, 3, 5, 6, 3, 2, 4]
    */
}

function isInBounds(rank, file) {
    return rank >= 0 && rank <= 7 && file >= 0 && file <= 7;
}

function getFlippedRank(rank) {
    return playerColor == Color.WHITE ? rank : 7 - rank;
}

/* Rendering and Canvas Functions */
function resizeCanvas() {
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

function render(moveToHighlight = null) {
    // Render in the right order
    renderBoard();
    if (moveToHighlight != null){
        highlightMove(moveToHighlight);
    }
    renderMoveIndicators();
    renderPieces();
}

function renderBoard() {
    // Render the black and white squares
    let white = playerColor == Piece.WHITE;
    for (let rank = 0; rank <= 7; rank++) {
        white = !white;
        for (let file = 0; file <= 7; file++) {
            // Fill in the square
            ctx.fillStyle = white ? LIGHT_SQUARE_COLOR : DARK_SQUARE_COLOR;
            ctx.fillRect(
                file * TILE_SIZE,
                getFlippedRank(rank) * TILE_SIZE,
                TILE_SIZE,
                TILE_SIZE
            );
            white = !white;

            // Render square labels
            // ctx.font = "30px Arial";
            // ctx.fillStyle = "pink";
            // ctx.fillText(`${String.fromCharCode(97 + file)}${8-rank}`, file * TILE_SIZE + 0.5 * TILE_SIZE-15, getFlippedRank(rank) * TILE_SIZE + 0.5 * TILE_SIZE+15);
        }
    }
}

function renderPieces() {
    // Render the pieces
    for (let rank = 0; rank <= 7; rank++) {
        for (let file = 0; file <= 7; file++) {
            const piece = board[rank][file];
            // Ignore empty squares
            if (piece === Piece.EMPTY) continue;
            // Ignore the held piece
            if (heldPiece.isHolding && heldPiece.rank == rank && heldPiece.file == file) continue;
            // Render the piece
            renderPiece(pieceImages.get(piece), file * TILE_SIZE, getFlippedRank(rank) * TILE_SIZE);
        }
    }
}

function renderPiece(pieceImg, x, y){
    // Render a piece
    ctx.drawImage(pieceImg, x, y, TILE_SIZE, TILE_SIZE);
}

function renderMoveIndicators(){
    if (moveIndicators == null || moveIndicators.length === 0) return;
    ctx.fillStyle = MOVE_INDICATOR_COLOR;
    // Draw a circle move indicator for each legal move available
    for (const [rank, file] of moveIndicators) {
        ctx.fillRect(
            file * TILE_SIZE - 1,
            getFlippedRank(rank) * TILE_SIZE - 1,
            TILE_SIZE + 2,
            TILE_SIZE + 2);
        ctx.fill();
    }
}

function highlightMove(move){
    // Highlight Color
    ctx.fillStyle =
        (Math.sign(move.piece) == Color.WHITE) ? "lightgreen" : "darkgreen";
    // Previous tile
    ctx.fillRect(
        move.fromFile * TILE_SIZE + 5,
        getFlippedRank(move.fromRank) * TILE_SIZE + 5,
        TILE_SIZE - 10,
        TILE_SIZE - 10
    );
    // Moved to tile
    ctx.fillRect(
        move.toFile * TILE_SIZE + 5,
        getFlippedRank(move.toRank) * TILE_SIZE + 5,
        TILE_SIZE - 10,
        TILE_SIZE - 10
    );
}

export function loadImage(src) {
    const img = new Image();
    img.src = src;
    return img;
}

function toggle(window) {
    if (window.classList.contains("hidden")) {
        window.classList.remove("hidden");
    } else {
        window.classList.add("hidden");
    }
}