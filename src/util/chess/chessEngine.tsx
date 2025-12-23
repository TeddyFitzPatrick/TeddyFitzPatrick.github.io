import { WaitFor, REMOVE, UPDATE } from "./networking.js";
import { pieceImages, pieceMovements, Piece, Color } from "./consts.js";
import { Move } from "./move.js";
import { useEffect, useRef } from "react";

/* DOM */
const promotionWindow = document.getElementById("promotionWindow")!;
const restartWindow = document.getElementById("restartWindow")!,
    gameOverText = document.getElementById("gameOverText")!;
/* Rendering */
const LIGHT_SQUARE_COLOR = "rgb(173, 189, 143)";
const DARK_SQUARE_COLOR = "rgb(111, 143, 114)";
const MOVE_INDICATOR_COLOR = "rgb(254, 57, 57)";
// const LIGHT_SQUARE_COLOR = "rgb(227, 193, 111)";
// const DARK_SQUARE_COLOR = "rgb(184, 139, 74)";
let ctx: CanvasRenderingContext2D,
    boardLength: number,
    TILE_SIZE: number; 
let moveIndicators: Move[] = [],
    moveHighlights: Move[] = [];

/* Game state */
export let board: number[][];
let moveHistory = [],
    moveHistoryIndex = -1;
let playerColor: number,
    turnToMove: number,
    promotionSelection: number | null;
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
/* Piece Held */
type HeldPiece = {
    rank: number;
    file: number;
    isHolding: boolean;
    x: number;
    y: number;
};
const heldPiece: HeldPiece = {
    rank: -1,
    file: -1,
    isHolding: false,
    x: -1,
    y: -1
};
let gameOver: boolean,
    winner: number = 0,
    roomCode: string | null,
    isMultiplayer: boolean;

