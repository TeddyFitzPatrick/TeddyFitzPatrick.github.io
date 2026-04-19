import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { WaitFor, GET, UPDATE, REMOVE } from "./networking.js";
import { pieceImages, pieceMovements, Piece, Color } from "./consts.js";
import { Move, getAlgebraicNotation } from "./move.js";

/* Rendering */
const LIGHT_SQUARE_COLOR = "rgb(173, 189, 143)";
const DARK_SQUARE_COLOR = "rgb(111, 143, 114)";
// const LIGHT_SQUARE_COLOR = "rgb(227, 193, 111)";
// const DARK_SQUARE_COLOR = "rgb(184, 139, 74)";
const LIGHT_HIGHLIGHT_COLOR = "rgba(173, 216, 230, 0.8)";
const DARK_HIGHLIGHT_COLOR = "rgba(4, 2, 115, 0.5)";
const MOVE_INDICATOR_COLOR = "rgba(254, 57, 57, 0.5)";

/**
 * NOTE TO SELF: CONSIDER DOING SOME PERFT TESTING
 * Perft 4: 197,281 legal moves
 * Perft 5: 4,865,609 legal moves
 */

/* Page selection */
type Setter<T> = React.Dispatch<React.SetStateAction<T>>
type Ref<T> = {current: T}
type PageKey = "SelectGamemode" | "MultiplayerConfiguration" | "Board";
export type PageContext = {
    // reactive state for UI
    selected: PageKey,
    showPromotion: boolean,
    showRestart: boolean,
    gameOverText: string
    // page nav state
    selectedRef: Ref<PageKey>,
    showPromotionRef: Ref<boolean>,
    showRestartRef: Ref<boolean>,
    gameOverTextRef: Ref<string>
    // update
    setSelected: Setter<PageKey>
    setShowPromotion: Setter<boolean>,
    setShowRestart: Setter<boolean>,
    setGameOverText: Setter<string>
};
/* Game configuration*/
type ChessContext = {
    isMultiplayer: boolean,
    roomCode: string,
    color: number
}
let chessContext: ChessContext = {
    isMultiplayer: false,
    roomCode: "uninitialized",
    color: Color.WHITE
}

/* Game state */
export let board: number[][];
let ctx: CanvasRenderingContext2D,
    boardLength: number,
    TILE_SIZE: number,
    moveIndicators: Move[],
    moveHighlights: Move[],
    moveHistoryIndex = -1,
    promotionSelection: number | null = null,
    turnToMove: number;

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

export default function Chess(){
    const [selected, setSelected] = useState<PageKey>("SelectGamemode");
    const [showRestart, setShowRestart] = useState<boolean>(false);
    const [showPromotion, setShowPromotion] = useState<boolean>(false);
    const [gameOverText, setGameOverText] = useState<string>("...");
    // create references for the nav-state to prevent constant re-renders
    const showPromotionRef = useRef(showPromotion);
    const showRestartRef = useRef(showRestart);
    const gameOverTextRef = useRef(gameOverText);
    const selectedRef = useRef(selected);
    // sync refs with state changes (via setters)
    useEffect(() => {
        showPromotionRef.current = showPromotion;
    }, [showPromotion]);
    useEffect(() => {
        showRestartRef.current = showRestart;
    }, [showRestart]);
    useEffect(() => {
        gameOverTextRef.current = gameOverText;
    }, [gameOverText]);
    useEffect(() => {
        selectedRef.current = selected;
    }, [selected]);
    const pageContext: PageContext = {
        selected,
        showPromotion,
        showRestart,
        gameOverText,
        selectedRef,
        showPromotionRef,
        showRestartRef,
        gameOverTextRef,
        setSelected,
        setShowPromotion,
        setShowRestart,
        setGameOverText
    }
    const pages = {
        SelectGamemode: 
            <SelectGamemode pageContext={pageContext}/>,
        MultiplayerConfiguration: 
            <MultiplayerConfiguration pageContext={pageContext}/>,
        Board: 
            <Board pageContext={pageContext} />
    }
    return <>
    <div className="flex justify-center items-center w-screen h-screen bg-slate-800 m-0 p-0" id="body">
        {pages[selected]}
    </div>
    </>;
};

