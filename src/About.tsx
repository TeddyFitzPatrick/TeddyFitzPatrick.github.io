import './main.css'

function About() {
    return (
        <>
            <div className="h-fit w-[95%] md:w-3/4 lg:w-1/2 pl-4 mt-[calc(10vh+3rem)] text-3xl bg-slate-800 p-8 rounded-2xl shadow-2xl text-center">
                I am Teddy FitzPatrick, a third-year CS major @ RIT (Expected Graduation 2027).
                I'm studying computer programming, artificial intelligence, theoretical computer science, modern physics, and German.
                My hobbies are chess, badminton, pickleball, lifting, piano, and web development.
            </div>
            <div className="h-fit w-[95%] md:w-3/4 lg:w-1/2 pl-4 mt-4 text-3xl bg-white text-slate-800 p-8 rounded-2xl shadow-2xl text-center">
                Moving forward, I am looking to research and work in the field of software engineering and machine learning.
                Before I graduate with my bachelor's, I'm looking forward to studying abroad in Osnabrück, Germany. 
                I've taken a few German language courses and I am working towards further proficiency.
            </div>
            <div className="h-fit w-[95%] md:w-3/4 lg:w-1/2 pl-4 mt-4 text-3xl bg-slate-800 p-8 rounded-2xl shadow-2xl text-center">
                My professional experience includes a software engineering internship at Picsello
                and a data science internship at Excellus Blue Cross Blue Shield. 
            </div>

            <div className="h-fit w-1/2 pl-4 mt-4 text-3xl bg-white text-slate-800 p-8 rounded-2xl shadow-2xl text-center mb-4">
                <h1>Links:</h1>
                <ul>
                    <li><a target="_blank" href="https://www.linkedin.com/in/teddyfitzpatrick/" className="text-cyan-500 underline hover:scale-110">LinkedIn</a></li>
                    <li><a target="_blank" href="https://github.com/TeddyFitzPatrick/TeddyFitzPatrick.github.io/" className="text-cyan-500 underline hover:scale-110">GitHub</a></li>
                    <li></li>
                    <li></li>
                </ul>
            </div>

            {/* <div class="w-fit h-fit p-8 text-2xl rounded-2xl bg-slate-800 text-white shadow-2xl">
                <h1 class="text-4xl italic font-bold mb-6">Music I like in no particular order</h1>
                <ol class="space-y-4">
                    <li>Riptide (Vance Joy)</li>
                    <li>Feel It Still (Portugal. The man)</li>
                    <li>Ride (Twenty One Pilots)</li>
                    <li>Merry-Go-Round of Life from <i>Howl's Moving Castle</i> (Joe Hisaishi)</li>
                    <li>Can You Hear the Music (Ludwig Göransson) </li>
                    <li>Interstellar Main Theme (Hans Zimmer)</li>
                    <li>Everything by the Beatles, Billy Joel, and Hozier</li>
                </ol>
            </div> */}
        </>
    )
}

export default About
