import '../main.css'
import Projects from './Projects.tsx';
import Classes from './Classes.tsx';
import Hero from './Hero.tsx';

function Landing() {
    return <div className="space-y-14 flex flex-col items-center">
        <Hero/>
        <Projects/>
        <Classes/>
    </div>
}
export default Landing
