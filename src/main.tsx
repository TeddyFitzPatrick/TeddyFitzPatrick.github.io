// import { StrictMode } from 'react'  <<< Mounts twice on development; not necessarily useful
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Mandelbrot from './util/mandelbrot/mandelbrot.tsx';
import './main.css'

import PageNotFound from './pages/PageNotFound.tsx';
import Landing from './pages/Landing.tsx'
import Chess from './util/chess/chess.tsx'
import {Sliders} from './util/particleLife/particleLife.tsx';
import ParticleLife from './util/particleLife/particleLife.tsx';

import Game from './pages/Game.tsx';
import Chat from './util/chat/chat.tsx';

function App(){
    const location = useLocation();
    const currentPath = location.pathname;
    const layouts = new Map([
        ["default", "font-roboto min-h-screen bg-linear-to-br from-orange-500 to-fuchsia-400 text-white flex flex-col items-center"],
        ["/chat", "font-montserrat flex flex-col items-center justify-center w-full min-h-screen"],
        ["/plife", "max-w-screen max-h-screen bg-black"],
        ["/puzzle", "max-w-screen max-h-screen bg-black"],
        ["/mandelbrot", "max-w-screen max-h-screen bg-black"]
    ]);
    return <div className={`${layouts.has(currentPath) ? layouts.get(currentPath) : layouts.get("default")}`}>
        <Routes>
            <Route path="/" element={<Landing/>}/>
            <Route path="/chess" element={<Chess/>}/>
            <Route path="/plife" element={<><Sliders/><ParticleLife/></>}/> 
            <Route path="/chat" element={<Chat/>}/>
            <Route path="/game" element={<Game/>}/>
            <Route path="/mandelbrot" element={<Mandelbrot/>}/>
            {/* 404 Page */}
            <Route path="*" element={<PageNotFound/>}/>
        </Routes>
    </div>
}

createRoot(document.getElementById('root')!).render(
    <BrowserRouter>
        <App/>
    </BrowserRouter>
)
