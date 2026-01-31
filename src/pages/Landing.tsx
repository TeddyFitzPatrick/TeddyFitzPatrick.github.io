import '../main.css'
import TextAnim from '../util/textAnim/TextAnim.tsx';
import { ParticleLife } from '../util/particleLife/particleLife.tsx';
import { Link } from 'react-router-dom';

function Landing() {
    return <>
        <div className="absolute flex flex-col w-1/2 h-1/2 top-1/4 left-1/4 items-center justify-evenly">
            {/* Greeting */}
            <div className="text-center text-4xl md:text-7xl lg:text-8xl rounded-2xl text-black opacity-100 shadow-2xl  bg-white border-black px-4 py-2">
                <h1 className="typewriter z-2 py-2">
                    Hi, I'm Teddy
                </h1> 
            </div>
            
            <div className="flex flex-col lg:flex-row space-x-0 lg:space-x-8 space-y-8 lg:space-y-0 w-fit h-fit items-center">
                <Link to="/chat">
                    <TextAnim text="{ Reddit Clone }" cooldown={60}
                        className="w-fittext-xl md:text-3xl hover:scale-105 font-bold bg-slate-800 text-cyan-700 italic border-cyan-500 border-8 p-2 rounded-xl shadow-2xl"/>
                </Link>
                {/* <Link to="/chess">
                    <TextAnim text="{ Play Chess }" cooldown={60}
                    className="w-fit text-xl md:text-3xl hover:scale-105 font-bold bg-slate-800 text-cyan-700 italic border-cyan-500 border-8 p-2 rounded-xl shadow-2xl"/>
                </Link>
                <a href="https://teddyfitzpatrick.github.io/mips-interpreter-web/" target="_blank">
                    <TextAnim text="{ MIPS Interpreter }" cooldown={40}
                    className="w-fit text-xl md:text-3xl hover:scale-105 font-bold bg-slate-800 text-cyan-700 italic border-cyan-500 border-8 p-2 rounded-xl shadow-2xl"/>
                </a> */}
            </div>
        </div>
        {/* Canvas */}
        <div className="mt-[10vh] w-full h-[90vh] ">
            <ParticleLife/>
        </div>
        
        {/* <div className="absolute bottom-2 left-5 font-bold text-2xl">
            <Link to="/chat">
                Chat Testing...
            </Link>
        </div> */}

        <div className="w-full flex flex-col md:flex-row text-8xl font-bold h-[90vh] bg-gradient-to-br from-cyan-200">
            <div className="w-0 md:w-2/5 flex justify-center shadow-2xl">
                <img src="/misc/vermont.png" className="object-contain p-4 rounded-xl"/>
            </div>
            <div className="w-full h-full md:w-3/5 flex flex-col justify-center p-2 sm:p-4">
                <div className="h-full flex items-center justify-center text-lg md:text-xl xl:text-3xl font-bond shadow-2xl p-6 rounded-xl">
                    <p>
                        I'm Teddy FitzPatrick, a junior year CS major at RIT. <br/><br/>
                        
                        I tutor Analysis of Algorithms and Computer Science Theory. <br/><br/>

                        I will be studying abroad in April, and in the meantime, I am working as a research assistant, creating computational models
                        of cytoskeletal structure self-assembly.<br/><br/>

                        In my free time, I play badminton and practice piano.<br/><br/>

                        If you want to get in contact, message me on LinkedIn or send an email.
                    </p>
                </div>
                <ul className="relative bottom-0 flex flex-row justify-around shadow-2xl rounded-xl py-4 sm:py-8 items-center">
                    <SocialLink imgPath={"/misc/github-mark.svg"} targetUrl={"https://github.com/TeddyFitzPatrick/"}/>
                    <SocialLink imgPath={"/misc/linkedin-mark.svg"} targetUrl={"https://www.linkedin.com/in/teddyfitzpatrick/"}/>
                </ul>
            </div>
        </div>  
    </>
}

function SocialLink({imgPath, targetUrl}: {imgPath: string, targetUrl: string}){
    return (
        <a className="w-24 h-24 flex rounded-xl shadow-2xl bg-white flex-shrink-0 hover:scale-103" 
            target="_blank" 
            href={targetUrl}>
            <img src={imgPath}/>
        </a>   
    );
}

export default Landing
