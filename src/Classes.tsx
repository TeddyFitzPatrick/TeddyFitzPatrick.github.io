import './main.css'

function Classes() {
    return (
        <>
            <p className="mt-[10vh] px-4 pt-4 text-xl">GPA: 3.9; Tutoring Analysis of Algorithms & CS Theory </p>

            <div className="flex flex-wrap items-center gap-4 p-4 w-full h-auto">
                <section className="semester">
                    <h1>Fall 2025</h1>
                    <ul>
                        <li>CSCI 250 (Concepts of Computer Systems)</li>
                        <li>CSCI 344 (Programming Language Concepts)</li>
                        <li>CSCI 320 (Principles of Data Management)</li>
                        <li>PHYS 214 (Modern Physics II - Electric Boogaloo)</li>
                        <li>MLGR 301 (Intermediate German I)</li>
                        <li>PRFL 290 (Applied Music - Piano)</li>
                        <li>WREC 6 (Pickleball)</li>
                    </ul>
                </section>

                <section className="semester">
                    <h1>Spring 2025</h1>
                    <ul>
                        <li>CSCI 331 (Intro to Artificial Intelligence)</li>
                        <li>MLGR 202 (Beginning German II)</li>
                        <li>PRFL 290 (Applied Music - Piano)</li>
                    </ul>
                </section>

                <section className="semester">
                    <h1>Fall 2024</h1>
                    <ul>
                        <li>CSCI 261 (Analysis of Algorithms)</li>
                        <li>CSCI 251 (Concepts of Parallel & Distributed Systems)</li>
                        <li>PHYS 213 (Modern Physics)</li>
                        <li>EEEE 281 (Circuits I)</li>
                        <li>MLGR 201 (Beginning German I)</li>
                        <li>PRFL 290 (Applied Music - Piano)</li>
                        <li>WREC 4 (Badminton)</li>
                    </ul>
                </section>

                <section className="semester">
                    <h1>Spring 2024</h1>
                    <ul>
                        <li>CSCI 243 (The Mechanics of Programming)</li>
                        <li>CSCI 262 (Intro to CS Theory)</li>
                        <li>PHYS 212 (University Physics II - E & M)</li>
                        <li>CHMG 141 (Gen & Analytical Chemistry I)</li>
                        <li>MATH 241 (Linear Algebra)</li>
                        <li>FNRT 256 (Applied Music - Piano)</li>
                    </ul>
                </section>

                <section className="semester">
                    <h1>Summer 2024</h1>
                    <ul>
                        <li>MATH 251 (Probability & Statistics)</li>
                    </ul>
                </section>

                <section className="semester">
                    <h1>Fall 2023</h1>
                    <ul>
                        <li>CSCI 140 (Comp Sci for AP Students)</li>
                        <li>PHYS 207 (Univ I: AP-C Waves)</li>
                        <li>MATH 190 (Discrete Math for Computing)</li>
                        <li>POLS 315 (The Presidency)</li>
                        <li>HIST 125 (Public History & Public Debate)</li>
                        <li>VISL 120 (Intro to Film)</li>
                    </ul>
                </section>
            </div>
        </>
    )
}

// function Semester(){

//     return (
//         <></>
//     )
// }

export default Classes
