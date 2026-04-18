import '../main.css'
// import TextAnim from '../util/textAnim/TextAnim.tsx';
import Projects from './Projects.tsx';
import Classes from './Classes.tsx';
import { ParticleLife } from '../util/particleLife/particleLife.tsx';
// import { Link } from 'react-router-dom';

function Landing() {
    return <div className="space-y-12 flex flex-col items-center">
        <div className="absolute flex flex-col w-1/2 h-1/2 top-1/4 left-1/4 items-center justify-evenly">
            {/* Greeting */}
            <div className="text-center text-4xl md:text-7xl lg:text-8xl rounded-2xl text-white opacity-100 shadow-2xl border-black px-4 py-2">
                <h1 className="typewriter z-2 py-2 font-extrabold tracking-widest">
                    Hi, I'm Teddy
                </h1> 
            </div>
            
            {/* <div className="flex flex-col space-y-1 w-fit h-fit items-center">
                <AnimLink to="/chess" text="{ Multiplayer Chess }" cooldown={60}/>
                <AnimLink to="https://teddyfitzpatrick.github.io/mips-interpreter-web/" text="{ MIPS Interpreter }" cooldown={40}/>
                <AnimLink to="/plife" text="{ Particles }" cooldown={60}/>
                <AnimLink to="/chat" text="{ Reddit Clone }" cooldown={40}/>
                <AnimLink to="/game" text="{ Puzzle Game }" cooldown={50}/>
            </div> */}
        </div>
        {/* Canvas */}
        <div className="w-full h-screen">
            <ParticleLife/>
        </div>
        {/* about  */}
        {/* <div className="w-full flex flex-col md:flex-row text-8xl font-bold h-fit ">
            <div className="w-0 md:w-2/5 flex justify-center">
                <img src="/misc/vermont.png" className="object-contain rounded-xl"/>
            </div>
            <div className="w-full h-full md:w-3/5 flex flex-col justify-center rounded-4xl">
                <div className="h-fit flex items-center justify-center text-lg md:text-xl xl:text-3xl font-bond p-6 rounded-xl">
                    <p>
                        I'm Teddy FitzPatrick, a senior year CS major at RIT. <br/><br/>

                        If you want to get in contact, message me on LinkedIn or send an email.
                    </p>
                </div>
                <ul className="relative bottom-0 flex flex-row justify-around shadow-2xl rounded-xl py-4 sm:py-8 items-center">
                    <SocialLink imgPath={"/misc/github-mark.svg"} targetUrl={"https://github.com/TeddyFitzPatrick/"}/>
                    <SocialLink imgPath={"/misc/linkedin-mark.svg"} targetUrl={"https://www.linkedin.com/in/teddyfitzpatrick/"}/>
                </ul> 
            </div>
        </div>   */}

        {/* Projects */}
        <div className="w-full flex flex-col justify-center items-center">
            <Projects/>
        </div>

        {/* Classes  */}
        <Classes/>
    </div>
}

// function AnimLink({to, text, cooldown}: {to: string, text: string, cooldown: number}){
//     return <Link to={to}>
//         <TextAnim text={`${text}`} cooldown={cooldown}
//         className="w-fittext-xl md:text-4xl hover:scale-105 font-extrabold text-cyan-300 bg-black p-8 hover:underline"/>
//     </Link>
// }

// function SocialLink({imgPath, targetUrl}: {imgPath: string, targetUrl: string}){
//     return (
//         <a className="w-24 h-24 flex rounded-xl shadow-2xl bg-white flex-shrink-0 hover:scale-103" 
//             target="_blank" 
//             href={targetUrl}>
//             <img src={imgPath}/>
//         </a>   
//     );
// }

export default Landing
