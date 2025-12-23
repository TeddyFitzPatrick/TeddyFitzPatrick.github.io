import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { initGame, ChessBoard } from './chessEngine.tsx';
import { WaitFor, GET, REMOVE, UPDATE } from "./networking.js";

type PageKey = "SelectGamemode" | "MultiplayerConfiguration" | "ChessBoard";
export default function Chess(){
    const [selected, setSelected] = useState<PageKey>("SelectGamemode");
    const pages = {
        SelectGamemode: 
            <SelectGamemode setSelected={setSelected}/>,
        MultiplayerConfiguration: 
            <MultiplayerConfiguration setSelected={setSelected}/>,
        ChessBoard: 
            <ChessBoard/>
    }
    /* Pages */
    return (
    <div className="flex justify-center items-center w-screen h-screen bg-slate-800 m-0 p-0" id="body">
        {pages[selected]}
    </div>
    );
};

function SelectGamemode({setSelected}: {setSelected: React.Dispatch<React.SetStateAction<PageKey>>}){
    const startLocalGame = (): void => {
        setSelected("ChessBoard");
        initGame();
    }
    const gotoMultiplayerConfiguration = (): void => {
        setSelected("MultiplayerConfiguration");
    }
    return (
        <div className="flex justify-evenly flex-col space-y-3 text-center items-center p-12 w-4/5 sm:w-1/2 h-3/4 min-h-fit sm:h-1/2 bg-white rounded-2xl shadow-2xl">
            {/* <!-- Back to Home --> */}
            <Link to="/">
                <button className="text-xl sm:text-4xl bg-blue-400 text-white shadow-2xl p-6 rounded-2xl hover:scale-110 absolute left-6 top-4">
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

function MultiplayerConfiguration({setSelected}: {setSelected: React.Dispatch<React.SetStateAction<PageKey>>}){
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
        setSelected("ChessBoard");
        initGame(true, hostRoomCode, hostColor);
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
        setSelected("ChessBoard");
        initGame(true, joinRoomCode, -hostColor);
    }

    return (
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
                        className="bg-white text-lg border-4 p-2 w-full max-w-full h-16 rounded-xl border-black" 
                        // autocomplete="off"
                        // autocapitalize="on"
                        />
                    <input type="submit" 
                        onClick={joinRoom} 
                        value="Enter"
                        className="w-28 h-12 bg-blue-500 shadow-xl text-white rext-2xl p-2 rounded-xl hover:scale-105"/>
                </div>
            </div>
        </div>
    );
}

function generateRoomCode(): string{
    // Generate a random 4-letter room code
    let roomCode = "";
    for (let i=1; i<=4; i++){
        roomCode += String.fromCharCode('A'.charCodeAt(0) + Math.floor(Math.random() * 26));
    }
    return roomCode;
}