function SelectGamemode({pageContext}: {pageContext: PageContext}){
    const startLocalGame = (): void => {
        pageContext.setSelected("Board");
        chessContext = {
            isMultiplayer: false,
            roomCode: "lol it's local",
            color: Color.WHITE
        }
        initChess(pageContext);
    }
    const gotoMultiplayerConfiguration = (): void => {
        pageContext.setSelected("MultiplayerConfiguration");
    }
    return (
        <div className="flex justify-evenly flex-col space-y-3 text-center items-center p-12 w-4/5 sm:w-1/2 h-3/4 min-h-fit sm:h-1/2 bg-white rounded-2xl shadow-2xl">
            {/* <!-- Back to Home --> */}
            <Link to="/">
                <button className="text-xl sm:text-4xl bg-blue-400 text-white shadow-2xl p-6 rounded-2xl hover:scale-101 absolute left-6 top-4">
                    Back to Home
                </button>
            </Link>
            <h1 className="text-4xl sm:text-5xl font-bold">Teddy Chess</h1>
            <button onClick={startLocalGame} className="p-4 w-full h-1/2 rounded-2xl shadow-2xl text-3xl bg-black font-bold text-white hover:scale-[102%]">
                LOCAL
            </button>
            <button onClick={gotoMultiplayerConfiguration} className="p-4 w-full h-1/2 rounded-2xl shadow-2xl text-3xl bg-black font-bold text-white hover:scale-[102%]">
                ONLINE
            </button>
        </div>
    );
}

function MultiplayerConfiguration({pageContext}: {pageContext: PageContext}){
    let isHosting: boolean = false;
    let hostColor: number | undefined;
    let hostRoomCode: string | undefined;
    const roomDisplayRef = useRef<HTMLParagraphElement | null>(null);
    const selectWhiteRef = useRef<HTMLButtonElement | null>(null);
    const selectBlackRef = useRef<HTMLButtonElement | null>(null);
    const enterRoomCodeRef = useRef<HTMLInputElement | null>(null);

    const selectWhite = (): void => {
        if (!selectWhiteRef.current || !selectBlackRef.current) return;
        selectWhiteRef.current.classList.add("border-cyan-500", "border-8", "scale-105");
        selectBlackRef.current.classList.remove("border-cyan-500", "border-8", "scale-105");
        hostColor = 1;
    }
    const selectBlack  = async function(){
        if (!selectBlackRef.current || !selectWhiteRef.current) return;
        selectBlackRef.current.classList.add("border-cyan-500", "border-8", "scale-105");
        selectWhiteRef.current.classList.remove("border-cyan-500", "border-8", "scale-105");
        hostColor = -1;
        if (isHosting && hostRoomCode) await UPDATE(hostRoomCode, {"joined": 0, "hostColor": hostColor})
    }
    const hostRoom = async function(){
        isHosting = true;
        // Generate a random 4-letter room code
        hostRoomCode = generateRoomCode();
        // Automatically copy the room code to clipboard
        navigator.clipboard.writeText(hostRoomCode);
        // Display the code 
        roomDisplayRef.current!.textContent = hostRoomCode;
        // If a color has not been picked, then choose one randomly
        hostColor ??= Math.random() >= 0.5 ? 1 : -1;
        // Put the room on firebase
        await UPDATE(hostRoomCode, {"joined": 0, "hostColor": hostColor})
        // Wait for the opponent to update the joined status to start the game
        await WaitFor(`${hostRoomCode}/joined`, 1);
        // Player has joined, start the game
        pageContext.setSelected("Board");
        chessContext = {
            isMultiplayer: true,
            roomCode: hostRoomCode,
            color: hostColor
        }
        initChess(pageContext);
    }
    const joinRoom = async function(){
        // Read the room code
        const joinRoomCode = enterRoomCodeRef.current!.value.toUpperCase();
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
        pageContext.setSelected("Board");
        chessContext = {
            isMultiplayer: true,
            roomCode: joinRoomCode,
            color: -hostColor
        }
        initChess(pageContext);
    }
    return <>
    <div className="text-black flex flex-col lg:flex-row space-y-6 lg:space-y-0 bg-white w-[90%] sm:w-3/4 xl:w-3/5 h-fit lg:h-3/5 text-2xl font-bold border-black p-4 sm:p-8 rounded-2xl shadow-2xl">
        {/* <!-- HOST --> */}
        <div className="flex items-center mr-0 lg:mr-6 space-y-4 flex-col w-full lg:w-1/2 h-full border-4 border-black rounded-xl p-4">
            <h1 className="font-bold text-4xl italic underline">Host Room</h1>
            <div className="w-fit h-fit text-center space-y-4">
                <h1 className="italic">Pick Color (default random)</h1>
                <div className="flex flex-row w-full h-full justify-around">
                    <button ref={selectWhiteRef} onClick={selectWhite} className="w-36 h-36 bg-white rounded-xl border-4 border-aqua hover:scale-105"></button>
                    <button ref={selectBlackRef} onClick={selectBlack} className="w-36 h-36 bg-black rounded-xl border-4 hover:scale-105"></button>
                </div>
            </div>
            <button onClick={hostRoom} className="rounded-xl bg-blue-500 text-white hover:scale-110 shadow-lg p-4 sm:p-6">
                Host Room
            </button>
            <div className="flex flex-col bg-gray-300 rounded-xl w-full p-6">
                <b>Your room code: </b> <p ref={roomDisplayRef} className="text-3xl font-extrabold"> .... </p>
            </div>
        </div>
        {/* <!-- JOIN --> */}
        <div className="flex items-center space-y-4 flex-col w-full lg:w-1/2 h-full border-4 border-black rounded-xl p-4 lg:p-4 ">
            <h1 className="font-bold italic text-4xl underline">Join Room</h1>
            <div className="flex flex-col space-y-2 w-full">
                <input type="text" 
                    ref={enterRoomCodeRef}
                    placeholder="Enter Room Code..." 
                    className="bg-white text-lg border-4 p-2 w-full max-w-full h-16 rounded-xl border-black"/>
                <input type="submit" 
                    onClick={joinRoom} 
                    value="Enter"
                    className="w-28 h-12 bg-blue-500 shadow-xl text-white rext-2xl p-2 rounded-xl hover:scale-105"/>
            </div>
        </div>
    </div>
    </>
}

