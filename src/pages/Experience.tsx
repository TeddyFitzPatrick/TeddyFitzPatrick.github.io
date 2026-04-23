type Experience = {
    date: string,
    title: string,
    desc: React.ReactNode,
    props?: React.ReactNode  // optional html to add to an experience
}
export default function Experience(){
    const experiences: Experience[] = [
        {
            date: "January 2026 - March 2026",
            title: "Student Researcher",
            desc: <ul className="list-disc">
                <li>
                    Developed a novel model of actin cable length control inside cells, incorporating a depth-first search component
                    in the simulation protocol to account for the reincorporation of actin into the cytoplasmic pool.
                    Worked on stochastic computational models of cytoskeletal structure self-assembly using Python.
                </li>
                <li>
                    Worked on a team to develop AFCT v2.0, an automata editor in Java with automated feedback on student submissions. Created an editor for generalized nondeterministic
                    finite automata (GNFAs), helping students to understand the equivalence of finite state automata and regular expressions through these intermediary machines.
                </li>
            </ul>
        },
        {   
            date: "January 2025 - December 2025",
            title: "Algorithms Tutor",
            desc: <ul className="list-disc">
                <li>
                    Tutored students taking Analysis of Algorithms and Computer Science Theory. Offered help sessions for the 200+ student
                    algorithms class, helping students with their Java programming assignments, covering topics such as computational time complexity,
                    greedy algorithms, divide-and-conquer algorithms, dynamic programming, and graph algorithms (e.g., network flow, traversals). 
                </li>
                <li>
                    Also tutored students of CS theory, covering topics such as automata theory, computational complexity theory,
                    regular expressions, and Turing machines.
                </li>
            </ul>
        },
        {
            date: "June 2025 - August 2025",
            title: "Data Science Intern",
            desc: <ul className="list-disc">
                <li>
                    To expedite and streamline the risk-adjustment process, 
                    I developed an NLP tool in Databricks to identify conditions in members' medical chart PDFs.
                    I used scispaCy, an epidemiological named-entity recognition library, to identify prescriptions and diseases.
                    I designed an ETL pipeline for text extraction, cleaning, and normalization using PyTesseract and SQL.
                </li>
                <li>
                    I built a RAG chatbot using LangChain, Databricks' AI/BI Genie, and Meta's Llama to
                    help prospective members choose an insurance plan that best fits their needs.
                </li>
            </ul>,
            props: <>
            </>
        },
        {
            date: "May 2023 - August 2023",
            title: "Software Engineering Intern",
            desc: <ul className="list-disc">
                <li>
                    Developed a pricing calculator increasing photographers’ revenue by 40% without client loss.
                    Increased customer acquisition by helping photographers achieve sustainable profits.
                    Designed an elegant UI/UX with Tailwind CSS, JavaScript, and Elixir in the Phoenix web framework.
                    Pushed the full-stack feature to production.
                </li>
            </ul>
        }
    ];

    return <div className="w-full flex flex-col items-center px-6">
        <p className="text-4xl text-white w-full font-extrabold text-start flex items-center">
            Experience
        </p>
        <ol className="relative border-s border-default flex flex-col w-full mt-8">   
            {experiences.map((experience, index) => (
                <Tab exp={experience} key={index}/>
            ))}               
        </ol>
    </div>

}

function Tab({exp}: {exp: Experience}){
    return <>
    <li className="mb-10 ms-4 p-4 shadow-2xl rounded-xl shadow-purple-800 bg-slate-900">
        {/* circle thing */}
        <div className="absolute w-3 h-3 bg-neutral-quaternary rounded-full mt-1.5 -start-1.5 border border-buffer"></div>
        <time className="text-lg font-normal leading-none text-body">{exp.date}</time>

        <h3 className="text-2xl sm:text-4xl font-extrabold text-heading my-2">{exp.title}</h3>
        
        <div className="mb-4 text-lg sm:text-xl max-h-60 overflow-y-auto">
            {exp.desc}
        </div>
        {exp.props}
        
    </li>
    </>
}