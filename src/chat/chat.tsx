import { useEffect, useState, useRef } from 'react'

import { supabase } from "./supabase"
import { type User} from '@supabase/supabase-js'

type Profile = { username: string } | null;
type Setter<T> = React.Dispatch<React.SetStateAction<T>>
type AuthContext = {
    user: User | null,
    profile: Profile | null,
    loading: boolean,
    setUser: Setter<User | null>
    setProfile: Setter<Profile | null>
    setLoading: Setter<boolean>
};
type Post = {
    id: string,
    user_id: string,
    title: string,
    content: string,
    created_on: string,
    profiles: {
        username: string
    }
}

export default function Chat(){
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<{ username: string } | null>(null)
    const [loading, setLoading] = useState(true)
    const auth: AuthContext = {
        user,
        profile,
        loading,
        setUser,
        setProfile,
        setLoading
    }
    // Load an existing user profile
    useEffect(() => {
        const load = async () => {
            const {data: { user },} = await supabase.auth.getUser()
            setUser(user)
            if (user) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', user.id)
                    .single();
                if (!error) {
                    setProfile(data)
                } else {
                    setProfile(null) // google acc not linked to a profile
                }
            }
            setLoading(false)
        }
        load();
        const {data: { subscription },} = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
        })
        return () => subscription.unsubscribe()
    }, [])
    // Sign-up, Login, and Loading
    if (loading) return <div>Loading...</div>
    if (!user) return <Login/>
    if (!profile) return <SignUp auth={auth}/>
    // Main App
    return <ChatApp auth={auth}/>
}

function Login(){
    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({ 
            provider: 'google',
            options: {
                redirectTo: window.location.origin + "/chat", 
            },
        })
        if (error) {
            console.error(error.message)
        }
    }
    return <>
    <div className="flex flex-col space-y-4 items-center border-2 p-12 rounded-xl shadow-xl bg-gray-300">
        <h1 className="font-bold text-4xl">Teddy's Chat App (Experimental)</h1>
        <p className="">*Currently only supports Google login</p>
        <button onClick={signInWithGoogle} className="shadow-xl font-bold p-4 rounded-xl text-xl hover:scale-101 text-white bg-cyan-400">
            Sign in with Google
        </button>
    </div>
    </>
}

function SignUp({auth}: {auth: AuthContext}){
    const user = auth.user!; const setProfile = auth.setProfile;
    const usernameInputRef = useRef<HTMLInputElement | null>(null);

    const createAccount = async() => {
        if (!usernameInputRef.current) return;
        // Log the username string put into the textinput element
        const inputtedUsername: string = usernameInputRef.current.value.trim();
        if (inputtedUsername === "") return;
        console.log("Create acc: ", inputtedUsername);
        // Create a row in the profiles table of the id + username
        const {data, error} = await supabase
            .from("profiles")
            .insert({
                id: user?.id,
                username: inputtedUsername,
            })
            .select()
            .single();
        // Account creation error handling
        if (!error){
            setProfile(data);  // this automatically updates the UI
        } else{
            alert("Error creating user profile. Usernames must be unique and less than 33 characters long.");
            console.log("Error creating user profile: ", error);
        }
    };

    return <>
    <div className="w-fit h-fit bg-gray-200 shadow-2xl border-1 border-black rounded-xl flex flex-col p-4 space-y-4">
        <h1 className="font-bold text-3xl">Create an account:</h1>
        <input ref={usernameInputRef} type="text" placeholder="Enter a username (8-32 characters)" className="bg-white border-1 border-black p-4 rounded-xl min-w-128 w-fit"></input>
        <button onClick={createAccount} className="bg-cyan-400 p-4 rounded-xl text-white font-bold hover:scale-101 text-xl shadow-xl">
            Submit
        </button>
    </div>
    </>
}