export function ChessBoard(){
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const restartButtonRef = useRef<HTMLButtonElement | null>(null);
    // Canvas 
    useEffect(() => {
        const resizeCanvas = (): void => {
            const canvas = canvasRef.current;
            if (!canvas) throw new Error("chess canvas not found");
            // Set the 2d context
            ctx = canvas.getContext("2d")!;
            // Set canvas length to the minimum between the screen width and height
            const body = document.getElementById("body")!;
            boardLength = Math.min(body.offsetWidth, body.offsetHeight) - 36;
            // Fit the canvas and the chess squares to match the new window dimensions
            TILE_SIZE = boardLength / 8;
            canvas.width = boardLength;
            canvas.height = boardLength;
        }
        window.addEventListener("resize", resizeCanvas);
        resizeCanvas();
        return () => {
            window.removeEventListener("resize", resizeCanvas);
        };
    }, []);
    // Click / Tap 
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) throw new Error("chess canvas not found");
        const getMousePos = (event: MouseEvent): {mouseX: number, mouseY: number} => {
            const rect = canvas.getBoundingClientRect();
            return {
                mouseX: event.clientX - rect.left,
                mouseY: event.clientY - rect.top,
            }
        }
        const getTouchPos = (event: TouchEvent): {touchX: number, touchY: number} => {
            const rect = canvas.getBoundingClientRect();
            const touch = event.touches[0];
            return {
                touchX: touch.clientX - rect.left,
                touchY: touch.clientY - rect.top
            }
        }
        /* Desktop/Mouse */
        const handleMouseDown = (event: MouseEvent): void => {
            const { mouseX, mouseY } = getMousePos(event);
            const file = Math.floor(mouseX / TILE_SIZE);
            const rank = Math.floor(mouseY / TILE_SIZE);
            pickupPiece(getFlippedRank(rank), file);
            // Update piece held
            heldPiece.x = mouseX - 0.5 * TILE_SIZE;
            heldPiece.y = mouseY - 0.5 * TILE_SIZE;
        }
        const handleMouseMove = (event: MouseEvent): void => {
            if (!heldPiece.isHolding) return;
            const { mouseX, mouseY } = getMousePos(event);
            heldPiece.x = mouseX - 0.5 * TILE_SIZE;
            heldPiece.y = mouseY - 0.5 * TILE_SIZE;
        }
        const handleMouseUp = (event: MouseEvent): void => {
            if (!heldPiece.isHolding) return;
            heldPiece.isHolding = false;
            moveHighlights = [];
            moveIndicators = [];
            const { mouseX, mouseY } = getMousePos(event);
            const file = Math.floor(mouseX / TILE_SIZE);
            const rank = Math.floor(mouseY / TILE_SIZE);
            releasePiece(getFlippedRank(rank), file);
        }
        /* Mobile/Touch */
        const handleTouchStart = (event: TouchEvent): void => {
            event.preventDefault();
            const { touchX, touchY } = getTouchPos(event)
            const file = Math.floor(touchX / TILE_SIZE);
            const rank = Math.floor(touchY / TILE_SIZE);
            pickupPiece(getFlippedRank(rank), file);
            heldPiece.x = touchX - 0.5 * TILE_SIZE;
            heldPiece.y = touchY - 0.5 * TILE_SIZE;
        }
        const handleTouchMove = (event: TouchEvent): void => {
            if (!heldPiece.isHolding) return;
            event.preventDefault();
            const { touchX, touchY } = getTouchPos(event)
            heldPiece.x = touchX - 0.5 * TILE_SIZE;
            heldPiece.y = touchY - 0.5 * TILE_SIZE;
        }
        const handleTouchEnd = (event: TouchEvent): void => {
            if (!heldPiece.isHolding) return;
            event.preventDefault();
            heldPiece.isHolding = false;
            moveHighlights = []
            moveIndicators = []
            const { touchX, touchY } = getTouchPos(event)
            const file = Math.floor(touchX / TILE_SIZE);
            const rank = Math.floor(touchY / TILE_SIZE);
            releasePiece(getFlippedRank(rank), file);
        }
        canvas.addEventListener("mousedown", handleMouseDown);
        canvas.addEventListener("mousemove", handleMouseMove);
        canvas.addEventListener("mouseup", handleMouseUp);

        canvas.addEventListener("touchstart", handleTouchStart);
        canvas.addEventListener("touchmove", handleTouchMove);
        canvas.addEventListener("touchend", handleTouchEnd);
        return () => {
            canvas.removeEventListener("mousedown", handleMouseDown);
            canvas.removeEventListener("mousemove", handleMouseMove);
            canvas.removeEventListener("mouseup", handleMouseUp);

            canvas.removeEventListener("touchstart", handleTouchStart);
            canvas.removeEventListener("touchmove", handleTouchMove);
            canvas.removeEventListener("touchend", handleTouchEnd);
        }
    }, []);
    const restartGame = (): void => {
        gameOver = false;
        toggle(restartWindow);
        runGame(playerColor);
    }
    const promoteToQueen = (): void => {
        promotionSelection = Piece.WHITE_QUEEN;
    }
    const promoteToRook = (): void => {
        promotionSelection = Piece.WHITE_ROOK;
    }
    const promoteToBishop = (): void => {
        promotionSelection = Piece.WHITE_BISHOP;
    }
    const promoteToKnight = (): void => {
        promotionSelection = Piece.WHITE_KING;
    }
    return <>
        <div className="flex w-full h-full justify-center items-center">
            {/* <!-- Chess Board --> */}
            <div className="border-8 border-amber-950 rounded-xl shadow-2xl">
                <canvas ref={canvasRef} width="69" height="69"></canvas>
            </div>
            {/* <!-- Restart Window --> */}
            <div id="restartWindow" className="hidden flex absolute flex-col justify-center items-center space-y-10  opacity-65
                bg-slate-500 w-[90%] h-[90%] rounded-2xl border-black border-8">
                {/* <!-- Game over text --> */}
                <h1 id="gameOverText" className="text-center text-bold italic text-white text-3xl">
                    Game Over Text Placeholder
                </h1>
                {/* <!-- Restart --> */}
                <button onClick={restartGame} ref={restartButtonRef} className="text-bold text-3xl p-4 hover:scale-105 rounded-2xl shadow-2xl border-black bg-blue-500 text-white">
                    Play Again
                </button>
            </div>
            {/* <!-- Pawn Promotion Selection --> */}
            <div id="promotionWindow" className="hidden flex absolute flex-row justify-around items-center
            bg-opacity-70 bg-slate-600 w-full sm:w-1/2 h-[20%] top-[40%] left-0 sm:left-1/4 rounded-3xl border-black border-8">
                <img onClick={promoteToQueen}  src="/chess/whiteQueen.png" alt="queen" className="bg-slate-200 rounded-2xl w-1/5 aspect-square hover:scale-110 shadow-2xl invert"/>
                <img onClick={promoteToRook}   src="/chess/whiteRook.png" alt="rook"  className="bg-slate-200 rounded-2xl w-1/5 aspect-square hover:scale-110 shadow-2xl invert"/>
                <img onClick={promoteToBishop} src="/chess/whiteBishop.png" alt="bishop" className="bg-slate-200 rounded-2xl w-1/5 aspect-square hover:scale-110 shadow-2xl invert"/>
                <img onClick={promoteToKnight} src="/chess/blackKnight.png" alt="knight" className="bg-slate-200 rounded-2xl w-1/5 aspect-square hover:scale-110 shadow-2xl invert"/>
            </div>
        </div>
    </>
}

