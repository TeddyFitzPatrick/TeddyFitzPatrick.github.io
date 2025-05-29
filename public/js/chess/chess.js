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
let moveIndicators = [],
 moveHighlights = [];


/* Game state */
export let board;
let moveHistory = [],
    moveHistoryIndex = -1;
let playerColor,
    turnToMove,
    promotionSelection;
/* Squares Attacked */
let whiteAttackSquares = Array.from({ length: 8 }, () => Array(8).fill(false));
let blackAttackSquares = Array.from({ length: 8 }, () => Array(8).fill(false));
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
/* En Passant Rights */
export let enPassant = Array.from({ length: 8 }, () => Array(8).fill(false));
/* Game Over */
let gameOver,
    winner = 0;

/* Piece Held */
const heldPiece = {
    rank: null,
    file: null,
    isHolding: false,
    x: null,
    y: null
};
/* Multiplayer */
let roomCode, isMultiplayer;
/* BOT */
let isBotGame;
let calls = 0;
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
    // Local games start with white
    if (!isMultiplayer && !isBotGame) playerColor = Color.WHITE;
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

/* Bot */
function playBotMove(){
    const searchDepth = 2;
    const startTime = Date.now();
    // Generate a random move
    const botMove = negamaxMove(searchDepth, -playerColor); 
    const timeElapsed = (Date.now() - startTime) / 1000;
    console.log("Generated bot move in " +  timeElapsed + "s");
    // Play the bot move
    playMove( botMove );
}

function negamaxMove(depth, color, alpha=Number.MIN_SAFE_INTEGER, beta=Number.MAX_SAFE_INTEGER){
    let bestMove;
    let bestEvaluation = Number.MIN_SAFE_INTEGER;
    for (const move of getAllLegalMoves(color)){
        move.play();
        const evaluation = -negamax(depth-1, -color, alpha, beta);
        move.undo();
        // Pruning
        if (evaluation >= beta){
            return beta;
        }
        if (evaluation > bestEvaluation){
            bestEvaluation = evaluation;
            bestMove = move;
        }
        alpha = Math.max(alpha, evaluation);
    }
    return bestMove;
}

function negamax(depth, color, alpha=Number.MIN_SAFE_INTEGER, beta=Number.MAX_SAFE_INTEGER){
    if (depth === 0){
        return getHeuristicValue(color);        
    }
    let bestEvaluation = Number.MIN_SAFE_INTEGER;
    for (const move of getAllLegalMoves(color)){
        // Play the move and calculate it's evaluation
        move.play();
        const evaluation = -negamax(depth-1, -color, -beta, -alpha);
        move.undo();
        // Pruning
        if (evaluation >= beta){
            return beta;
        }
        // Update the best evaluation 
        bestEvaluation = Math.max(bestEvaluation, -negamax(depth-1, -color));
        // Update alpha
        alpha = Math.max(alpha, evaluation);
    }
    return bestEvaluation;
}

