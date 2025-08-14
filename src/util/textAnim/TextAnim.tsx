import { useRef, useEffect } from "react";

function TextAnim({text, cooldown, className}: {text: string, cooldown: number, className: string}){

    const textRef = useRef<HTMLDivElement | null>(null);
    const intervalRef = useRef<number | null>(null);

    useEffect(()=>{
        const textbox = textRef.current;
        if (!textbox) return;

        let textIndex: number = 0;
        intervalRef.current = setInterval(()=>{
            if (intervalRef.current && textIndex >= text.length){
                clearInterval(intervalRef.current);
                return;
            }
            if (text[textIndex] == " "){
                textbox.innerHTML += "&nbsp;";
            } else{
                textbox.innerText += text[textIndex]; 
            }
            textIndex += 1;
        }, cooldown);

    }, []);

    
    return (
        <div ref={textRef} className={className}/>
    )
}

export default TextAnim;