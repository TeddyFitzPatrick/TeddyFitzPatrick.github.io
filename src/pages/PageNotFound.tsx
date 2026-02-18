import { Link } from "react-router-dom"
export default function PageNotFound(){
    return <div className="w-screen h-screen flex flex-col bg-gray-900 items-center justify-center"> 
        <p className="w-fit h-fit font-extrabold text-4xl sm:text-5xl max-w-[95vw]">
            404 Error: Page Not Found
        </p>
        <p className="text-2xl sm:text-3xl max-w-[95vw]">
            Seite nicht gefunden :/
        </p>
        <Link to="/" className="text-2xl underline text-cyan-500">Home Page</Link>
        <Link to="/chat" className="text-2xl underline text-cyan-500">Chat App</Link>
    </div>
}
