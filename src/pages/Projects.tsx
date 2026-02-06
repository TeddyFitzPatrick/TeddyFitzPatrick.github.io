import { ParticleLife } from '@/util/particleLife/particleLife';
import '../main.css'
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom'

// import { Mandelbrot } from '../util/mandelbrot/mandelbrot.tsx'
function Projects() {
    const [currentSlide, setCurrentSlide] = useState<number>(0);
    const sliderRef = useRef<HTMLDivElement | null>(null);
    const totalSlides = 4;
    const prevSlide = () => {
        const newSlide = (currentSlide - 1 + totalSlides) % totalSlides
        setCurrentSlide(newSlide)
        goToSlide(newSlide);
    }
    const nextSlide = () => {
        const newSlide = (currentSlide + 1) % totalSlides
        setCurrentSlide(newSlide);
        goToSlide(newSlide);
    }
    const goToSlide = (index: number) => {
        const slider = sliderRef.current!;
        const slideWidth = slider.children[0].clientWidth;
        slider.style.transform = `translateX(-${index * slideWidth}px)`;
    }
    useEffect(() => {
        window.addEventListener("resize", () => goToSlide(currentSlide));
        goToSlide(currentSlide);
    }, []);
    // <div className="flex flex-col text-white text-3xl items-center justify-center w-full h-full pt-[calc(10vh+1rem)] md:pt-[calc(10vh+3rem)] pb-12"> 
    return <div className="flex items-center w-full">
        {/* left arrow */}
        <button onClick={prevSlide} className="relative md:p-2 p-1 bg-black/30 rounded-full hover:bg-black/50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
        </button>
        {/* panel */}
        <div className="overflow-hidden relative shadow-2xl shadow-fuchsia-900 rounded-4xl " >
            <div ref={sliderRef} className="flex transition-transform duration-500 ease-in-out shrink-0 h-fit">
                <ProjectList/>
            </div>
        </div>
        {/* right arrow */}
        <button onClick={nextSlide} className="p-1 md:p-2 bg-black/30 rounded-full hover:bg-black/50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
        </button>
    </div>
}

function ProjectList(){
    return <>
    {/* MIPS Interpreter */}
    <Project title="MIPS assembly interpreter"
        desc={<>
            {/* <p className="text-xl sm:text-3xl p-2 px-0 sm:p-6">
                Web interpreter of the MIPS 32-bit assembly language. 
                Supports a core subset of MIPS with a small virtual memory space.
                Saves your code on the browser's local storage for multiple session persistence. <br/>
                
            </p> */}
        </>}
        mediaElements={<>
            <a href="https://teddyfitzpatrick.github.io/mips-interpreter-web" target="_blank">
                <img className=" rounded-xl w-full shadow-2xl  max-h-[50vh] object-cover" src={"/projects/mips/mips_interpreter.png"} width="500"/>
            </a></>}/>
    {/* Chess */}
    <Project title="Multiplayer Chess Engine"
        desc={<>
            {/* <p className="text-xl sm:text-3xl p-2 px-0 sm:p-6">
                Multiplayer Chess made with TypeScript. Uses Firebase realtime database for low-latency multiplayer
                games with randomized room codes.
            </p> */}
        </>}
        mediaElements={<>
            <Link to="/chess">
                <img className=" rounded-xl w-full shadow-2xl  max-h-[50vh] object-cover" src={"/projects/chess/greenChessboard.png"} width="500"/>    
            </Link>
            {/* <img className="rounded-xl w-full lg:w-1/2 shadow-2xl" src={"/projects/chess/chessPromotionCapture.png"} width="500"/> */}
        </>}/>

    {/* FitzPatrick Design Inc. */}
    <Project title="FitzPatrick Design Inc."
        desc={ <>
             {/* <p className="text-xl sm:text-3xl p-2 px-0 sm:p-6">
                 Marketing website design for cabinetry company to attract customers. 
                 Showcases professional kitchen designs with an elegant UI. Made with TypeScript, React, TailwindCSS.
                 <br/>
             </p> */}
        </>}
        mediaElements={<>
            <a href="https://designbyfitz.com/" target="_blank">
                <video className="rounded-xl w-full shadow-2xl  max-h-[50vh] object-cover" autoPlay loop muted width="500">
                    <source src="/projects/designbyfitz/design_slideshow.mp4" />
                </video>
            </a>
        </>}/>
    {/* Mandelbrot Generator */}
    <Project title="Mandelbrot Generator"
        desc={<>
            {/* <div className="text-xl sm:text-3xl p-2 px-0 sm:p-6 flex-col">
                Made with TypeScript. Rendering is computationally expensive on larger screens.
                The brightness at each point corresponds to the rate of divergence of its coordinates according to the complex function
                <b> f(z) = z<sup>2</sup> + c</b>.
                <br/><br/>
            </div> */}
            {/* <div className="flex flex-col p-2 my-2 bg-white rounded-xl text-left w-fit">
                <p className="font-bold text-black text-bold"> Rendering Tools:</p>
                <div className="w-full flex flex-wrap">
                    <button className="text-black hover:scale-105 text-2xl m-1 p-1 bg-white rounded-xl border-black border-4" id="invert">Invert Colors</button><br/>
                    <button className="text-black hover:scale-105 text-2xl m-1 p-1 bg-white rounded-xl border-black border-4" id="zInitial">View the z0 = 1 set</button><br/>
                    <button className="text-black hover:scale-105 text-2xl m-1 p-1 bg-white rounded-xl border-black border-4" id="sharpen">Sharpen</button><br/>
                    <button className="text-black hover:scale-105 text-2xl m-1 p-1 bg-white rounded-xl border-black border-4" id="reset">Reset</button>
                </div>
            </div> */}
        </>}
        mediaElements={<>
            {/* <Mandelbrot/> */}
            <Link to="/mandelbrot">
                <img className="object-cover rounded-xl w-full shadow-2xl  max-h-[50vh]" src={"/projects/mandelbrot/mandelbrotZoom.png"} width="500"/>    
            </Link>
            {/* <img className=" rounded-xl w-full lg:w-1/2 shadow-2xl" src={"/projects/mandelbrot/mandelbrotMain.png"} width="500"/> */}
        </>}/>
    </>
}

