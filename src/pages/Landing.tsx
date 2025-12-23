import '../main.css'
import TextAnim from '../util/textAnim/TextAnim.tsx';
import { ParticleLife } from '../util/particleLife/particleLife.tsx';
import { Link } from 'react-router-dom';

function Landing() {
    return (
        <>
            <div className="absolute flex flex-col w-1/2 h-1/2 top-1/4 left-1/4 items-center justify-evenly">
                {/* Greeting */}
                <TextAnim text="Hi, I'm Teddy" cooldown={90} 
                    className="text-center text-4xl md:text-7xl lg:text-8xl rounded-2xl text-black opacity-100 z-10 
                    shadow-2xl  bg-white border-black p-4"/>

                    <div className="flex flex-col lg:flex-row space-x-0 lg:space-x-8 space-y-8 lg:space-y-0 w-fit h-fit items-center">
                        <Link to="/plife">
                            <TextAnim text="{ Particle Simulation }" cooldown={20}
                            className="w-fittext-xl md:text-3xl hover:scale-105 font-bold bg-slate-800 text-cyan-700 italic border-cyan-500 border-8 p-2 rounded-xl shadow-2xl"/>
                        </Link>
                        <Link to="/chess">
                            <TextAnim text="{ Play Chess }" cooldown={60}
                            className="w-fit text-xl md:text-3xl hover:scale-105 font-bold bg-slate-800 text-cyan-700 italic border-cyan-500 border-8 p-2 rounded-xl shadow-2xl"/>
                        </Link>
                        <a href="https://teddyfitzpatrick.github.io/mips-interpreter-web/" target="_blank">
                            <TextAnim text="{ MIPS Interpreter }" cooldown={40}
                            className="w-fit text-xl md:text-3xl hover:scale-105 font-bold bg-slate-800 text-cyan-700 italic border-cyan-500 border-8 p-2 rounded-xl shadow-2xl"/>
                        </a>
                    </div>
                  
            </div>
            {/* Particle Simulation */}
            <div className="mt-[10vh] w-[100vw] h-[90vh]">
                <ParticleLife/>
            </div>
            
            <div className="fixed bottom-5 left-5 font-bold text-2xl">
                Now in React!
            </div>
        </>
    )
}

export default Landing