function getHeuristicValue(color){
    if (getAllLegalMoves(color) === 0) return Number.MIN_SAFE_INTEGER;
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
        // // TODO: Previous game states
        // if (moveHistory.length === 0) return;
        // if (event.key == "ArrowLeft") {
        //     if (moveHistoryIndex === -1) return;
        //     console.log("undo");
        //     // Undo the last move
        //     const lastMove = moveHistory.pop();
        //     lastMove.undo();     // // TODO: Previous game states
        // if (moveHistory.length === 0) return;
        // if (event.key == "ArrowLeft") {
        //     if (moveHistoryIndex === -1) return;
        //     console.log("undo");
        //     // Undo the last move
        //     const lastMove = moveHistory.pop();
        //     lastMove.undo();
        //     // Switch board if local
        //     if (!isMultiplayer && !isBotGame) playerColor *= -1;
        //     // Switch player move
        //     turnToMove *= -1;
        //     // Render the new position
        //     render();
        // } else if (event.key == "ArrowRight"){
        //     if (moveHistoryIndex === moveHistory.length) return;
        //     // Render the new position
        //     render();
        // }
        //     // Switch board if local
        //     if (!isMultiplayer && !isBotGame) playerColor *= -1;
        //     // Switch player move
        //     turnToMove *= -1;
        //     // Render the new position
        //     render();
        // } else if (event.key == "ArrowRight"){
        //     if (moveHistoryIndex === moveHistory.length) return;
        //     // Render the new position
        //     render();
        // }
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
    /* Desktop Piece Manipulation */
    canvas.addEventListener("mousedown", (event) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        pickupPiece(getFlippedRank(Math.floor(mouseY / TILE_SIZE)), Math.floor(mouseX / TILE_SIZE));
        // Update piece held
        heldPiece.x = mouseX - 0.5 * TILE_SIZE;
        heldPiece.y = mouseY - 0.5 * TILE_SIZE;
        // Render the board
        render();
    });
    canvas.addEventListener("mousemove", (event) => {
        if (!heldPiece.isHolding) return; 
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        // Update piece held
        heldPiece.x = mouseX - 0.5 * TILE_SIZE;
        heldPiece.y = mouseY - 0.5 * TILE_SIZE;
        // Render the board
        render();

    }); 
    canvas.addEventListener("mouseup", (event) => {
        if (!heldPiece.isHolding) return;
        heldPiece.isHolding = false;
        moveHighlights = [];
        moveIndicators = [];
        const rect = canvas.getBoundingClientRect();
        const mouseRank = Math.floor((event.clientY - rect.top) / TILE_SIZE);
        const mouseFile = Math.floor((event.clientX - rect.left) / TILE_SIZE);
        releasePiece(getFlippedRank(mouseRank), mouseFile);
    });

    /* Mobile */
    canvas.addEventListener("touchstart", (event) => {
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = event.touches[0];
        const tapX = touch.clientX - rect.left;
        const tapY = touch.clientY - rect.top;
        pickupPiece(getFlippedRank(Math.floor(tapY / TILE_SIZE)), Math.floor(tapX / TILE_SIZE));
        // Update piece held
        heldPiece.x = tapX - 0.5 * TILE_SIZE;
        heldPiece.y = tapY - 0.5 * TILE_SIZE;
        // Render the board
        render();

    });
    canvas.addEventListener("touchmove", (event) => {
        if (!heldPiece.isHolding) return; 
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = event.touches[0];
        const tapX = touch.clientX - rect.left;
        const tapY = touch.clientY - rect.top;
        // Update piece held
        heldPiece.x = tapX - 0.5 * TILE_SIZE;
        heldPiece.y = tapY - 0.5 * TILE_SIZE;
        // Render the board
        render();

    });
    canvas.addEventListener("touchend", (event) => {
        if (!heldPiece.isHolding) return;
        event.preventDefault();
        heldPiece.isHolding = false;
        // Reset the move indicators and highlights
        moveHighlights = [];
        moveIndicators = [];
        const rect = canvas.getBoundingClientRect();
        const touch = event.changedTouches[0];
        const tappedRank = Math.floor((touch.clientY - rect.top) / TILE_SIZE);
        const tappedFile = Math.floor((touch.clientX - rect.left) / TILE_SIZE);
        releasePiece(getFlippedRank(tappedRank), tappedFile);
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

function pickupPiece(rank, file) {
    // Get the piece clicked
    const pieceClicked = board[rank][file];
    // Moves can't be played if the game's over
    if (gameOver) return;
    // Player must wait for opponent's move
    if ((isBotGame || isMultiplayer) && turnToMove != playerColor) return;
    // Clicked on a piece of the right color
    if (pieceClicked === Piece.EMPTY || Math.sign(pieceClicked) !== Math.sign(turnToMove)) return;
    // Record the piece being picked up
    heldPiece.isHolding = true;
    heldPiece.rank = rank;
    heldPiece.file = file;
    // Store move indicators
    moveIndicators = [];
    for (const legalMove of getLegalMoves(rank, file)){
        moveIndicators.push(legalMove);
    }
}

async function releasePiece(rank, file){
    // Played move
    const playerMove = new Move(heldPiece.rank, heldPiece.file, rank, file);
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
            setTimeout(() => {
                playBotMove();
            }, 0);
            turnToMove *= -1;
        }
        // Local
        else {
            // Switch the player color to flip the board
            playerColor *= -1;
        }
    }
    // Render the new position
    render();
}

