import { Link } from "react-router-dom";

type ProjectForm = {
    location: string,
    url: string
    desc: string,
}

export default function Projects(){
    const projects: ProjectForm[] = [
        {
            location: "/chess",
            url: "/projects/chess/chess.png",
            desc: "CHESS!!!"
        },
        {   
            location: "/mandelbrot",
            url: "/projects/mandelbrot/mandelbrotZoom.png",
            desc: "MANDELBROT"
        },
        {
            location: "/game",
            url: "/projects/puzzle_game.png",
            desc: "PUZZLE!!!"
        },
        {   
            location: "/plife",
            url: "/projects/psim/plife.png",
            desc: "PARTICLES!!!"
        },
        {
            location: "https://teddyfitzpatrick.github.io/mips-interpreter-web/",
            url: "/projects/mips/mips_interpreter.png",
            desc: "MIPS!!"
        },
        {   
            location: "/chat",
            url: "/projects/chat.png",
            desc: "REDDIT CLONE!!!"
        },
    ];

    return <>
    <section className="dark:bg-gray-900 w-full h-full">
    <div className="w-full px-6 py-10">
        <h1 className="text-4xl text-center capitalize font-extrabold text-white">
            Things I've Made
        </h1>

        <div className="grid grid-cols-1 gap-8 mt-8 xl:mt-12 xl:gap-12 lg:grid-cols-2 xl:grid-cols-3">
            {projects.map((project, index) => 
                (<Project location={project.location} url={project.url} desc={project.desc} key={index}/>)
            )}
        </div>
    </div>
    </section>
    </>
}

function Project({location, url, desc}: {location: string, url: string, desc: string}){
    return <>
    <Link to={location} className={`flex items-end overflow-hidden bg-cover rounded-lg h-96 bg-[url('${url}')] hover:cursor-pointer hover:scale-101 shadow-xl shadow-purple-400`}>
        <div className="w-full px-8 py-4 overflow-hidden rounded-b-lg backdrop-blur-sm bg-black/60 dark:bg-gray-800/60">
            <h2 className="mt-4 text-xl font-semibold text-white capitalize">
                {desc}
            </h2>
            <p className="mt-2 text-lg tracking-wider text-blue-500 uppercase dark:text-blue-400">
                Website
            </p>
        </div>
    </Link>
    </>

}