export function initGame(multiplayer: boolean = false, code: string | null = null, color: number = Color.WHITE) {
    /* GAMEMODES */
    isMultiplayer = multiplayer;
    // Multiplayer
    if (isMultiplayer){
        roomCode = code;
    }
    // Start game
    runGame(color);
    // Rendering loop
    setInterval(() => {
        render();
    }, 30);
}

async function runGame(color: number) {
    // Randomly assign a color if one wasn't selected
    playerColor = (color !== undefined) ? color : Math.random() >= 0.5 ? 1 : -1;
    // Local games start with white
    if (!isMultiplayer) playerColor = Color.WHITE;
    turnToMove = Color.WHITE; // White moves first
    // Initial board layout
    resetBoard();
    // Player is black, wait for response on online games
    if (isMultiplayer && playerColor === Color.BLACK){
        // Wait for opponent
        await receiveMove();
        turnToMove *= -1;
    }
}

function endGame() {
    gameOver = true;
    toggle(restartWindow);
}

function pickupPiece(rank: number, file: number) {
    // Get the piece clicked
    const pieceClicked = board[rank][file];
    // Moves can't be played if the game's over
    if (gameOver) return;
    // Player must wait for opponent's move
    if (isMultiplayer && turnToMove != playerColor) return;
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

async function releasePiece(rank: number, file: number){
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
        // Local
        else {
            // Switch the player color to flip the board
            playerColor *= -1;
        }
    }
}

