// import { StrictMode } from 'react'  <<< Mounts twice on development; not necessarily useful
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
// import { Link } from 'react-router-dom';
import './main.css'

import PageNotFound from './pages/PageNotFound.tsx';
import Landing from './pages/Landing.tsx'
import Chess from './util/chess/chess.tsx'
import {Sliders, ParticleLife} from './util/particleLife/particleLife.tsx';

import Chat from './chat/chat.tsx';

function App(){
    const location = useLocation();

    const currentPath = location.pathname;
    // const routes = ["/", "/chat", "/chess", "/particles", "/plife"];
    const standardLayout = !["/chat"].includes(currentPath);

    return <div className={`${standardLayout ? "font-roboto min-h-screen bg-linear-to-br from-orange-500 to-fuchsia-400 text-white flex flex-col items-center" : "font-montserrat flex flex-col items-center justify-center w-full min-h-screen"}`}>
        {/* Defining the routes; these don't appear in the DOM  */}
        <Routes>
            {/* portfolio */}
            <Route path="/" element={<Landing/>}/>
            {/* chess */}
            <Route path="/chess" element={<Chess/>}/>
            {/* particles */}
            <Route path="/particles" element={<><Sliders/><ParticleLife/></>}/> 
            <Route path="/plife" element={<><Sliders/><ParticleLife/></>}/> 
            {/* chat  */}
            <Route path="/chat" element={<Chat/>}/>

            <Route path="*" element={<PageNotFound/>}/>
        </Routes>
    </div>
}

createRoot(document.getElementById('root')!).render(
    <BrowserRouter>
        <App/>
    </BrowserRouter>
)
