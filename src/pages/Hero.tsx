import ParticleLife from "@/util/particleLife/particleLife"

export default function Hero(){
    return <>
    <div className="absolute flex flex-col text-center h-full pointer-events-none items-center justify-evenly">
        <div className="text-center text-4xl md:text-7xl lg:text-8xl rounded-2xl text-white opacity-100 shadow-2xl border-black px-4 py-2">
            <h1 style={{ userSelect: "none" }}
                className="bg-black/50 backdrop-blur-sm p-4 rounded-2xl">
                <div className="typewriter font-extrabold tracking-widest p-2.5">
                    Hi, I'm Teddy
                </div>
            </h1> 
        </div>
    </div>

    {/* Particle Backdrop */}
    <div className="w-full h-screen">
        <ParticleLife/>
    </div>
    </>
}