function ChatApp({auth}: {auth: AuthContext}){
    const profile = auth.profile!;
    // const user = auth.user!;
    // const email = user.email;
    // const fullName = user.user_metadata.full_name
    // const avatar = user.user_metadata.avatar_url;

    const [isPosting, setIsPosting] = useState(false);

    const signOut = async() => {
        await supabase.auth.signOut()
    };
    // Get the posts from the DB
    const [posts, setPosts] = useState<Post[]>([]);
    useEffect(() => {
        const getPosts = async () => {
            // Retrieve all posts from the posts tble
            const { data, error } = await supabase
            .from("posts")
            .select("id, user_id, title, content, created_on, profiles(username)")
            .order("created_on", { ascending: false })
            if (error){
                alert("Error retrieving posts " + error);
                return;
            }
            // Update the UI state with the posts
            // @ts-expect-error: suppress error for this line; can't get it to stop complaining, works fine.
            setPosts(data ?? []);
        }
        getPosts();
    }, []);

    return <>
    <div className="w-full min-h-screen flex flex-col justify-start">
        {/* posts  */}
        <div className="w-full h-full flex flex-col space-y-2 items-center ">
            <h1 className="w-full p-4 bg-gray-300 shadow-2xl text-xl flex flex-row space-x-2">
                <p>Logged in as:</p> <p className="font-bold">{profile!.username}</p>
            </h1>
            {isPosting && (
                <CreatePost auth={auth} setIsPosting={setIsPosting}/>
            )}
            {posts.map(post => (
                <div key={post.id} className="border-1 border-gray-500 w-[99%] h-fit h-max-124 hover:bg-gray-100 hover:rounded-lg px-2 py-1">
                    {/* username + date */}
                    <div className="flex flex-row  space-x-1">
                        <p className="italic">User:</p><p>{post.profiles.username}</p>
                        <p>-- {new Date(post.created_on).toLocaleString()}</p>
                    </div>

                    <h1 className="font-bold text-xl">{post.title}</h1>
                    <p>{post.content}</p>
                    <div className="w-full space-x-1 flex flex-row text-xs">
                        <button>Like</button>
                        <button>Dislike</button>
                        <button className="">Comments</button>
                    </div>
                </div>
            ))}
            
        </div>
        {/* Buttons  */}
        <div className="fixed bottom-5 left-5 w-fit h-fit p-4 hover:scale-101 text-xl rounded-2xl bg-gray-300 shadow-xl">
            <button onClick={() => setIsPosting(true)} className="flex flex-row space-x-2 font-bold text-xl justify-center items-center">
                <img src="/chat/plus.svg" alt="+" className="w-8 flex-shrink-0"/>
                <p>Create Post</p>
            </button>
        </div>
        <button onClick={signOut} className="bg-gray-300 text-black hover:scale-101 fixed bottom-5 right-5 p-4 shadow-xl rounded-xl font-bold text-lg">
            Log Out
        </button>
    </div>
    </>
}

function CreatePost({auth, setIsPosting}: {auth: AuthContext, setIsPosting: React.Dispatch<React.SetStateAction<boolean>>}){
    const user = auth.user;
    const titleRef = useRef<HTMLInputElement | null>(null);
    const contentRef = useRef<HTMLTextAreaElement | null>(null);

    const sendPost = async () => {
        if (!user || !titleRef || !contentRef) return;

        auth.setLoading(true)
        const { data: _data, error } = await supabase
            .from("posts")
            .insert({
                user_id: user.id,
                title: titleRef.current!.value,
                content: contentRef.current!.value
            });
        if (error){
            alert('Error sending post: ' + error);
            return
        } 
        auth.setLoading(false);
        setIsPosting(false);
    };

    return <>
    <div className="border-2 p-4 shadow-2xl absolute w-full h-screen bg-gray-200 z-20 flex flex-col space-y-2 text-xl">
        <button onClick={() => setIsPosting(false)} className="bg-red-400 font-bold fixed top-5 right-5 p-4 shadow-xl rounded-xl text-white hover:scale-101">
            Cancel
        </button>
        <h1 className="font-bold text-2xl">Create Post:</h1>
        <input ref={titleRef} className="bg-white border-1 border-black p-4 rounded-xl min-w-128 w-fit" type="text" placeholder="Title"></input>
        <textarea ref={contentRef} className="bg-white border-1 border-black p-4 rounded-xl min-w-128 w-fit resizable" placeholder="Type your post here"></textarea>
        <button onClick={sendPost} className="bg-cyan-400 p-4 rounded-xl text-white font-bold hover:scale-101 text-xl shadow-xl">
            Submit
        </button>
    </div>
    </>
}

