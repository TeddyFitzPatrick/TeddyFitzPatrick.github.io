type Experience = {
    date: string,
    title: string,
    desc: string,
    props?: React.ReactNode  // optional html to add to an experience
}
export default function History(){
    const experiences: Experience[] = [
        {
            date: "May 2023 - August 2023",
            title: "Software Engineering Intern",
            desc: "..."
        },
        {
            date: "10800 B.C.E.",
            title: "Data Science Intern",
            desc: "...still",
            props: <>
            </>
        },
    ];


    return <>
    <p className="text-4xl text-white w-full font-extrabold pb-6 text-start pl-[2vw]">
        Experience
    </p>
    <ol className="relative border-s border-default flex flex-col w-[95%]">   
        {experiences.map((experience, index) => (
            <Experience exp={experience} key={index}/>
        ))}               
    </ol>
    </>

}

function Experience({exp}: {exp: Experience}){
    return <>
    <li className="mb-10 ms-4">
        <div className="absolute w-3 h-3 bg-neutral-quaternary rounded-full mt-1.5 -start-1.5 border border-buffer"></div>
        <time className="text-lg font-normal leading-none text-body">{exp.date}</time>
        <h3 className="text-4xl font-semibold text-heading my-2">{exp.title}</h3>
        <p className="mb-4 font-normal text-3xl">
            {exp.desc}
        </p>
        {exp.props}
    </li>
    </>
}