async function playMove(move: Move) {
    if (!move) throw new Error('No move');
    /* Promote pawns */
    if (Math.abs(move.piece) == Piece.WHITE_PAWN && (move.toRank == 0 || move.toRank == 7)) {
        // Player promotes a pawn, wait for a selection
        if (Math.sign(move.piece) === playerColor) {
            // Show the pawn being moved up and render before promoting
            move.play();
            moveHighlights.push(move);
            // Turn on the promotion window and wait for a selection
            toggle(promotionWindow);
            await new Promise<void>((resolve) => {
                const check = setInterval(() => {
                    if (promotionSelection != null) {
                        clearInterval(check);
                        resolve();
                    }
                }, 50);
            });
            toggle(promotionWindow);
        };
        if (!promotionSelection) throw new Error('Promotion window closed, but no selection was saved')
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

function isLegalMove(move: Move) {
    for (const legalMove of getLegalMoves(move.fromRank, move.fromFile)) {
        // Check the move is legal if a legal move exists that ends in the same square
        if (move.toRank === legalMove.toRank && 
            move.toFile === legalMove.toFile) {
            return true;
        }
    }
    return false;
}

function getAllLegalMoves(color: number): Move[]{
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

function getLegalMoves(fromRank: number, fromFile: number) {
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

function getPseudoLegalMoves(fromRank: number, fromFile: number) {
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

function getSlidingMoves(fromRank: number, fromFile: number) {
    let slidingMoves = [];
    const piece = board[fromRank][fromFile];
    for (const [dr, df] of pieceMovements[Math.abs(piece)] as Array<[number, number]>) {
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

function getAdjacentMoves(fromRank: number, fromFile: number) {
    let adjacentMoves = [];
    const piece = board[fromRank][fromFile];
    // Adjacent king moves
    for (const [dr, df] of pieceMovements[Math.abs(piece)] as Array<[number, number]>){
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

function canCastle(color: number, attackedSquares: Array<[number, number]>, emptySquares: Array<[number, number]>) {
    for (const [r, f] of attackedSquares) {
        if (isAttacked(r, f, color, true)) return false;
    }
    for (const [r, f] of emptySquares) {
        if (board[r][f] != Piece.EMPTY) return false;
    }
    return true;
}

function isChecked(color: number){
    const kingPos = findPiece(color * Piece.WHITE_KING);
    return isAttacked(kingPos[0], kingPos[1], color);
}

function isAttacked(rank: number, file: number, color: number, castleCheck = false) {
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

function findPiece(piece: number) {
    for (let searchRank = 0; searchRank <= 7; searchRank++) {
        for (let searchFile = 0; searchFile <= 7; searchFile++) {
            if (board[searchRank][searchFile] === piece) {
                return [searchRank, searchFile];
            }
        }
    }
    return [];
}

type MoveData = {
    [color: string]: {
        from: [number, number];
        to: [number, number];
        promote: string;
    };
};
/* Database Communication */
async function sendMove(move: Move){
    if (!roomCode) throw new Error('Error sending move, room code is null');
    // Send the move to the opponent
    const playerColorStr = (playerColor == Color.WHITE) ? "whiteMove" : "blackMove";
    const moveData: MoveData = {
        [playerColorStr]: {
            from: [move.fromRank, move.fromFile],
            to: [move.toRank, move.toFile],
            promote: (promotionSelection == null) ? "" : String(promotionSelection)
        }
    }
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
    const moveData = await WaitFor(opponentMovePath) as {
        from: [number, number];
        to: [number, number];
        promote: string;
    };
    const from: [number, number] = moveData.from;
    const to: [number, number]  = moveData.to;
    promotionSelection = +moveData.promote;
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

function isInBounds(rank: number, file: number) {
    return rank >= 0 && rank <= 7 && file >= 0 && file <= 7;
}

function getFlippedRank(rank: number) {
    return playerColor == Color.WHITE ? rank : 7 - rank;
}

/* Rendering */
function render() {
    // Render the squares
    let isWhite: boolean = (playerColor == Color.WHITE);
    for (let rank = 0; rank <= 7; rank++) {
        isWhite = !isWhite;
        for (let file = 0; file <= 7; file++) {
            // Render the square
            ctx.fillStyle = isWhite ? LIGHT_SQUARE_COLOR : DARK_SQUARE_COLOR;
            ctx.fillRect(
                file * TILE_SIZE,
                getFlippedRank(rank) * TILE_SIZE,
                TILE_SIZE,
                TILE_SIZE
            );
            isWhite = !isWhite;
        }
    }
    // Render move highlights
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
    // Render move indicators
    if (moveIndicators !== null && moveIndicators.length !== 0){
        ctx.fillStyle = MOVE_INDICATOR_COLOR;
        // Draw a circular move indicator for each legal move available
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
    // Render static pieces
    for (let rank = 0; rank <= 7; rank++) {
        for (let file = 0; file <= 7; file++) {
            const piece = board[rank][file];
            // Ignore empty squares
            if (piece === Piece.EMPTY) continue;
            // Ignore the held piece
            if (heldPiece.isHolding && heldPiece.rank == rank && heldPiece.file == file) continue;
            // Render the piece
            ctx.drawImage(pieceImages.get(piece)!, file * TILE_SIZE, getFlippedRank(rank) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
    // Render the piece held
    if (heldPiece.isHolding) {
        const heldPieceImage: HTMLImageElement = pieceImages.get(board[heldPiece.rank][heldPiece.file])!;
        ctx.drawImage(heldPieceImage, heldPiece.x, heldPiece.y, TILE_SIZE, TILE_SIZE);
    }
}

function toggle(window: HTMLElement) {
    if (window.classList.contains("hidden")) {
        window.classList.remove("hidden");
    } else {
        window.classList.add("hidden");
    }
}