import '../main.css'

function Classes() {
    const classes: Record<string, string[]> = {
        "Spring 2026 (Upcoming)": [
            "*Studying abroad in Osnabrück, Germany (April-August)",
            "German Language - Level B1",
            "Introduction to Computational Linguistics",
            "Machine Learning",
            "Scientific Programming in Python"
        ],
        "Fall 2025": [
            "CSCI 250 (Concepts of Computer Systems)",
            "CSCI 344 (Programming Language Concepts)",
            "CSCI 320 (Principles of Data Management)",
            "PHYS 214 (Modern Physics II - Electric Boogaloo)",
            "MLGR 301 (Intermediate German I)",
            "PRFL-282 (Concert Band)",
            "PRFL 290 (Applied Music - Piano)",
            "WREC 6 (Pickleball)"
        ],
        "Spring 2025": [
            "CSCI 331 (Intro to Artificial Intelligence)",
            "MLGR 202 (Beginning German II)",
            "PRFL 290 (Applied Music - Piano)"
        ],
        "Fall 2024": [
            "CSCI 261 (Analysis of Algorithms)",
            "CSCI 251 (Concepts of Parallel & Distributed Systems)",
            "PHYS 213 (Modern Physics)",
            "EEEE 281 (Circuits I)",
            "MLGR 201 (Beginning German I)",
            "PRFL 290 (Applied Music - Piano)",
            "WREC 4 (Badminton)"
        ],
        "Spring 2024": [
            "CSCI 243 (The Mechanics of Programming)",
            "CSCI 262 (Intro to CS Theory)",
            "PHYS 212 (University Physics II - E & M)",
            "CHMG 141 (Gen & Analytical Chemistry I)",
            "MATH 241 (Linear Algebra)",
            "FNRT 256 (Applied Music - Piano)"
        ],
        "Summer 2024": [
            "MATH 251 (Probability & Statistics)"
        ],
        "Fall 2023": [
            "CSCI 140 (Comp Sci for AP Students)",
            "PHYS 207 (Univ I: AP-C Waves)",
            "MATH 190 (Discrete Math for Computing)",
            "POLS 315 (The Presidency)",
            "HIST 125 (Public History & Public Debate)",
            "VISL 120 (Intro to Film)"
        ]
    }
    return <div className="w-full h-fit flex flex-col">
        <div className="flex flex-row bg-slate-900 rounded-xl shadow-2xl px-4 py-2 w-fit h-fit ml-4 justify-center items-center">
            <p className=" font-bold text-4xl">
                Coursework: (3.9 GPA)
            </p>
        </div>
      
        <div className="flex flex-wrap items-center gap-4 p-4 w-full h-auto">
            {Object.keys(classes).map((semester, index) =>
                // this div makes react happy 
                <div key={index}> 
                    <Semester title={semester} classList={classes[semester]}/>
                </div>
            )}
        </div>
    </div>
}

function Semester({title, classList}: {title: string, classList: string[]}){
    return <>
        <div className="rounded-2xl shadow-2xl bg-slate-900 w-fit h-fit p-8 sm:p-10 shrink-0">
            <h1 className="w-auto italic text-4xl font-bold">{title}</h1>
            <ul className="text-lg text-white pt-4 space-y-2">
                {classList.map((className, index) => (
                    <li key={index}>{className}</li>
                ))}
            </ul>
        </div>
    </>
}
// 42

export default Classes
