import '../main.css'
import { Link } from 'react-router-dom'

function Projects() {
    return (
        <div className="flex flex-col text-white text-3xl items-center w-full h-full pt-[calc(10vh+1rem)] md:pt-[calc(10vh+3rem)] space-y-6 pb-12"> 
            
            {/* MIPS Interpreter */}
            <Project title="MIPS assembly interpreter"
                desc={<>
                    <p className="text-xl sm:text-3xl p-2 px-0 sm:p-6">
                        Web interpreter of the MIPS 32-bit assembly language. 
                        Supports a core subset of MIPS with a small virtual memory space. <a className="underline text-cyan-400" href="https://teddyfitzpatrick.github.io/mips-interpreter-web" target="_blank">link</a>
                    </p>
                </>}
                mediaElements={<>
                    <img className="m-2 rounded-xl w-full shadow-2xl" src={"/misc/mips_interpreter.png"} width="500"/>
                </>}/>

            {/* Chess */}
            <Project title="Multiplayer Chess Engine"
                desc={<>
                    <p className="text-xl sm:text-3xl p-2 px-0 sm:p-6">
                        Multiplayer Chess made with TypeScript. Uses Firebase realtime database for low-latency multiplayer
                        games with randomized room codes.
                    </p>
                    <Link to="/chess">
                        <button className="my-2 w-fit text-white text-xl sm:text-3xl rounded-xl p-4 font-bold bg-blue-500  hover:scale-105 shadow-2xl">
                            Play Chess
                        </button>
                    </Link>
                </>}
                mediaElements={<>
                    <img className="m-2 rounded-xl w-full lg:w-1/2 shadow-2xl" src={"/projects/greenChessboard.png"} width="500"/>    
                    <img className="m-2 rounded-xl w-full lg:w-1/2 shadow-2xl" src={"/projects/chessPromotionCapture.png"} width="500"/>
                </>}/>

            {/* Mandelbrot Generator */}
            <Project title="Mandelbrot Generator"
                desc={<>
                    <div className="text-xl sm:text-3xl p-2 px-0 sm:p-6 flex-col">
                        Made with JavaScript and the HTML canvas element. Rendered in
                        <a className="text-cyan-400 font-bold" id="timeToGenerate"></a> seconds.
                        The brightness at each point corresponds to the rate of divergence of complex coordinates according to the function
                        <b> f(z) = z<sup>2</sup> + c</b>.
                        <br/> <br/>
                        <b>Left Click to ZOOM</b> and <b>Right Click to UNZOOM</b>. <br/>
                        Select <i>Sharpen</i> to make the rendering more accurate at smaller scales
                        <br/>
                    </div>
                    <div className="flex flex-col p-2 my-2 bg-white rounded-xl text-left w-fit">
                        <p className="font-bold text-black text-bold"> Rendering Tools:</p>
                        <div className="w-full flex flex-wrap">
                            <button className="text-black hover:scale-105 text-2xl m-1 p-1 bg-white rounded-xl border-black border-4" id="invert">Invert Colors</button><br/>
                            <button className="text-black hover:scale-105 text-2xl m-1 p-1 bg-white rounded-xl border-black border-4" id="zInitial">View the z<sub>0</sub> = 1 set</button><br/>
                            <button className="text-black hover:scale-105 text-2xl m-1 p-1 bg-white rounded-xl border-black border-4" id="sharpen">Sharpen</button><br/>
                            <button className="text-black hover:scale-105 text-2xl m-1 p-1 bg-white rounded-xl border-black border-4" id="reset">Reset</button>
                        </div>
                    </div>
                </>}
                mediaElements={<>
                    <div>
                        Rewriting in TypeScript...
                    </div>
                </>}/>

            {/* Particle Life */}
            <Project title="Particle Life"
                desc={<>
                    <p className="text-xl sm:text-3xl p-2 px-0 sm:p-6">
                    Particle life simulation inspired by <a className="font-bold underline hover:text-cyan-400"
                        target="_blank" href="https://www.youtube.com/watch?v=p4YirERTVF0">this video</a> made by Tom
                    Mohr. Randomly generated rules of attraction & repulsion between particles of different colors
                    compose a lifelike simulation. Built with a menu to adjust each particle's sphere of influence, velocity half-life, and radii.
                </p>
                <a target="_blank" className="my-2 w-fit text-white text-xl sm:text-3xl rounded-xl p-4 font-bold bg-blue-500  hover:scale-105 shadow-2xl" href="particleLife.html">
                    Web Version
                </a>
                </>}
                mediaElements={<>
                    <video className="rounded-xl shadow-2xl" autoPlay loop muted width="1000">
                        <source src="/projects/particleLifeCapture.mp4"/>
                    </video>
                </>}/>

            {/* PyTetris */}
            <Project title="PyTetris"
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
                    <video className="m-2 rounded-xl w-full lg:w-1/2 shadow-2xl" autoPlay loop muted width="500">
                        <source src="/projects/tetris.mp4" />
                    </video>
                    <video className="m-2 rounded-xl w-full lg:w-1/2 shadow-2xl" autoPlay loop muted width="500">
                        <source src="/projects/tetrisGameplay.mp4" />
                    </video>
                </>}/>

            {/* PyLife */}
            <Project title="PyLife"
                desc={
                    <p className="text-xl sm:text-3xl p-2 px-0 sm:p-6">
                        A GUI for Conway's Game of Life with adjustable update speed, grid-size, and tile coloring. Allows for both randomized and 
                        user-inputted initial game configurations. Grid cells will wrap around the edges of the grid instead of terminating.
                        Fun for experimenting with various designs and gliders, many of which can be found on the 
                        <a className="text-cyan-400" href="https://conwaylife.com/wiki" target="_blank"> life wiki</a>.
                    </p>
                }
                mediaElements={<>
                    <video className="m-2 rounded-xl w-full lg:w-1/2 shadow-2xl" autoPlay loop muted width="500">
                        <source src="/projects/pylifeControls.mp4" />
                    </video>
                    <video className="m-2 rounded-xl w-full lg:w-1/2 shadow-2xl" autoPlay loop muted width="500">
                        <source src="/projects/pylifeRandomConfigs.mp4" />
                    </video>
                </>}/>

            {/* FitzPatrick Design Inc. */}
            <Project title="FitzPatrick Design Inc."
                desc={
                    <p className="text-xl sm:text-3xl p-2 px-0 sm:p-6">
                        Marketing website design for cabinetry company to attract customers. Showcases professional kitchen designs with an elegant UI. Made with JavaScript and Tailwind.
                        Check it out <a className="text-cyan-400" href="https://designbyfitz.com/" target="_blank">designbyfitz.com</a>
                    </p>
                }
                mediaElements={<>
                    <video className="m-2 rounded-xl w-full lg:w-1/2 shadow-2xl" autoPlay loop muted width="500">
                        <source src="/projects/designbyfitz.mp4" />
                    </video>
                    <img className="m-2 rounded-xl w-full lg:w-1/2 shadow-2xl" width="500" src="/projects/designbyfitzProjects.png"/>
                </>}/>
        </div>
    )
}

function Project({title, desc, mediaElements}: {title: string, desc: React.ReactNode, mediaElements: React.ReactNode}){
    return (
        <div className="flex flex-col items-stretch xl:flex-row min-h-[100px] p-4 sm:p-6 w-[98%] sm:w-[95%] shadow-2xl bg-slate-800 rounded-2xl ">
            {/* Proj Description */}
            <div className="flex flex-col w-full xl:w-[calc(100%-500px)] 2xl:w-[calc(100%-1000px)]">
                <h1 className="font-semibold text-5xl text-cyan-400">{title}</h1>
                {desc}
            </div>
            {/* Proj Media (misc.) */}
            <div className="flex flex-col lg:flex-row xl:flex-col 2xl:flex-row items-center justify-center w-fit h-fit rounded-xl">
                {mediaElements}
            </div>
        </div>
    )
}

export default Projects
