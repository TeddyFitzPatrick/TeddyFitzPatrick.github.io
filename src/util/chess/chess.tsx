import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { WaitFor, GET, UPDATE, REMOVE } from "./networking.js";
import { pieceImages, pieceMovements, Piece, Color } from "./consts.js";
import { Move } from "./move.js";

type Setter<T> = React.Dispatch<React.SetStateAction<T>>
type PageKey = "SelectGamemode" | "MultiplayerConfiguration" | "Board";
type ChessContext = {
    isMultiplayer: boolean,
    isHosting: boolean
    roomCode: string | undefined,
    color: Color
}
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
let chessContext: ChessContext = {
    isMultiplayer: false,
    isHosting: false,
    roomCode: undefined,
    color: Color.WHITE
}

/* Game state */
export let board: number[][];
let moveIndicators: Move[],
    moveHighlights: Move[],
    premove: Move | null = null;
let promotionSelection: number | null = null,
    turnToMove: number = Color.WHITE;
export let castlingRights = 0b1111;  /* WK, WQ, BK, BQ */
export let enPassant = 0b0000_0000_0000_0000; /* (a5,b5,c5,d5_e5,f5,g5,h5_a4,b4,c4,d4_e4,f4,g4,h4) */

/* Rendering */
let ctx: CanvasRenderingContext2D,
    boardLength: number,
    TILE_SIZE: number;
const LIGHT_SQUARE_COLOR = "rgb(173, 189, 143)";
const DARK_SQUARE_COLOR = "rgb(111, 143, 114)";
// const LIGHT_SQUARE_COLOR = "rgb(227, 193, 111)";
// const DARK_SQUARE_COLOR = "rgb(184, 139, 74)";
const LIGHT_HIGHLIGHT_COLOR = "rgba(173, 216, 230, 0.8)";
const DARK_HIGHLIGHT_COLOR = "rgba(4, 2, 115, 0.5)";
const MOVE_INDICATOR_COLOR = "rgba(57, 220, 57, 0.5)";
const PREMOVE_INDICATOR_COLOR = "rgba(254, 57, 57, 0.5)";
const TIME_BETWEEN_FRAMES = 1_000 / 33;

function applyDefaults(UIContext: UIContext){
    moveHighlights = [];
    moveIndicators = [];
    premove = null;
    promotionSelection = null;
    turnToMove = Color.WHITE;
    castlingRights = 0b1111;
    enPassant = 0b0000_0000_0000_0000;
    UIContext.setGameOverText(`...`);
    UIContext.setMoveHistory([]);
    resetBoard(UIContext);
}

export default function Chess(){
    const [selected, setSelected] = useState<PageKey>("SelectGamemode");
    const [version, setVersion] = useState<number>(0);
    const pages = {
        SelectGamemode: 
            <SelectGamemode setSelected={setSelected}/>,
        MultiplayerConfiguration: 
            <MultiplayerConfiguration setSelected={setSelected}/>,
        Board: 
            <Board key={version} setVersion={setVersion}/>
    }
    return <>
    <div className="flex justify-center items-center w-screen h-screen overflow-y-auto bg-slate-800 m-0 p-0" id="body">
        {pages[selected]}
    </div>
    </>;
};

function SelectGamemode({setSelected}: {setSelected: Setter<PageKey>}){
    const startLocalGame = (): void => {
        setSelected("Board");
        chessContext = {
            isMultiplayer: false,
            isHosting: false,
            roomCode: undefined,
            color: Color.WHITE
        }
    }
    const gotoMultiplayerConfiguration = (): void => {
        setSelected("MultiplayerConfiguration");
    }
    return <>
    <div className="flex justify-evenly flex-col space-y-3 text-center items-center p-12 w-4/5 sm:w-1/2 h-3/4 min-h-fit sm:h-1/2 bg-white rounded-2xl shadow-2xl">
        {/* <!-- Back to Home --> */}
        <Link to="/">
            <button className="text-xl sm:text-4xl bg-blue-400 text-white shadow-2xl p-6 rounded-2xl hover:scale-101 absolute left-6 top-4">
                Back to Home
            </button>
        </Link>
        <h1 className="text-4xl sm:text-5xl font-bold">Teddy Chess</h1>
        <button onClick={startLocalGame} className="p-4 w-full h-1/2 rounded-2xl shadow-2xl text-3xl bg-black font-bold text-white hover:scale-101">
            LOCAL
        </button>
        <button onClick={gotoMultiplayerConfiguration} className="p-4 w-full h-1/2 rounded-2xl shadow-2xl text-3xl bg-black font-bold text-white hover:scale-101">
            ONLINE
        </button>
    </div>
    </>
}

