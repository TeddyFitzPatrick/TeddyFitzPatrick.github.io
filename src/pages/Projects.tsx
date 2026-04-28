import { Link } from "react-router-dom";

type ProjectForm = {
    location: string,
    url: string
    desc: string,
    icons: string[] 
}
export default function Projects(){
    const projects: ProjectForm[] = [
        {   
            location: "/mandelbrot",
            url: "/mandelbrot/mandelbrotZoom.png",
            desc: "MANDELBROT",
            icons: ["ts", "react", "webgl"]
        },
        {   
            location: "/plife",
            url: "/psim/pblob.png",
            desc: "PARTICLE LIFE",
            icons: ["ts", "react"]
        },
        {
            location: "/chess",
            url: "/chess/chess.png",
            desc: "CHESS",
            icons: ["ts", "react", "tw", "firebase"]
        },
        {
            location: "https://teddyfitzpatrick.github.io/mips-interpreter-web/",
            url: "/mips/mips_interpreter.png",
            desc: "MIPS INTERPRETER",
            icons: ["ts", "react", "tw"]
        },
        {   
            location: "/chat",
            url: "/chat/chat.png",
            desc: "REDDIT CLONE",
            icons: ["ts", "react", "tw", "supabase"]
        },
        {
            location: "/game",
            url: "/puzzle/puzzle_game.png",
            desc: "PUZZLE GAME",
            icons: ["ts", "react", "clingo"]
        },
    ];

    return <>
    <section className="dark:bg-gray-900 w-full h-full flex-col flex justify-center items-center" id="projects">
        <div className="w-full px-6">
            <h1 className="text-4xl text-start capitalize font-extrabold text-white">
                Things I've Made
            </h1>
            <p className="xl">
                (You can click these)
            </p>

            <div className="grid grid-cols-1 gap-8 mt-4 xl:gap-12 lg:grid-cols-2 xl:grid-cols-3">
                {projects.map((project, index) => 
                    (<Project  project={project} key={index}/>)
                )}
            </div>
        </div>
    </section>
    </>
}

function Project({project}: {project: ProjectForm}){
    const icons: string[] = project.icons;
    return <>
    <Link to={project.location} 
        style={{ backgroundImage: `url(${project.url})` }}
        className={`flex items-end overflow-hidden bg-cover rounded-lg h-96 hover:cursor-pointer hover:scale-101 shadow-xl shadow-purple-400`}>
        <div className="w-full px-8 py-4 overflow-hidden rounded-b-lg backdrop-blur-sm bg-black/60 dark:bg-gray-800/60">
            <h2 className="mt-4 text-xl font-semibold text-white capitalize">
                {project.desc}
            </h2>
            <div className="flex flex-row gap-2 w-full">
                {icons.map((icon, index) => 
                    <Icon filename={icon} key={index}/>
                )}
            </div>
        </div>
    </Link>
    </>
}

function Icon({filename}: {filename: string}){
    return <>
        <img src={`/icons/${filename}.svg`} className="w-8 h-8 shrink-0"/>
    </>
}