function generateRoomCode(): string{
    // Generate a random 4-letter room code
    let roomCode = "";
    for (let i=1; i<=4; i++){
        roomCode += String.fromCharCode('A'.charCodeAt(0) + Math.floor(Math.random() * 26));
    }
    return roomCode;
}

function Board({pageContext}: {pageContext: PageContext}){
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [moveHistory, setMoveHistory] = useState<Move[]>([]);
    // reset
    useEffect(()=>{
        if (pageContext.showRestart && pageContext.gameOverText === "..."){
            setMoveHistory([]);
        }
    },[pageContext.showRestart])
    //testing
    useEffect(() => {
        const navigateMoveHistory = (event: KeyboardEvent): void => {
            if (moveHistory.length <= 1) return;
            const lastPlayedMove: Move = moveHistory.at(-1)!;
            if (event.key === "ArrowLeft"){
                if (moveHistoryIndex >= 0) moveHistoryIndex--;
                lastPlayedMove.undo();
                turnToMove *= -1;
            } else if (event.key === "ArrowRight"){
                if (moveHistoryIndex < moveHistory.length - 1) moveHistoryIndex++;
                lastPlayedMove.play();
                turnToMove *= -1;
            }
            render();
        };
        window.addEventListener("keydown", navigateMoveHistory);
        return () => {
            window.removeEventListener("keydown", navigateMoveHistory);
        }
    }, [moveHistory]);
    // Canvas 
    useEffect(() => {
        const resizeCanvas = (): void => {
            const canvas = canvasRef.current;
            if (!canvas) throw new Error("chess canvas not found");
            // Set the 2d context
            ctx = canvas.getContext("2d")!;
            // Set canvas length to the minimum between the screen width and height
            const body = document.getElementById("body")!;
            boardLength = Math.min(body.offsetWidth, body.offsetHeight) - 32;
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
    // Event listeners for Mouse + Tap: Press, Drag, and Release
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
            const touch = event.touches[0] || event.changedTouches[0];
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
            pickupPiece(getFlippedRank(rank), file, pageContext);
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
            releasePiece(getFlippedRank(rank), file, pageContext, setMoveHistory);
        }
        /* Mobile/Touch */
        const handleTouchStart = (event: TouchEvent): void => {
            event.preventDefault();
            const { touchX, touchY } = getTouchPos(event)
            const file = Math.floor(touchX / TILE_SIZE);
            const rank = Math.floor(touchY / TILE_SIZE);
            pickupPiece(getFlippedRank(rank), file, pageContext);
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
            releasePiece(getFlippedRank(rank), file, pageContext, setMoveHistory);
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

    return <>
    <div className="flex w-full h-full justify-center items-center">
        {/* Board and move list */}
        <div className="flex space-y-4 sm:space-y-0 sm:space-x-8 flex-col md:flex-row max-w-screen max-h-screen">
            <canvas ref={canvasRef} 
                width="69" 
                height="69"
                className="border-0 sm:border-8 border-amber-950 rounded-0 sm:rounded-xl shadow-2xl">
            </canvas>
            <MoveList moveHistory={moveHistory}/>
        </div>
        {/* <!-- Restart Window --> */}
        {pageContext.showRestart && <RestartWindow pageContext={pageContext}/>}
        {/* <!-- Pawn Promotion Selection --> */}
        {pageContext.showPromotion && <PromotionWindow pageContext={pageContext}/>}
    </div>
    </>
}

function MoveList({moveHistory}: {moveHistory: Move[]}){
    return <>
    <div className="bg-slate-600 w-60 h-full rounded-lg p-4 hidden md:visible">
        <h1 className="font-extrabold text-2xl pb-4">Move History</h1>
        <ul className="space-y-2 font-bold text-xl overflow-y-auto scroll-smooth h-fit max-h-[90vh]">
            {moveHistory.map((move, index) => (
                <MoveRecord key={index} index={index} move={move}/>
            ))}
        </ul>
    </div>
    </>
}

function MoveRecord({index, move}: {index: number, move: Move}){
    return <li className="w-full flex flex-row text-xl">
        <div className={`w-7 h-7 shrink-0 shadow-2xl ${Math.sign(move.piece) === 1 ? "bg-white" : "bg-black"}`}/>
        <div className="w-full flex justify-around"> 
            <div>{move.algebraicNotation} </div>
            <div>{index+1}</div>
        </div>
    </li>
}

function RestartWindow({pageContext}: {pageContext: PageContext}){
    const restartButtonRef = useRef<HTMLButtonElement | null>(null);
    const restartGame = (): void => {RestartWindow
        pageContext.setShowRestart(false);
        chessContext = {
            ...chessContext,
            color: Color.WHITE
        }
        initChess(pageContext);
    }
    return <>
    <div className="flex absolute flex-col justify-center items-center space-y-10 opacity-90
        bg-slate-500 w-[90%] h-[90%] rounded-2xl">
        {/* <!-- Game over text --> */}
        <h1 className="text-center text-bold italic text-white text-3xl">
            {pageContext.gameOverTextRef.current}
        </h1>
        {/* <!-- Restart --> */}
        <button onClick={restartGame} ref={restartButtonRef} className="text-bold text-3xl p-4 hover:scale-105 rounded-2xl shadow-2xl border-black bg-blue-500 text-white">
            Play Again
        </button>
    </div>
    </>
}

function PromotionWindow({pageContext}: {pageContext: PageContext}){
    return <>
    <div className="flex absolute flex-row justify-around items-center z-20
        bg-opacity-70 bg-slate-600 w-full sm:w-1/2 h-[20%] top-[40%] left-0 sm:left-1/4 rounded-3xl border-black border-8">
        <PromotionOption filename="whiteQueen" promotionPiece={Piece.WHITE_QUEEN} pageContext={pageContext}/>
        <PromotionOption filename="whiteRook" promotionPiece={Piece.WHITE_ROOK} pageContext={pageContext}/>
        <PromotionOption filename="whiteBishop" promotionPiece={Piece.WHITE_BISHOP} pageContext={pageContext}/>
        <PromotionOption filename="blackKnight" promotionPiece={Piece.WHITE_KNIGHT} pageContext={pageContext}/>
    </div>
    </>
}

function PromotionOption({filename, promotionPiece, pageContext}: {filename: string, promotionPiece: number, pageContext: PageContext}){
    const promote = (): void => {
        promotionSelection = promotionPiece;
        pageContext.setShowPromotion(false);
    }
    return <>
        <img onClick={promote} 
        src={`/chess/${filename}.png`}
        alt={filename}
        draggable={false}
        className="bg-slate-200 rounded-2xl w-1/5 aspect-square hover:scale-110 shadow-2xl invert"/>
    </>
}

async function initChess(pageContext: PageContext) {
    // clear rendering artifacts from prior games
    moveHighlights = [];
    moveIndicators = [];

    resetBoard();
    turnToMove = Color.WHITE; // White moves first
    if (chessContext.isMultiplayer && chessContext.color === Color.BLACK){
        await receiveMove(pageContext);
        turnToMove *= -1;
    }
    // Continuous rerendering
    setInterval(() => {
        render();
    }, 30);
}

function pickupPiece(rank: number, file: number, pageContext: PageContext) {
    if (pageContext.showPromotionRef.current || pageContext.showRestartRef.current) return;
    // Get the piece clicked
    const pieceClicked = board[rank][file];
    // Moves can't be played if the game's over
    if (pageContext.showRestartRef.current) return;
    // Player must wait for opponent's move
    if (chessContext.isMultiplayer && turnToMove != chessContext.color) return;
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

async function releasePiece(rank: number, file: number, pageContext: PageContext, setMoveHistory: Setter<Move[]>){
    // Played move
    const playerMove = new Move(heldPiece.rank, heldPiece.file, rank, file);
    // Play a legal move
    if (isLegalMove(playerMove)) {
        // Play the move on the board
        await playMove(playerMove, pageContext);
        // Switch the turn (unless the game just ended)
        if (!pageContext.showRestart) turnToMove *= -1;
        /* PROMPT OPPONENT RESPONSE */
        // Multiplayer
        if (chessContext.isMultiplayer){
            // Send the move to the DB for the opponent to read
            sendMove(playerMove);
            // Wait for the opponent's response
            await receiveMove(pageContext);
            turnToMove *= -1;
        } 
        // Local
        else {
            // Switch the player color to flip the board
            chessContext.color *= -1;
        }
        // Record the move
        setMoveHistory(moveHistory => [...moveHistory, playerMove]);
    }
}

async function playMove(move: Move, pageContext: PageContext) {
    /* Promote pawns */
    if (Math.abs(move.piece) == Piece.WHITE_PAWN && (move.toRank == 0 || move.toRank == 7)) {
        // Player promotes a pawn, wait for a selection
        if (Math.sign(move.piece) === chessContext.color) {
            // Show the pawn being moved up and render before promoting
            move.play();
            moveHighlights.push(move);
            // Turn on the promotion window and wait for a selection
            pageContext.setShowPromotion(true);
            await new Promise<void>((resolve) => {
                const check = setInterval(() => {
                    // Wait for a promotion piece to be selected, closing the promotion window
                    if (!pageContext.showPromotionRef.current && promotionSelection !== null) {
                        clearInterval(check);
                        resolve();
                    }
                }, 50);
            });
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
    moveHistoryIndex++;
    // Store the move highlight
    moveHighlights.push(move);
    /* The move played ended the game */
    if (isGameOver(pageContext)){
        pageContext.setShowRestart(true);
    }
}

/* Chess Implementation Functions */
function isGameOver(pageContext: PageContext) {
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
                pageContext.setGameOverText(`${color == Color.WHITE ? "Black" : "White"} wins by checkmate`);
            // Stalemate
            } else{
                pageContext.setGameOverText(`Draw by stalemate`);
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

// function getAllLegalMoves(color: number): Move[]{
//     let allLegalMoves = [];
//     // Get all legal moves for a given color
//     for (let rank = 0; rank <= 7; rank++){
//         for (let file = 0; file <= 7; file++){
//             if (Math.sign(board[rank][file]) === color){
//                 allLegalMoves.push(...getLegalMoves(rank, file));
//             }
//         }
//     }
//     return allLegalMoves;
// }

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
    if (!chessContext.roomCode) throw new Error('Error sending move, room code is null');
    // Send the move to the opponent
    const playerColorStr = (chessContext.color == Color.WHITE) ? "whiteMove" : "blackMove";
    const moveData: MoveData = {
        [playerColorStr]: {
            from: [move.fromRank, move.fromFile],
            to: [move.toRank, move.toFile],
            promote: (promotionSelection == null) ? "" : String(promotionSelection)
        }
    }
    // Update the move to the DB
    UPDATE(chessContext.roomCode, moveData);
    // Reset for future pawn promotions
    promotionSelection = null;
}

async function receiveMove(pageContext: PageContext) {
    // Wait to receive the opponent's response
    const opponentMovePath = `${chessContext.roomCode}/${
        chessContext.color == 1 ? "black" : "white"
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
    await playMove(new Move(from[0], from[1], to[0], to[1]), pageContext);
}

/* Board Utilities */
function resetBoard() {
    board = 
    [
        [-4, -2, -3, -5, -6, -3, -2, -4],
        [-1, -1, -1, -1, -1, -1, -1, -1],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [4, 2, 3, 5, 6, 3, 2, 4]
    ];
    // DEFAULT GAME BOARD
    // [
    //     [-4, -2, -3, -5, -6, -3, -2, -4],
    //     [-1, -1, -1, -1, -1, -1, -1, -1],
    //     [0, 0, 0, 0, 0, 0, 0, 0],
    //     [0, 0, 0, 0, 0, 0, 0, 0],
    //     [0, 0, 0, 0, 0, 0, 0, 0],
    //     [0, 0, 0, 0, 0, 0, 0, 0],
    //     [1, 1, 1, 1, 1, 1, 1, 1],
    //     [4, 2, 3, 5, 6, 3, 2, 4]
    // ]
    // DEBUG BOARD
    // [
    //     [0, 0, -3, -5, -6, -3, -2, -4],
    //     [1, 0, -1, -1, -1, -1, -1, -1],
    //     [0, 0, 0, 0, 0, 0, 0, 0],
    //     [0, 0, 0, 0, 0, 0, 0, 0],
    //     [0, 0, 0, 0, 0, 0, 0, 0],
    //     [0, 0, 0, 0, 0, 0, 0, 0],
    //     [-1, 0, 1, 1, 1, 1, 1, 1],
    //     [0, 0, 3, 5, 6, 3, 2, 4]
    // ];
    // ONE-MOVE CHECKMATE BOARD
    // [
    //     [0, 0, 0, 0, -6, -3, -2, -4],
    //     [5, -1, -1, -1, -1, -1, -1, -1],
    //     [0, 0, 0, 0, 0, 0, 0, 0],
    //     [0, 0, 0, 0, 0, 0, 0, 0],
    //     [0, 0, 0, 0, 0, 0, 0, 0],
    //     [0, 0, 0, 0, 0, 0, 0, 0],
    //     [0, 0, 0, 0, 0, 0, 0, 0],
    //     [5, 0, 3, 5, 6, 3, 2, 4]
    // ];
}

function isInBounds(rank: number, file: number) {
    return rank >= 0 && rank <= 7 && file >= 0 && file <= 7;
}

function getFlippedRank(rank: number) {
    return chessContext.color === Color.WHITE ? rank : 7 - rank;
}

/* Rendering */
function render() {
    // Render the squares
    let isWhite: boolean = (chessContext.color == Color.WHITE);
    for (let rank = 0; rank <= 7; rank++) {
        isWhite = !isWhite;
        for (let file = 0; file <= 7; file++) {
            // Render the square
            ctx.fillStyle = isWhite ? LIGHT_SQUARE_COLOR : DARK_SQUARE_COLOR;
            const x =  file * TILE_SIZE;
            const y = getFlippedRank(rank) * TILE_SIZE;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            isWhite = !isWhite;
        }
    }
    // Render move highlights
    for (const move of moveHighlights){
        // Highlight Color
        ctx.fillStyle = (Math.sign(move.piece) == Color.WHITE) ? LIGHT_HIGHLIGHT_COLOR : DARK_HIGHLIGHT_COLOR;
        // Previous tile
        ctx.fillRect(
            move.fromFile * TILE_SIZE,
            getFlippedRank(move.fromRank) * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE
        );
        // Moved to tile
        ctx.fillRect(
            move.toFile * TILE_SIZE,
            getFlippedRank(move.toRank) * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE
        );
    }
    // Render move indicators
    if (moveIndicators !== null && moveIndicators.length !== 0){
        ctx.fillStyle = MOVE_INDICATOR_COLOR;
        // Draw a circular move indicator for each legal move available
        for (const move of moveIndicators) {
            const rank = move.toRank, file = move.toFile;
            ctx.fillRect(file * TILE_SIZE, getFlippedRank(rank) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
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
            ctx.drawImage(
                pieceImages.get(piece)!, file * TILE_SIZE, getFlippedRank(rank) * TILE_SIZE, TILE_SIZE, TILE_SIZE
            );
        }
    }
    // Render square coordinates
    const fontSize = Math.trunc(TILE_SIZE/6);
    ctx.fillStyle="black";
    ctx.font = `bold ${fontSize}px Arial`;
    for (let rank = 0; rank <= 7; rank++) {
        for (let file = 0; file <= 7; file++) {
            ctx.fillText(
                getAlgebraicNotation(rank, file),
                file * TILE_SIZE + 5,
                getFlippedRank(rank) * TILE_SIZE + TILE_SIZE - 5 
            );
        }
    }
    // Render the piece held
    if (heldPiece.isHolding) {
        const heldPieceImage: HTMLImageElement = pieceImages.get(board[heldPiece.rank][heldPiece.file])!;
        ctx.drawImage(heldPieceImage, heldPiece.x, heldPiece.y, TILE_SIZE, TILE_SIZE);
    }
}