async function playMove(move) {
    /* Promote pawns */
    if (Math.abs(move.piece) == Piece.WHITE_PAWN && (move.toRank == 0 || move.toRank == 7)) {
        // Player promotes a pawn, wait for a selection
        if (Math.sign(move.piece) === playerColor) {
            // Show the pawn being moved up and render before promoting
            move.play();
            moveHighlights.push(move);
            render();
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
    // Store the move highlight
    moveHighlights.push(move);
    /* The move played ended the game */
    if (isGameOver()){
        endGame();
    }
    // Highlight the move and update the board with the new position
    render();
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
            // Checkmate
            if (isChecked(color)){
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
    for (const move of getPseudoLegalMoves(fromRank, fromFile)) {
        // Temporary play the move
        move.play();
        /* Check all legal moves available to the opponent to see if any capture the king */
        if (!isChecked(Math.sign(piece))) legalMoves.push(move);
        // Undo the move
        move.undo();
    }
    return legalMoves;
}

function getPseudoLegalMoves(fromRank, fromFile) {
    calls++;
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
            allMoves.push(new Move(fromRank, fromFile, fromRank + forward, fromFile));
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
    // WHITE CASTLING
    if (piece === Piece.WHITE_KING && !castlingRights.white.kingMoved) {
        // Short Castling
        if (!castlingRights.white.shortRookMoved && board[7][7] === Piece.WHITE_ROOK && canCastle(Color.WHITE, [[7, 4], [7, 5], [7, 6]], [[7, 5], [7, 6]])){
            allMoves.push(new Move(fromRank, fromFile, 7, 6));
        }
        // Long castling
        if (!castlingRights.white.longRookMoved && board[7][0] === Piece.WHITE_ROOK && canCastle(Color.WHITE, [[7, 2], [7, 3], [7, 4]], [[7, 1], [7, 2], [7, 3]])){
            allMoves.push(new Move(fromRank, fromFile, 7, 2));
        }
    }
    // BLACK CASTLING
    if (piece === Piece.BLACK_KING && !castlingRights.black.kingMoved){
        // Short castling
        if (!castlingRights.black.shortRookMoved && board[0][7] === Piece.BLACK_ROOK && canCastle(Color.BLACK, [[0, 4], [0, 5], [0, 6]], [[0, 5], [0, 6]])){
            allMoves.push(new Move(fromRank, fromFile, 0, 6));
        }
        // Long castling
        if (!castlingRights.black.longRookMoved && board[0][0] === Piece.BLACK_ROOK && canCastle(Color.BLACK, [[0, 2], [0, 3], [0, 4]], [[0, 1], [0, 2], [0, 3]])){
            allMoves.push(new Move(fromRank, fromFile, 0, 2));
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

function isChecked(color){
    const kingPos = findPiece(color * Piece.WHITE_KING);
    return isAttacked(kingPos[0], kingPos[1], color);
}

function isAttacked(rank, file, color, castleCheck = false) {
    let attackedSquares = Array.from({ length: 8 }, () => Array(8).fill(false));
    for (let rank=0; rank <= 7; rank++){
        for (let file=0; file <= 7; file++){
            const piece = board[rank][file];
            // Ignore castling moves in response to castling to avoid infinite recursion
            if (castleCheck && Math.abs(piece) === Piece.WHITE_KING) continue;
            if (Math.sign(piece) !== color){
                const opponentMoves = getPseudoLegalMoves(rank, file);
                for (const move of opponentMoves){
                    attackedSquares[move.toRank][move.toFile] = true;
                }
            }
        }
    }
    return attackedSquares[rank][file];
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
function loadFEN(FEN = "r1bk3r/p2pBpNp/n4n2/1p1NP2P/6P1/3P4/P1P1K3/q5b1"){
    board = Array.from({ length: 8 }, () => Array(8).fill(0)); // Clear the board

    let rankPointer = 0;
    for (const line of FEN.split("/")){
        // Populate each rank 
        let filePointer = 0;
        for (let char of line){
            // Skip a certain number of files
            if (!isNaN(parseInt(char))){
                filePointer += parseInt(char);
                continue;
            }
            // Populate the square with a piece
            const color = (char === char.toLowerCase()) ? -1 : 1;
            console.log(color);
            let piece = Piece.EMPTY;
            switch (char.toLowerCase()){
                case "p":
                    piece = Piece.WHITE_PAWN;
                    break;
                case "b":
                    piece = Piece.WHITE_BISHOP;
                    break;
                case "n":
                    piece = Piece.WHITE_KNIGHT;
                    break;
                case "r":
                    piece = Piece.WHITE_ROOK;
                    break;
                case "q":
                    piece = Piece.WHITE_QUEEN;
                    break;
                case "k":
                    piece = Piece.WHITE_KING;
                    break;
            }
            board[rankPointer][filePointer] = color * piece;

            // Move to the next file
            filePointer++;
        }
        // Move to the next rank
        rankPointer++;
    }
}

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

/* Rendering Functions */
function resizeCanvas() {
    // Set canvas length to the minimum between the screen width and height
    let body = document.getElementById("body");
    boardLength = Math.min(body.offsetWidth, body.offsetHeight) - 36;
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");
    // Fit the canvas and the chess squares to match the new window dimensions
    TILE_SIZE = boardLength / 8;
    canvas.width = boardLength;
    canvas.height = boardLength;
}

function render() {
    renderBoard();
    renderMoveHighlights();
    renderMoveIndicators();
    renderPieces();
    // Render the held piece (if one is being held)
    if (heldPiece.isHolding) {
        renderPiece(pieceImages.get(board[heldPiece.rank][heldPiece.file]), heldPiece.x, heldPiece.y);
    }
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
    for (const move of moveIndicators) {
        const rank = move.toRank, file = move.toFile;
        ctx.fillRect(
            file * TILE_SIZE - 1,
            getFlippedRank(rank) * TILE_SIZE - 1,
            TILE_SIZE + 2,
            TILE_SIZE + 2);
        ctx.fill();
    }
}

function renderMoveHighlights(){
    for (const move of moveHighlights){
        // Highlight Color
        ctx.fillStyle =
            (Math.sign(move.piece) == Color.WHITE) ? "lightgreen" : "darkgreen";
        // Previous tile
        ctx.fillRect(
            move.fromFile * TILE_SIZE - 1,
            getFlippedRank(move.fromRank) * TILE_SIZE - 1,
            TILE_SIZE + 2,
            TILE_SIZE + 2
        );
        // Moved to tile
        ctx.fillRect(
            move.toFile * TILE_SIZE - 1,
            getFlippedRank(move.toRank) * TILE_SIZE - 1,
            TILE_SIZE + 2,
            TILE_SIZE + 2
        );
    }

}

/* Visual Utilities */
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