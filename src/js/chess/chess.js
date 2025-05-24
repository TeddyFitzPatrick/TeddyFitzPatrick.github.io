import { WaitFor, REMOVE, UPDATE } from "./networking.js";
import { pieceImages, Piece, Color, pieceMovements } from "./consts.js";
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
let canvas, ctx, boardLength, TILE_SIZE; 
/* Game state */
export let board;
let moveHistory = [];
let moveHistoryIndex = -1;
let playerColor,
    turnToMove,
    gameOver,
    promotionSelection;
/* Castling Rights */
const castlingRights = {
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
/* Piece Held */
const heldPiece = {
    rank: null,
    file: null,
    isHolding: false
}
/* Multiplayer */
let roomCode, isMultiplayer;
/* BOT */
const SEARCH_DEPTH = 3;
let isBotGame;

export default function main(multiplayer = false, code = null, color = null) {
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

function addEventListeners(){
    // Add event listeners
    window.addEventListener("keydown", (event) => {
        // TODO: Previous game states
        // if (moveHistory.length === 0) return;

        // if (event.key == "ArrowLeft") {
        //     if (moveHistoryIndex === 0) return;
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
    canvas.addEventListener("click", (event) => {
        handleClick(event);
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
        // Wait for opponent
        if (isMultiplayer){
            await receiveMove();
            turnToMove *= -1;
        } else if (isBotGame){
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
    // Generate the set of all legal bot moves
    const legalBotMoves = [];
    for (let rank = 0; rank <= 7; rank++){
        for (let file = 0; file <= 7; file++){
            // Get legal moves of the bot's pieces
            if (Math.sign(board[rank][file]) === -playerColor){
                legalBotMoves.push(...getLegalMoves(rank, file));
            }
        }
    }
    // No legal moves
    if (legalBotMoves.length === 0){
        return;
    }
    // Generate a random move
    const botMove = legalBotMoves[Math.floor(Math.random() * legalBotMoves.length)];
    // TODO: Minimax
    // Play the bot move
    playMove( botMove );
}


/* User Input Handling Functions */
async function handleClick(event) {
    // Moves can't be played if the game's over
    if (gameOver) return;
    // TODO: Premove
    // Player must wait for opponent's move
    if ((isBotGame || isMultiplayer) && turnToMove != playerColor) return;
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
    render();
    // Pick up a piece
    if (
        !heldPiece.isHolding &&
        pieceClicked != Piece.EMPTY &&
        Math.sign(pieceClicked) === Math.sign(turnToMove)
    ) {
        pickupPiece(clickedRank, clickedFile);
    } else if (heldPiece.isHolding) {
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
                // Switch back to the player's move
                turnToMove *= -1;
            } 
            // Bot
            else if (isBotGame){
                // Play the bot's response
                playBotMove();
                // Switch back to the player's move
                turnToMove *= -1;
            }
            // Local
            else {
                // Switch the player color to flip the board
                playerColor *= -1;
                render();
            }
        }
        // Reselect same piece to deselect
        else if (clickedRank == heldPiece.rank && clickedFile == heldPiece.file) {
            heldPiece.isHolding = false;
        }
        // Select another piece
        else if (
            pieceClicked != 0 &&
            Math.sign(pieceClicked) == Math.sign(turnToMove)
        ) {
            pickupPiece(clickedRank, clickedFile);
        }
        // Empty square or enemy piece selected, deselect held piece
        else {
            heldPiece.isHolding = false;
        }
    }

}

async function playMove(move) {
    /* Move the rook during a castling move*/
    // White short castle
    if (move.piece == Piece.WHITE_KING && move.fromFile + 2 == move.toFile) {
        board[7][5] = Piece.WHITE_ROOK;
        board[7][7] = Piece.EMPTY;
    }
    // White long castle
    else if (move.piece == Piece.WHITE_KING && move.fromFile  - 2 == move.toFile) {
        board[7][3] = Piece.WHITE_ROOK;
        board[7][0] = Piece.EMPTY;
    }
    // Black short castle
    else if (move.piece == Piece.BLACK_KING && move.fromFile  + 2 == move.toFile) {
        board[0][5] = Piece.BLACK_ROOK;
        board[0][7] = Piece.EMPTY;
    }
    // Black long castle
    else if (move.piece == Piece.BLACK_KING && move.fromFile  - 2 == move.toFile) {
        board[0][3] = Piece.BLACK_ROOK;
        board[0][0] = Piece.EMPTY;
    }

    /* Keep track if the king or rook moved to disqualifying future castling */
    // King moved
    if (move.piece == Piece.WHITE_KING) {
        castlingRights.white.kingMoved = true;
    } else if (move.piece == Piece.BLACK_KING) {
        castlingRights.black.kingMoved = true;
    }
    // Rook moved
    else if (move.piece == Piece.WHITE_ROOK) {
        if (move.fromRank == 7 && move.fromFile  == 7) castlingRights.white.shortRookMoved = true;
        if (move.fromRank == 7 && move.fromFile  == 0) castlingRights.white.longRookMoved = true;
    } else if (move.piece == Piece.BLACK_ROOK) {
        if (move.fromRank == 0 && move.fromFile  == 7) castlingRights.black.shortRookMoved = true;
        if (move.fromRank == 0 && move.fromFile  == 0) castlingRights.black.longRookMoved = true;
    }
    /* Promote pawns */
    if (Math.abs(move.piece) == Piece.WHITE_PAWN && (move.toRank == 0 || move.toRank == 7)) {
        // Player promotes a pawn, wait for a selection
        if (Math.sign(move.piece) === playerColor) {
            // Show the pawn being moved up and render before promoting
            move.apply();
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
        // Bot selects 
        else if (isBotGame) promotionSelection = Math.abs(Piece.WHITE_QUEEN);
        // Apply the promotion by changing the pawn's piece type
        move.piece = Math.sign(move.piece) * promotionSelection;
        // Remove the cached promotion 
        promotionSelection = null;
    }

    /* Applying the move */
    // Move the piece from the old square to the new
    move.apply();
    heldPiece.isHolding = false;
    // Store the move
    moveHistory.push(move);
    moveHistoryIndex++;
    // Highlight the move and update the board with the new position
    render(move);

    /* The move played ended the game */
    // TODO: game-over
    if (isGameOver()){
        endGame();
        render();
    }
}

function pickupPiece(rank, file) {
    // Record the piece being picked up
    heldPiece.isHolding = true;
    heldPiece.rank = rank;
    heldPiece.file = file;
    // Circle parameters;
    ctx.strokeStyle = "lightgreen";
    ctx.fillStyle = "lightgreen";
    ctx.lineWidth = 5;
    // Render indicators for legal moves of the held piece
    renderMoveIndicators(getLegalMoves(rank, file));
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

function getLegalMoves(fromRank, fromFile) {
    // Get the set of all moves possible for a piece at a given rank and file
    let legalMoves = [];
    /* Remove moves that put the king in check */
    const piece = board[fromRank][fromFile];
    for (const move of getAllMoves(fromRank, fromFile)) {
        // Temporary play the move
        move.apply();
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
        const forward = Math.sign(piece) == Color.WHITE ? -1 : 1;
        const startRank = Math.sign(piece) == Color.WHITE ? 6 : 1;
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
            if (isInBounds(fromRank + forward, fromFile + df) && Math.sign(board[fromRank + forward][fromFile + df]) == -Math.sign(piece)) {
                allMoves.push(new Move(fromRank, fromFile, fromRank + forward, fromFile + df));
            }
        }
        // TODO: En passant
    }
    /* Castling Moves */
    if (Math.abs(piece) == Piece.WHITE_KING) {
        // WHITE CASTLING
        if (!castlingRights.white.kingMoved) {
            if (!castlingRights.white.shortRookMoved && canCastle(Color.WHITE, [[7, 4], [7, 5], [7, 6]], [[7, 5], [7, 6]])){
                allMoves.push(new Move(fromRank, fromFile, 7, 6));
            }
            if (!castlingRights.white.longRookMoved && canCastle(Color.WHITE, [[7, 2], [7, 3], [7, 4]], [[7, 1], [7, 2], [7, 3]])){
                allMoves.push(new Move(fromRank, fromFile, 7, 2));
            }
        }
        // BLACK CASTLING
        if (!castlingRights.black.kingMoved) {
            if (!castlingRights.black.shortRookMoved && canCastle(Color.BLACK, [[0, 4], [0, 5], [0, 6]], [[0, 5], [0, 6]])){
                allMoves.push(new Move(fromRank, fromFile, 0, 6));
            }
            if (!castlingRights.black.longRookMoved && canCastle(Color.BLACK, [[0, 2], [0, 3], [0, 4]], [[0, 1], [0, 2], [0, 3]])){
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
    for (let searchRank = 0; searchRank <= 7; searchRank++) {
        for (let searchFile = 0; searchFile <= 7; searchFile++) {
            let searchPiece = board[searchRank][searchFile];
            // Look for opponent piece's legal moves
            if (Math.sign(searchPiece) != color) {
                // Ignore king moves to avoid infinite recursion in castle eligibility check
                if (castleCheck &&
                    Math.abs(searchPiece) == Math.abs(Piece.WHITE_KING))
                continue;


                // If any of the opponent's legal moves can reach the given square, it is attacked
                for (const attackMove of getAllMoves(searchRank, searchFile)) {
                    const attackedRank = attackMove.toRank, attackedFile = attackMove.toFile;
                    if (attackedRank == rank && attackedFile == file) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

function findPiece(piece) {
    let rank, file;
    for (let searchRank = 0; searchRank <= 7; searchRank++) {
        for (let searchFile = 0; searchFile <= 7; searchFile++) {
            if (board[searchRank][searchFile] == piece) {
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
    renderBoard();
    if (moveToHighlight != null) highlightMove(moveToHighlight);
    renderPieces();
}

function renderBoard() {
    // Render the black and white squares
    let white = playerColor == Piece.WHITE;
    for (let rank = 0; rank <= 7; rank++) {
        white = !white;
        for (let file = 0; file <= 7; file++) {
            // Fill in the square
            ctx.fillStyle = white ? "white" : "brown";
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
            // Get the corresponding piece image
            let pieceImg = pieceImages.get(piece);
            // Render the piece
            ctx.drawImage(
                pieceImg,
                file * TILE_SIZE,
                getFlippedRank(rank) * TILE_SIZE,
                TILE_SIZE,
                TILE_SIZE
            );
        }
    }
}

function renderMoveIndicators(moves){
    // Draw a circular move indicator for each move
    for (const move of moves) {
        const legalRank = move.toRank, legalFile = move.toFile;
        ctx.beginPath();
        ctx.arc(
            legalFile * TILE_SIZE + TILE_SIZE / 2,
            getFlippedRank(legalRank) * TILE_SIZE + TILE_SIZE / 2,
            TILE_SIZE / 8,
            0,
            Math.PI * 2
        );
        ctx.stroke();
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