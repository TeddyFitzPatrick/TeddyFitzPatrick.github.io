import '../main.css'

function About() {
    return (
        <>
            <div className="h-fit w-[95%] md:w-3/4 lg:w-1/2 pl-4 mt-[calc(10vh+3rem)] text-3xl bg-white text-slate-800 p-8 rounded-2xl shadow-2xl text-center">
                I am Teddy FitzPatrick, a third-year CS major @ RIT (expected December 2026).
                I study computers, physics, and German at university.
                I spend my free time practicing piano for upcoming recitals/concerts and playing badminton in the intermediate intramurals and at club meetings. 
            </div>
            <div className="h-fit w-[95%] md:w-3/4 lg:w-1/2 pl-4 mt-4 text-3xl bg-slate-800 p-8 rounded-2xl shadow-2xl text-center">
                My professional experience includes a software engineering internship at Picsello
                and a data science internship at Excellus Blue Cross Blue Shield. I'm currently working as a tutor of 
                Analysis of Algorithms and Computer Science Theory. Most recently, I am programming computational
                models of cytoskeletal structure self-assembly for the Mohapatra Research Group.
            </div>
            <div className="h-fit w-[95%] md:w-3/4 lg:w-1/2 pl-4 mt-4 text-3xl bg-white text-slate-800 p-8 rounded-2xl shadow-2xl text-center">
                For the upcoming spring semester I will be studying abroad in Osnabrück, Germany.
                Looking forward to learning more of the language and living in the country.
            </div>
            <div className="h-fit w-1/2 pl-4 mt-4 text-3xl bg-slate-800 text-white p-8 rounded-2xl shadow-2xl text-center mb-4">
                <h1>Links:</h1>
                <ul className="flex flex-row space-x-6">
                    <SocialLink imgPath={"/misc/github-mark.svg"} targetUrl={"https://github.com/TeddyFitzPatrick/"}/>
                    <SocialLink imgPath={"/misc/linkedin-mark.svg"} targetUrl={"https://www.linkedin.com/in/teddyfitzpatrick/"}/>
                </ul>
            </div>
        </>
    )
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

export default About