function MultiplayerConfiguration({setSelected}: {setSelected: Setter<PageKey>}){
    const [hostRoomCode, setHostRoomCode] = useState<string>("...");
    const [isHosting, setIsHosting] = useState<boolean>(false);
    const [hostColor, setHostColor] = useState<Color | null>(null);

    const enterRoomCodeRef = useRef<HTMLInputElement | null>(null);

    const selectHostColor = function(colorForHost: Color){
        if (isHosting) return;  // can't change host color after creating the lobby
        setHostColor(colorForHost);
    }

    const hostRoom = async function(){
        if (isHosting) return;
        if (!hostColor) {
            alert("Pick a host color first!");
            return;
        }
        setIsHosting(true);
        // Generate a random 4-letter room code
        const hostRoomCode = generateRoomCode();
        setHostRoomCode(hostRoomCode);
        // copy the room code to clipboard
        navigator.clipboard.writeText(hostRoomCode);
        console.log("Publishing new room to database");
        // Put the room on firebase
        await UPDATE(hostRoomCode, {"joined": 0, "hostColor": hostColor})
        console.log("Published room, waiting for other player")
        // Wait for the opponent to update the joined status to start the game
        await WaitFor(`${hostRoomCode}/joined`, 1);
        // Player has joined, start the game
        setSelected("Board");
        chessContext = {
            isMultiplayer: true,
            isHosting: true,
            roomCode: hostRoomCode,
            color: hostColor
        }
        console.log("Other player joined, starting game");
    }
    const joinRoom = async function(){
        if (!enterRoomCodeRef || !enterRoomCodeRef.current) throw new Error(`Could not access the enter room code input ref`);
        // Read the room code
        const joinRoomCode = enterRoomCodeRef.current.value.toUpperCase();
        // Block joining a room while hosting
        if (isHosting) {
            alert("Can not join a game while hosting!")
            return;
        }
        if (joinRoomCode.length != 4){
            alert("Invalid room code length (must be four letters)")
            return;
        }
        // Check the room exists
        const exists = await GET(`${joinRoomCode}/hostColor`);
        if (exists === null){
            alert(`Room ${joinRoomCode} does not exist`);
            return;
        }
        // Update the joined field to signal to the host the game has started
        await UPDATE(joinRoomCode, {"joined": 1});
        // Host chooses their color first
        const hostColor: Color = await GET(`${joinRoomCode}/hostColor`)
        // Start the game
        setSelected("Board");
        chessContext = {
            isMultiplayer: true,
            isHosting: false,
            roomCode: joinRoomCode,
            color: (hostColor === Color.BLACK) ? Color.WHITE : Color.BLACK
        }
    }
    return <>
    <div className="text-black flex flex-col lg:flex-row space-y-6 lg:space-y-0 bg-white w-[90%] sm:w-3/4 xl:w-3/5 h-fit lg:h-3/5 text-2xl font-bold border-black p-4 sm:p-8 rounded-2xl shadow-2xl">
        {/* <!-- HOST --> */}
        <div className="flex items-center mr-0 lg:mr-6 space-y-4 flex-col w-full lg:w-1/2 h-full border-4 border-black rounded-xl p-4">
            <h1 className="font-bold text-4xl italic underline">Host Room</h1>
            <div className="w-fit h-fit text-center space-y-4">
                <h1 className="italic">Pick a color before hosting</h1>
                <div className="flex flex-row w-full h-full justify-around">
                    <button 
                        onClick={() => selectHostColor(Color.WHITE)}
                        className={(hostColor === Color.WHITE) ?
                            `w-36 h-36 bg-white rounded-xl border-cyan-500 border-6 scale-103` :
                            `w-36 h-36 bg-white rounded-xl border-4 border-aqua hover:scale-101`}>
                    </button>
                    <button 
                        onClick={() => selectHostColor(Color.BLACK)} 
                        className={(hostColor === Color.BLACK) ?
                            `w-36 h-36 bg-black rounded-xl border-cyan-500 border-6 scale-103` :
                            `w-36 h-36 bg-black rounded-xl border-4 hover:scale-101`}>
                    </button>
                </div>
            </div>
            <button 
                disabled={isHosting}
                onClick={hostRoom} 
                className="disabled:hover:scale-100 disabled:bg-red-500 rounded-xl bg-blue-500 text-white hover:scale-102 shadow-lg p-4 sm:p-6">
                {isHosting ? "Currently Hosting" : "Host"}
            </button>
            <div className="flex flex-col bg-gray-300 rounded-xl w-full p-6">
                <b>Your room code: </b> <p className="text-3xl font-extrabold"> {hostRoomCode} </p>
            </div>
        </div>
        {/* <!-- JOIN --> */}
        <div className="flex items-center space-y-4 flex-col w-full lg:w-1/2 h-full border-4 border-black rounded-xl p-4 lg:p-4 ">
            <h1 className="font-bold italic text-4xl underline">Join Room</h1>
            <div className="flex flex-col space-y-2 w-full">
                <input type="text" 
                    disabled={isHosting}
                    ref={enterRoomCodeRef}
                    placeholder="Enter Room Code..." 
                    className="bg-white text-lg border-4 p-2 w-full max-w-full h-16 rounded-xl border-black"/>
                <input type="submit" 
                    disabled={isHosting}
                    onClick={joinRoom} 
                    value="Enter"
                    className="disabled:bg-red-500 disabled:hover-scale-100 w-28 h-12 bg-blue-500 shadow-xl text-white rext-2xl p-2 rounded-xl hover:scale-102"/>
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

type UIContext = {
    showPromotion: boolean,
    showRestart: boolean,
    gameOverText: string,
    moveHistory: Move[],

    setShowPromotion: Setter<boolean>,
    setShowRestart: Setter<boolean>,
    setGameOverText: Setter<string>,
    setMoveHistory: Setter<Move[]>,
}
function Board({setVersion}: {setVersion: Setter<number>}){
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [showPromotion, setShowPromotion] = useState<boolean>(false);
    const [showRestart, setShowRestart] = useState<boolean>(false);
    const [gameOverText, setGameOverText] = useState<string>("...");
    const [moveHistory, setMoveHistory] = useState<Move[]>([]);
    const UIContext: UIContext = {
        showPromotion,
        showRestart,
        gameOverText,
        moveHistory,

        setShowPromotion,
        setShowRestart,
        setGameOverText,
        setMoveHistory
    }
    // testing move history navigation
    /*
    useEffect(() => {
        const navigateMoveHistory = (event: KeyboardEvent): void => {
            if (moveHistory.length <= 1) return;
            const lastPlayedMove: Move = moveHistory.at(-1)!;
            if (event.key === "ArrowLeft"){
                if (moveHistoryIndex >= 0) moveHistoryIndex--;
                lastPlayedMove.undo(setCastlingRights);
                turnToMove *= -1;
            } else if (event.key === "ArrowRight"){
                if (moveHistoryIndex < moveHistory.length - 1) moveHistoryIndex++;
                lastPlayedMove.play(setCastlingRights);
                turnToMove *= -1;
            }
            render();
        };
        window.addEventListener("keydown", navigateMoveHistory);
        return () => {
            window.removeEventListener("keydown", navigateMoveHistory);
        }
    }, [moveHistory]);
    */
    // initialization
    useEffect(() => {
        let renderInterval: NodeJS.Timeout, timestampInterval: NodeJS.Timeout;
        const resizeCanvas = async () => {
            const canvas = canvasRef.current;
            if (!canvas) throw new Error("chess canvas not found");
            // Set the 2d context
            const ctxOrNull = canvas.getContext("2d");
            if (!ctxOrNull) throw new Error(`Could not get 2D rendering context from canvas`);
            ctx = ctxOrNull
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
        const init = async () => {
            applyDefaults(UIContext);
            renderInterval = setInterval(() => {
                if (showRestart){
                    clearInterval(renderInterval);
                    return;
                } else{
                    render();
                }
            }, TIME_BETWEEN_FRAMES);
            // set an interval in multiplayer games to update the latest timestamp connected to the db
            if (chessContext.isMultiplayer){
                timestampInterval = setInterval(async () => {
                    const myColorLabel: string = `${(chessContext.color === Color.WHITE) ? "white" : "black"}Timestamp`;
                    if (!chessContext.roomCode) throw new Error(`Error sending move in multiplayer game because room code is undefined`);
                    UPDATE(chessContext.roomCode, {
                        [myColorLabel]: Date.now()
                    })
                }, 1_000);
            };
            // debug
            // timestampInterval = setInterval(() => {
            //     console.log(`ttm: ${turnToMove}`);
            // }, 500);
            if (chessContext.isMultiplayer && chessContext.color === Color.BLACK){
                await receiveMove(UIContext);
            }
        }
        init();

        // perft testing
        // if (!chessContext.isMultiplayer){
        //     const t0 = performance.now();
        //     const depth = 2;
        //     const p = perft(depth, turnToMove as Color);
        //     console.log(p);
        //     console.log(`Perft ${p} at depth ${depth}`);
        //     const t1 = performance.now();
        //     const elapsed = t1 - t0;
        //     console.log(`Executed in ${Math.floor(elapsed)} ms`);
        // }

        // clean up on chess board unmount
        return () => {
            window.removeEventListener("resize", resizeCanvas);
            clearInterval(renderInterval);
            clearInterval(timestampInterval);
        };
    }, []);

    const clearVisuals = () => {
        heldPiece.isHolding = false;
        moveHighlights = [];
        moveIndicators = [];
    }
    // Event listeners for desktop and mobile clicking/dragging
    const getMousePos = (event: React.MouseEvent): {mouseX: number, mouseY: number} => {
        const canvas = canvasRef.current;
        if (!canvas) throw new Error(`Could not get canvas after getMousePos() invokation`);
        const rect = canvas.getBoundingClientRect();
        return {
            mouseX: event.clientX - rect.left,
            mouseY: event.clientY - rect.top,
        }
    }
    const getTouchPos = (event: React.TouchEvent): {touchX: number, touchY: number} => {
        const canvas = canvasRef.current;
        if (!canvas) throw new Error(`Could not get canvas after getTouchPos() invokation`);
        const rect = canvas.getBoundingClientRect();
        const touch = event.touches[0] || event.changedTouches[0];
        return {
            touchX: touch.clientX - rect.left,
            touchY: touch.clientY - rect.top
        }
    }
    /* Desktop/Mouse */
    const handleMouseDown = (event: React.MouseEvent) => {
        const { mouseX, mouseY } = getMousePos(event);
        const file = Math.floor(mouseX / TILE_SIZE);
        const rank = Math.floor(mouseY / TILE_SIZE);
        pickupPiece(getFlippedRank(rank), file, showPromotion, showRestart);
        // Update piece held
        heldPiece.x = mouseX - 0.5 * TILE_SIZE;
        heldPiece.y = mouseY - 0.5 * TILE_SIZE;
    }
    const handleMouseMove = (event: React.MouseEvent) => {
        if (!heldPiece.isHolding) return;
        const { mouseX, mouseY } = getMousePos(event);
        heldPiece.x = mouseX - 0.5 * TILE_SIZE;
        heldPiece.y = mouseY - 0.5 * TILE_SIZE;
    }
    const handleMouseUp = (event: React.MouseEvent) => {
        if (!heldPiece.isHolding) return;
        const { mouseX, mouseY } = getMousePos(event);
        const file = Math.floor(mouseX / TILE_SIZE);
        const rank = Math.floor(mouseY / TILE_SIZE);
        if (!isInBounds(rank, file)) return;
        clearVisuals();
        releasePiece(getFlippedRank(rank), file, UIContext);
    }
    /* Mobile/Touch */
    const handleTouchStart = (event: React.TouchEvent) => {
        const { touchX, touchY } = getTouchPos(event)
        const file = Math.floor(touchX / TILE_SIZE);
        const rank = Math.floor(touchY / TILE_SIZE);
        pickupPiece(getFlippedRank(rank), file, showPromotion, showRestart);
        heldPiece.x = touchX - 0.5 * TILE_SIZE;
        heldPiece.y = touchY - 0.5 * TILE_SIZE;
    }
    const handleTouchMove = (event: React.TouchEvent) => {
        if (!heldPiece.isHolding) return;
        const { touchX, touchY } = getTouchPos(event)
        heldPiece.x = touchX - 0.5 * TILE_SIZE;
        heldPiece.y = touchY - 0.5 * TILE_SIZE;
    }
    const handleTouchEnd = (event: React.TouchEvent) => {
        if (!heldPiece.isHolding) return;
        const { touchX, touchY } = getTouchPos(event)
        const file = Math.floor(touchX / TILE_SIZE);
        const rank = Math.floor(touchY / TILE_SIZE);
        if (!isInBounds(rank, file)) return;
        clearVisuals();
        releasePiece(getFlippedRank(rank), file, UIContext);
    }

    return <>
    <div className="flex w-full h-full justify-center items-center">
        {/* Board and move list */}
        <div className="flex space-y-4 sm:space-y-0 space-x-0 sm:space-x-8 flex-col md:flex-row max-w-screen max-h-screen">
            <canvas ref={canvasRef} 
                width="42" 
                height="42"
                className="border-6 sm:border-8 border-amber-950 rounded-xl shadow-2xl"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                />
            <MoveList UIContext={UIContext}/>
        </div>
        {/* <!-- Restart Window --> */}
        {showRestart && <RestartWindow setVersion={setVersion} UIContext={UIContext}/>}
        {/* <!-- Pawn Promotion Selection --> */}
        {showPromotion && <PromotionWindow UIContext={UIContext}/>}
    </div>
    </>
}

function MoveList({UIContext}: {UIContext: UIContext}){
    return <>
    <div className="bg-slate-600 w-60 h-full rounded-lg p-4 hidden md:flex flex-col">
        <h1 className="font-extrabold text-2xl pb-4">Move History</h1>
        <ul className="space-y-2 font-bold text-xl overflow-y-auto scroll-smooth h-fit max-h-[90vh]">
            {UIContext.moveHistory.map((move, index) => (
                <MoveRecord key={index} index={index} move={move}/>
            ))}
        </ul>
        <div className="w-full flex flex-row space-x-2 items-center bg-slate-800 rounded-xl py-2 shadow-xl justify-center">
            <p className="text-lg">Turn to move: </p>
            <div className={`w-8 h-8 shrink-0 ${(UIContext.moveHistory.length % 2 === 0) ? "bg-white" : "bg-black"}`}>
            </div>
        </div>
    </div>
    </>
}

function MoveRecord({index, move}: {index: number, move: Move}){
    const imageContainerRef = useRef<HTMLDivElement | null>(null);
    // label the move
    let moveLabel = "placeholder";
    if (Math.abs(move.piece) === Piece.WHITE_KING && move.toFile === move.fromFile + 2){
        moveLabel = "O-O";
    } else if (Math.abs(move.piece) === Piece.WHITE_KING && move.toFile === move.fromFile - 2){
        moveLabel = "O-O-O";
    } else{
        const fromLabel = getAlgebraicNotation(move.fromRank, move.fromFile);
        const toLabel = getAlgebraicNotation(move.toRank, move.toFile);
        moveLabel = `${fromLabel} ↣ ${toLabel}`;
    }

    useEffect(()=>{
        if (!imageContainerRef) return;
        const imageContainer = imageContainerRef.current;
        if (!imageContainer) return;
        const pieceImage = pieceImages.get(move.piece)
        if (!pieceImage) throw new Error(`Could not get chess piece image for piece=${move.piece}`);
        imageContainer.appendChild(pieceImage.cloneNode());
    },[]);

    return <li className={`w-full flex flex-row text-md tracking-tighter space-x-1 ${(Math.sign(move.piece) === Color.WHITE) ? "text-white" : "text-black"}`}>
        {/* <div className={`w-7 h-7 shrink-0 shadow-2xl text-red-500 ${Math.sign(move.piece) === 1 ? "bg-white" : "bg-black"}`}/> */}
        <div className="w-10 h-10 shrink-0" ref={imageContainerRef}/>
        <div className="w-full flex justify-start flex-row items-center"> 
            <h1 className="w-9">{index+1}: </h1>
            <p>{moveLabel}</p>
        </div>
    </li>
}

function RestartWindow({setVersion, UIContext}: {setVersion: Setter<number>, UIContext: UIContext}){
    const [rematch, setRematch] = useState<boolean>(false);
    const [opponentRematch, setOpponentRematch] = useState<boolean>(false);

    const offerRematch = async () => {
        if (!chessContext.roomCode) throw new Error(`Could not offer rematch, because room code is undefined`);
        // publish rematch offer 
        const rematchKey = `${chessContext.isHosting ? "host" : "client"}Rematch?`;
        await UPDATE(chessContext.roomCode, {[rematchKey]: 1})
        setRematch(true);
        // read opponent rematch acceptance
        const opponentRematchKey = `${chessContext.roomCode}/${chessContext.isHosting ? "client" : "host"}Rematch?`;
        const opp = await WaitFor(opponentRematchKey) as string;
        // start the rematch
        if (+opp === 1){
            setOpponentRematch(true);
            playAgain();
        }
        // delete rematch offer (for future rematches)
        await REMOVE(opponentRematchKey);
    }
    const playAgain = (): void => {
        setVersion(v => v + 1);
        if (!chessContext.isMultiplayer){
            chessContext = {
                isMultiplayer: false,
                isHosting: false,
                roomCode: undefined,
                color: Color.WHITE
            }
        } else {
            chessContext = {
                ...chessContext,
                // switch colors
                color: (chessContext.color === Color.WHITE ? Color.BLACK : Color.WHITE)
            }
        }
        UIContext.setShowRestart(false);
    }
    const hostColor = (chessContext.isHosting) ? (chessContext.color === 1 ? "white" : "black") : (chessContext.color === 1 ? "black" : "white");
    const joinColor = hostColor === "white" ? "black" : "white";
    return <>
    <div className="flex absolute flex-col justify-center items-center space-y-10 opacity-95
        bg-slate-500 w-full h-full rounded-2xl">
        {/* <!-- Game over text --> */}
        <h1 className="text-center text-bold italic text-white text-3xl">
            {UIContext.gameOverText}
        </h1>
        { (true) 
        ? <div className="flex flex-col space-y-2">
            <div className="w-full flex flex-row items-center">
                <h1 className="w-42">Host {(chessContext.isHosting ? "(you)" : "")} ({hostColor})</h1>
                <div className={`w-10 h-10
                    ${((chessContext.isHosting && rematch) || (!chessContext.isHosting && opponentRematch)) ? "bg-green-500" : "bg-red-500"}`}></div>
            </div>
            <div className="w-full flex flex-row items-center">
                <h1 className="w-42">Client {(!chessContext.isHosting ? "(you)" : "")} ({joinColor})</h1>
                <div className={`w-10 h-10 
                    ${((!chessContext.isHosting && rematch) || (chessContext.isHosting && opponentRematch)) ? "bg-green-500" : "bg-red-500"}`}
                    ></div>
            </div>
        </div>
        : <></>
        }

        {/* <!-- Restart --> */}
        { (rematch || !chessContext.isMultiplayer)
        ? <button 
            onClick={playAgain} 
            disabled={chessContext.isMultiplayer && (!opponentRematch || !chessContext.isHosting)} 
            className="text-bold text-3xl p-4 hover:scale-101 rounded-2xl shadow-2xl border-black bg-blue-500 text-white disabled:bg-red-500 disabled:hover:scale-100">
            {chessContext.isMultiplayer ? (!chessContext.isHosting ? "Waiting for host..." : (opponentRematch ? "Start Rematch" : "Waiting for opponent...")): "Restart Local"}
        </button>
        : <button 
            onClick={offerRematch} 
            className="text-bold text-3xl p-4 hover:scale-102 rounded-2xl shadow-2xl border-black bg-blue-500 text-white">
            Offer Rematch?
        </button>
        }
    </div>
    </>
}

function PromotionWindow({UIContext}: {UIContext: UIContext}){
    return <>
    <div className="flex absolute flex-row justify-around items-center z-20
        bg-opacity-70 bg-slate-600 w-full sm:w-1/2 h-[20%] top-[40%] left-0 sm:left-1/4 rounded-3xl border-black border-8">
        <PromotionOption filename="whiteQueen" promotionPiece={Piece.WHITE_QUEEN} UIContext={UIContext}/>
        <PromotionOption filename="whiteRook" promotionPiece={Piece.WHITE_ROOK} UIContext={UIContext}/>
        <PromotionOption filename="whiteBishop" promotionPiece={Piece.WHITE_BISHOP} UIContext={UIContext}/>
        <PromotionOption filename="blackKnight" promotionPiece={Piece.WHITE_KNIGHT} UIContext={UIContext}/>
    </div>
    </>
}

function PromotionOption({filename, promotionPiece, UIContext}: {filename: string, promotionPiece: number, UIContext: UIContext}){
    const promote = (): void => {
        promotionSelection = promotionPiece;
        UIContext.setShowPromotion(false);
    }
    return <>
        <img onClick={promote} 
        src={`/chess/${filename}.png`}
        alt={filename}
        draggable={false}
        className="bg-slate-200 rounded-2xl w-1/5 aspect-square hover:scale-102 shadow-2xl invert"/>
    </>
}

function pickupPiece(rank: number, file: number, showPromotion: boolean, showRestart: boolean) {
    if (showPromotion || showRestart) return;
    // clear a premove if you click either its starting or ending square
    if (premove && (
        (premove.fromRank === rank && premove.fromFile === file) ||
        (premove.toRank === rank && premove.toFile === file))){
        premove = null;
        return;
    }
    // Get the piece clicked
    const pieceClicked = board[rank][file];
    if (pieceClicked === Piece.EMPTY) return;
    if ((!chessContext.isMultiplayer && Math.sign(pieceClicked) !== Math.sign(turnToMove))||
        (chessContext.isMultiplayer && Math.sign(pieceClicked) !== Math.sign(chessContext.color))) return;
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

async function releasePiece(rank: number, file: number, UIContext: UIContext){
    const move = new Move(heldPiece.rank, heldPiece.file, rank, file);
    if (!isLegalMove(move)) return;
    // store a premove
    if (turnToMove !== chessContext.color){
        premove = move;
        heldPiece.isHolding = false;
        return;
    }
    await playMove(move, UIContext);
    // receive and play the opponent's move (multiplayer)
    if (chessContext.isMultiplayer){
        await sendMove(move);
        await receiveMove(UIContext);
    } 
    // Local
    else {
        chessContext.color *= -1;
    }
}

async function playMove(move: Move, UIContext: UIContext) {
    move.play(setCastlingRights, setEnPassant);
    turnToMove *= -1;
    // Store the move highlight
    moveHighlights.push(move);
    /* Promote pawns to another piece of the user's choosing */
    if (Math.abs(move.piece) === Piece.WHITE_PAWN && (move.toRank == 0 || move.toRank == 7)) {
        // Turn on the promotion window and wait for a selection
        if (Math.sign(move.piece) === chessContext.color) {
            UIContext.setShowPromotion(true);
            await new Promise<void>((resolve) => {
                const check = setInterval(() => {
                    // Wait for a promotion piece to be selected, closing the promotion window
                    if (!UIContext.showPromotion && promotionSelection !== null && promotionSelection !== undefined) {
                        clearInterval(check);
                        resolve();
                    }
                }, 50);
            });
        };
        if (!promotionSelection) throw new Error(`Pawn reached promotion square without a promotionSelection`);
        // Apply the promotion by changing the pawn's piece type
        const promoPiece = Math.sign(move.piece) * promotionSelection;
        board[move.toRank][move.toFile] = promoPiece;
        move.piece = promoPiece;
    }
    heldPiece.isHolding = false;
    // Record the move
    UIContext.setMoveHistory(hist => [...hist, move]);
    // moveHistoryIndex++;
    /* The move played ended the game */
    if (isGameOver(UIContext)){
        UIContext.setShowRestart(true);
    }
}

/* Chess Implementation Functions */
function isGameOver(UIContext: UIContext) {
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
                UIContext.setGameOverText(`${color == Color.WHITE ? "Black" : "White"} wins by checkmate`);
            // Stalemate
            } else{
                UIContext.setGameOverText(`Draw by stalemate`);
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

/* PERFT TESTING */
// function perft(depth: number, colorToMove: Color) {
//     const moveList = getAllLegalMoves(colorToMove);
//     if (depth === 1) return {
//         nodes: moveList.length,
//         captures: moveList.filter(move => move.isCapture).length,
//         enpassants: moveList.filter(move => move.isEnPassant).length,
//         castles: moveList.filter(move => move.isCastle).length
//     }
//     let nodes = 0;
//     let captures = 0;
//     let enpassants = 0;
//     let castles = 0;
//     for (const move of moveList){
//         move.play(setCastlingRights, setEnPassant);
//         const recurse = perft(depth-1, (colorToMove === Color.WHITE) ? Color.BLACK : Color.WHITE);
//         if (move.isCapture) captures += 1;
//         if (move.isEnPassant) enpassants += 1;
//         if (move.isCastle) castles += 1;
//         nodes += recurse.nodes;
//         captures += recurse.captures;
//         enpassants += recurse.enpassants;
//         castles += recurse.castles;
//         move.undo(setCastlingRights, setEnPassant);
//     }
//     return {
//         nodes,captures,enpassants,castles
//     }
// }
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
    const legalMoves = [];
    /* Remove moves that put the king in check */
    const piece = board[fromRank][fromFile];
    for (const move of getPseudoLegalMoves(fromRank, fromFile)) {
        // Temporary play the move
        move.play(setCastlingRights, setEnPassant);
        /* Check all legal moves available to the opponent to see if any capture the king */
        if (!isChecked(Math.sign(piece))) legalMoves.push(move);
        // Undo the move
        move.undo(setCastlingRights, setEnPassant);
    }
    return legalMoves;
}

function getPseudoLegalMoves(fromRank: number, fromFile: number) {
    // Get the set of all moves of a piece at a given rank and file
    const piece = board[fromRank][fromFile];
    const color = Math.sign(piece);
    let allMoves: Move[] = [];
    if (piece === Piece.EMPTY) return allMoves;
    /* Bishops, Rooks, and Queens have the same sliding-move behavior */
    if (Math.abs(piece) === Piece.WHITE_BISHOP ||
        Math.abs(piece) === Piece.WHITE_ROOK ||
        Math.abs(piece) === Piece.WHITE_QUEEN) {
        allMoves.push(...getSlidingMoves(fromRank, fromFile));
    }
    /* Knights and kings don't slide, but move adjacently */
    if (Math.abs(piece) === Piece.WHITE_KNIGHT ||
        Math.abs(piece) === Piece.WHITE_KING) {
        allMoves.push(...getAdjacentMoves(fromRank, fromFile));
    }
    /* Pawns have more complicated moves */
    if (Math.abs(piece) === Piece.WHITE_PAWN) {
        const forward = (color === Color.WHITE) ? -1 : 1;
        const startRank = (color === Color.WHITE) ? 6 : 1;
        // Move forward 1
        if (isInBounds(fromRank+forward, fromFile) && board[fromRank + forward][fromFile] == Piece.EMPTY) {
            allMoves.push(new Move(fromRank, fromFile, fromRank + forward, fromFile));
        }
        // Move forward 2
        if (fromRank === startRank &&
            board[fromRank + forward][fromFile] === Piece.EMPTY &&
            board[fromRank + 2 * forward][fromFile] === Piece.EMPTY) {
            allMoves.push(new Move(fromRank, fromFile, fromRank + 2 * forward, fromFile));
        }
        // Captures
        for (const df of [-1, 1]) {
            if (!isInBounds(fromRank + forward, fromFile + df)) continue;
            // opponent piece diagonal = capture move
            if (Math.sign(board[fromRank + forward][fromFile + df]) === -color) {
                allMoves.push(new Move(fromRank, fromFile, fromRank + forward, fromFile + df));
            }
            // en passant
            if (color === Color.WHITE &&
                fromRank === 3 &&
                board[fromRank][fromFile+df] === Piece.BLACK_PAWN &&
                (enPassant & 1 << 15-(fromFile+df))){
                allMoves.push(new Move(fromRank, fromFile, fromRank + forward, fromFile + df))
            } else if (color === Color.BLACK &&
                fromRank === 4 &&
                board[fromRank][fromFile+df] === Piece.WHITE_PAWN &&
                (enPassant & 1 << 7-(fromFile+df))){
                allMoves.push(new Move(fromRank, fromFile, fromRank + forward, fromFile + df))
            }
        }
    }
    /* Castling Moves */
    if (piece === Piece.WHITE_KING) {
        // White Kingside Castling (O-O)
        if ((castlingRights & 0b1000) && board[7][7] === Piece.WHITE_ROOK && canCastle(Color.WHITE, [[7, 4], [7, 5], [7, 6]], [[7, 5], [7, 6]])){
            allMoves.push(new Move(fromRank, fromFile, 7, 6));
        }
        // White Queenside Castling (O-O-O)
        if ((castlingRights & 0b0100) && board[7][0] === Piece.WHITE_ROOK && canCastle(Color.WHITE, [[7, 2], [7, 3], [7, 4]], [[7, 1], [7, 2], [7, 3]])){
            allMoves.push(new Move(fromRank, fromFile, 7, 2));
        }
    }
    if (piece === Piece.BLACK_KING){
        // Black Kingside Castling (O-O)
        if ((castlingRights & 0b0010) && board[0][7] === Piece.BLACK_ROOK && canCastle(Color.BLACK, [[0, 4], [0, 5], [0, 6]], [[0, 5], [0, 6]])){
            allMoves.push(new Move(fromRank, fromFile, 0, 6));
        }
        // Black Queenside Castling (O-O-O)
        if ((castlingRights & 0b0001) && board[0][0] === Piece.BLACK_ROOK && canCastle(Color.BLACK, [[0, 2], [0, 3], [0, 4]], [[0, 1], [0, 2], [0, 3]])){
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

function setCastlingRights(newCastlingRights: number){
    castlingRights = newCastlingRights;
}

function setEnPassant(newEnPassant: number){
    enPassant = newEnPassant;
}

type MoveData = {
    [color: string]: {
        from: [number, number];
        to: [number, number];
        promote: number | null;
    };
};
/* Database Communication */
async function sendMove(move: Move){
    if (!chessContext.roomCode) throw new Error('Error sending move, room code is null');
    // Send the move to the opponent
    const playerColorStr = (chessContext.color === Color.WHITE) ? "whiteMove" : "blackMove";
    const moveData: MoveData = {
        [playerColorStr]: {
            from: [move.fromRank, move.fromFile],
            to: [move.toRank, move.toFile],
            promote: promotionSelection
        }
    }
    // Update the move to the DB
    await UPDATE(chessContext.roomCode, moveData);
    // clear promotion cache after sending
    promotionSelection = null;
}

async function receiveMove(UIContext: UIContext,) {
    promotionSelection = null;
    // Wait to receive the opponent's response
    const opponentMovePath = `${chessContext.roomCode}/${
        chessContext.color === Color.WHITE ? "black" : "white"
    }Move`;
    const moveData = await WaitFor(opponentMovePath) as {
        from: [number, number];
        promote: number | null;
        to: [number, number];
    };
    const from: [number, number] = moveData.from;
    const to: [number, number]  = moveData.to;
    promotionSelection = moveData.promote;
    const receivedMove = new Move(from[0], from[1], to[0], to[1]);
    // Clear the opponent's move from the database after reading it
    REMOVE(opponentMovePath);
    // Play the move on the board
    await playMove(receivedMove, UIContext);
    // Automatically respond with the premove, if one exists
    if (premove){
        // make sure the premove is still legal
        if (isLegalMove(premove)){
            await playMove(premove, UIContext);
            await sendMove(premove);
            premove = null;
            await receiveMove(UIContext);
        } else{
            premove = null;
        }
    }
}

/* Board Utilities */
function loadFEN(fen: string, UIContext: UIContext){
    const fields = fen.trim().split(" ");
    if (fields.length !== 4 && fields.length !== 6) throw new Error(`Illegal argument content in FEN string. Must have 4 or 6 fields.`);
    // 1. placement
    const placements = fields[0];
    const ranks = placements.trim().split("/");
    if (ranks.length !== 8) throw new Error(`FEN notation expects 8 ranks, given ${ranks.length}`);
    for (let rank = 0; rank < 8; rank++){
        let file = 0;
        for (const pieceChar of ranks[rank]){
            if (/^\d$/.test(pieceChar)){
                file += +pieceChar;
                continue;
            }
            let piece = 42;
            switch (pieceChar) {
                case "P":
                    piece = Piece.WHITE_PAWN;
                    break;
                case "p":
                    piece = Piece.BLACK_PAWN;
                    break;
                case "N":
                    piece = Piece.WHITE_KNIGHT;
                    break;
                case "n":
                    piece = Piece.BLACK_KNIGHT;
                    break;
                case "B":
                    piece = Piece.WHITE_BISHOP;
                    break;
                case "b":
                    piece = Piece.BLACK_BISHOP;
                    break;
                case "R":
                    piece = Piece.WHITE_ROOK;
                    break;
                case "r":
                    piece = Piece.BLACK_ROOK;
                    break;
                case "Q":
                    piece = Piece.WHITE_QUEEN;
                    break;
                case "q":
                    piece = Piece.BLACK_QUEEN;
                    break;
                case "K":
                    piece = Piece.WHITE_KING;
                    break;
                case "k":
                    piece = Piece.BLACK_KING;
                    break;
                default:
                    throw new Error(`Invalid piece notation: ${pieceChar} in FEN string`);
            }
            board[rank][file] = piece;
            file += 1;
        }
    }
    // 2. active
    turnToMove = (fields[1].toLowerCase() === "w") ? Color.WHITE : Color.BLACK;
    if (!chessContext.isMultiplayer) chessContext.color = turnToMove as Color;
    // 3. castling availability
    castlingRights = 0b0000;
    for (const castlingRight of fields[2]){
        switch (castlingRight){
            case "K":  // white kingside
                castlingRights |= 0b1000;
                break;
            case "Q":  // white queenside
                castlingRights |= 0b0100;
                break;
            case "k":  // black kingside
                castlingRights |= 0b0010;
                break; 
            case "q":  // black queenside
                castlingRights |= 0b0001;
                break;
            case "-":  // no castling rights
                break; 
        }
    }
    // 4. en passant target square
    const targetSquare = fields[3];
    enPassant = 0b0000_0000_0000_0000;
    if (targetSquare !== "-"){
        const rank = +fields[3].charAt(1);
        const file = 7 - (fields[3].charCodeAt(0) - 'a'.charCodeAt(0));
        if (rank === 3){
            enPassant = 1 << file;
        } else if (rank === 6){
            enPassant = 1 << (8 + file);
        } else{
            throw new Error(`Invalid FEN string: invalid en passant target square rank: ${rank}`);
        }
    }
    if (fields.length === 4) return;
    // 5. half-move clock (counter since a pawn advance or piece captured)
    // const _halfMoveClock = +fields[4];
    // 6. fullmove number 
    const fullmoves = +fields[5];
    if (Number.isNaN(fullmoves) || fullmoves < 1) throw new Error(`Invalid full-move number, ${fullmoves}, must be at least 1.`);
    // pad some nondescript moves to the move history according to the fullmove field
    const nondescriptMoves = [];
    for (let index=0; index<fullmoves-1; index++){
        nondescriptMoves.push(new Move(7, 4, 7, 4));
    }
    UIContext.setMoveHistory(nondescriptMoves);
}

/**
 * Loads a FEN string of the default board state.
 * Requires setMoveHistory to account for the full-move number field of FEN strings.
 * @param setMoveHistory setter for the reactive move history
 */
function resetBoard(UIContext: UIContext) {
    board = Array.from({ length: 8 }, () => Array(8).fill(0));
    // default initial
    const fen = `rnbqkbnr/pPpppppp/8/8/8/8/PPPPPPpP/RNBQKBNR w KQkq - 0 1`;
    // kiwipete
    // const fen = `r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -`
    // one-move checkmate
    // const fen = `rnrrkbnr/pPpp1ppp/8/4p2Q/2B1P3/8/PPPP1PPP/RRRRKBNR w KQkq - 3 3`;
    loadFEN(fen, UIContext);
}

export function isInBounds(rank: number, file: number) {
    return rank >= 0 && rank <= 7 && file >= 0 && file <= 7;
}

function getFlippedRank(rank: number) {
    return chessContext.color === Color.WHITE ? rank : 7 - rank;
}

function getAlgebraicNotation(rank: number, file: number): string{
    return `${String.fromCharCode('a'.charCodeAt(0) + file)}${8 - rank}`;
}

/* Rendering */
function render() {
    if (!ctx) throw new Error(`Couldn't find the canvas ctx on render() invokation`);
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
    // Render static pieces
    for (let rank = 0; rank <= 7; rank++) {
        for (let file = 0; file <= 7; file++) {
            const piece = board[rank][file];
            // Ignore empty squares
            if (piece === Piece.EMPTY) continue;
            // Ignore the held piece
            if (heldPiece.isHolding && heldPiece.rank == rank && heldPiece.file == file) continue;
            const pieceImage = pieceImages.get(piece)
            if (!pieceImage) throw new Error(`Could not get chess piece image for piece=${piece}`);
            // Render the piece (after playing a premove, if one exists)
            if (!premove || premove.fromFile !== file || premove.fromRank !== rank){
                ctx.drawImage(
                    pieceImage, file * TILE_SIZE, getFlippedRank(rank) * TILE_SIZE, TILE_SIZE, TILE_SIZE
                );
            }
        }
    }
    // Render premove
    if (premove){
        ctx.fillStyle = PREMOVE_INDICATOR_COLOR;
        // previous square
        ctx.fillRect(
            premove.fromFile * TILE_SIZE,
            getFlippedRank(premove.fromRank) * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE
        );
        // to square
        ctx.fillRect(
            premove.toFile * TILE_SIZE,
            getFlippedRank(premove.toRank) * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE
        );
        // piece image
        const piece = board[premove.fromRank][premove.fromFile];
        if (piece === Piece.EMPTY){
            console.log(`Premove piece is Piece.EMPTY`);
            return;
        }
        const pieceImage = pieceImages.get(piece);
        if (!pieceImage) throw new Error(`Could not get chess piece image for premove of piece=${piece}`);
        ctx.drawImage(
            pieceImage, premove.toFile * TILE_SIZE, getFlippedRank(premove.toRank) * TILE_SIZE, TILE_SIZE, TILE_SIZE
        );
    }
    // Render move indicators
    if (moveIndicators !== null && moveIndicators.length !== 0){
        ctx.fillStyle = MOVE_INDICATOR_COLOR;
        // Draw a circular move indicator for each legal move available
        for (const move of moveIndicators) {
            const rank = move.toRank, file = move.toFile;
            // ctx.beginPath();
            // ctx.arc(
            //     file*TILE_SIZE + TILE_SIZE/2,
            //     getFlippedRank(rank)*TILE_SIZE + TILE_SIZE/2,
            //     TILE_SIZE/12,
            //     0,
            //     2 * Math.PI
            // );
            // ctx.strokeStyle = MOVE_INDICATOR_COLOR;
            // ctx.lineWidth = TILE_SIZE/6;
            // ctx.stroke(); 
            ctx.fillRect(file * TILE_SIZE, getFlippedRank(rank) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            ctx.fill();
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