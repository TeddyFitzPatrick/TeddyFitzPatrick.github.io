import ParticleLife from "@/util/particleLife/particleLife"

export default function Hero(){
    return <>
    <div className="absolute flex flex-col text-center h-full pointer-events-none items-center justify-evenly">
        <div className="text-center text-4xl md:text-7xl lg:text-8xl rounded-2xl text-white opacity-100 shadow-2xl border-black px-4 py-2">
            <h1 style={{ userSelect: "none" }}
                className="typewriter z-2 py-2 font-extrabold tracking-widest" >
                Hi, I'm Teddy
            </h1> 
        </div>
    </div>

    {/* Particle Backdrop */}
    <div className="w-full h-screen">
        <ParticleLife/>
    </div>
    </>
}