function Project({title, desc, mediaElements}: {title: string, desc: React.ReactNode, mediaElements: React.ReactNode}){
    return (
        <div className="flex flex-col p-2 sm:p-6 shadow-2xl bg-slate-900 rounded-2xl w-full shrink-0 h-fit space-y-6">
            {/* Proj Description */}
            <div className="flex flex-col w-full ">
                <h1 className="font-semibold text-4xl sm:text-5xl text-cyan-400">{title}</h1>
                {desc}
            </div>
            {/* Proj Media (misc.) */}
            <div className="flex flex-col space-y-2 h-full rounded-xl">
                {mediaElements}
            </div>
        </div>
    )
}

export default Projects

// old projects
{/* Particle Life */}
{/* <Project title="Particle Life"
    desc={<>
        <p className="text-xl sm:text-3xl p-2 px-0 sm:p-6">
        Particle life simulation inspired by <a className="font-bold underline hover:text-cyan-400"
            target="_blank" href="https://www.youtube.com/watch?v=p4YirERTVF0">this video</a> made by Tom
        Mohr. Randomly generated rules of attraction & repulsion between particles of different colors
        compose a lifelike simulation. Built with a menu to adjust simulation variables.
    </p>
        <Link to="/plife">
            <button className="my-2 w-fit text-white text-xl sm:text-3xl rounded-xl p-4 font-bold bg-blue-500  hover:scale-102 shadow-2xl">
                Particle Life
            </button>
        </Link>
    </>}
    mediaElements={<>
        <ParticleLife/> */}
        {/* <video className="rounded-xl shadow-2xl" autoPlay loop muted width="1000">
            <source src="/projects/psim/particleLifeCapture.mp4"/>
        </video> */}
    {/* </>}/> */}
{/* PyTetris */}
{/* <Project title="PyTetris"
    desc={
        <p className="text-xl sm:text-3xl p-2 px-0 sm:p-6">
            A tetris clone made using pygame, a python wrapper of the DirectMedia Layer
            (SDL) used create multimedia applications. I implemented Tetris' Super Rotation System
            (<a href="https://tetris.wiki/Super_Rotation_System" className="text-cyan-400" target="_blank">wiki</a>)
            for accurate block rotations.
            I used pygame, as opposed to a game engine like Unity or Godot, because it forced me to learn the
            fundamentals of rendering, user-input, and low-level game development.
        </p>
    }
    mediaElements={<>
            <video className="rounded-xl w-full shadow-2xl" autoPlay loop muted width="500">
            <source src="/projects/tetris/tetris.mp4" />
        </video> 
            <video className="rounded-xl w-full shadow-2xl" autoPlay loop muted width="500">
            <source src="/projects/tetris/tetrisGameplay.mp4" />
        </video>  
        </>}/> 
{/* PyLife */}
{/* <Project title="PyLife"
    desc={
        <p className="text-xl sm:text-3xl p-2 px-0 sm:p-6">
            A GUI for Conway's Game of Life with adjustable update speed, grid-size, and tile coloring. Allows for both randomized and 
            user-inputted initial game configurations. Grid cells will wrap around the edges of the grid instead of terminating.
            Fun for experimenting with various designs and gliders, many of which can be found on the 
            <a className="text-cyan-400" href="https://conwaylife.com/wiki" target="_blank"> life wiki</a>.
        </p>
    }
    mediaElements={<>
        <video className="rounded-xl w-full shadow-2xl" autoPlay loop muted width="500">
            <source src="/projects/conway/pylifeControls.mp4" />
        </video> 
        <video className=" rounded-xl w-full shadow-2xl" autoPlay loop muted width="500">
            <source src="/projects/conway/pylifeRandomConfigs.mp4" />
        </video> */}
    {/* </>}/> */}
