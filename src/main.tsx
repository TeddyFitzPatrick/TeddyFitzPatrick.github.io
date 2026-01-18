// import { StrictMode } from 'react'  <<< Mounts twice on development; not necessarily useful
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Link } from 'react-router-dom';
import './main.css'

import Landing from './pages/Landing.tsx'
import Projects from './pages/Projects.tsx'
import Classes from './pages/Classes.tsx'
import Chess from './util/chess/chess.tsx'
import {Sliders, ParticleLife} from './util/particleLife/particleLife.tsx';

function Nav(){
    return (  
        <nav className="fixed left-0 top-0 flex flex-row justify-around text-lg sm:text-2xl text-center items-center bg-white w-full h-[10vh] z-1">
            <NavItem destination="/" name="home"/>
            <NavItem destination="/projects" name="projects"/>
            <NavItem destination="/classes" name="classes"/>
        </nav> 
    )
}

function NavItem({destination, name}: {destination: string, name: string}){
    return (
        <Link to={destination} className="w-auto h-fit text-pink-800 hover:underline">{name}</Link>
    )
}

function App(){
    const location = useLocation();
    // hide the nav bar for special interactive pages
    const hideNav = ["/chess", "/plife"].includes(location.pathname); 
    return <>
        {!hideNav && <Nav/>}
        <div className="font-['Montserrat'] min-h-screen bg-gradient-to-br from-orange-500 to-fuchsia-400 text-white flex flex-col items-center">
            {/* Defining the routes; these don't appear in the DOM  */}
            <Routes>
                <Route path="/" element={<Landing/>}/>
                <Route path="/projects" element={<Projects/>}/>
                <Route path="/classes" element={<Classes/>}/>
                <Route path="/chess" element={<Chess/>}/>
                <Route path="/plife" element={<><Sliders/><ParticleLife/></>}/>
            </Routes>
        </div>
    </>
}

createRoot(document.getElementById('root')!).render(
    <BrowserRouter>
        <App/>
    </BrowserRouter>
)
