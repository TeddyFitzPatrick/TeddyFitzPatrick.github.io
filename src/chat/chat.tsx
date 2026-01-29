import { useEffect, useState, useRef } from 'react'
import { supabase } from "./supabase"
import { type User} from '@supabase/supabase-js'
import { ParticlesBack } from './particles';
import { v4 as uuidv4 } from 'uuid'; 

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
    like_count: string,
    dislike_count: string,
    username: string,
    reaction: string
    attachment_location: string,
    mime_type: string,
    imageUrl: string
}

const imageFileTypes = ["image/png", "image/jpeg", "image/svg", "image/webp", "image/gif"];

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
    <ParticlesBack/>
    <div className="flex flex-col space-y-4 p-8 rounded-xl shadow-2xl text-white bg-transparent">
        <div className="items-start space-y-2">
            <h1 className="font-bold text-4xl"> RIT Chat</h1>
            <p>you are anonymous to other users</p>
        </div>
        <button onClick={signInWithGoogle} className="shadow-xl font-bold p-4 rounded-xl text-xl hover:scale-103 text-white bg-cyan-400">
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
    <button className="fixed text-white p-3 hover:scale-103 left-5 top-5 font-bold bg-cyan-400 rounded-xl shadow-2xl" onClick={() => auth.setUser(null)}>Back to Log In</button>
    <ParticlesBack/>
    <div className=" text-white rounded-xl flex flex-col p-4 space-y-4">
        <h1 className="font-bold text-3xl">Create an account:</h1>
        <input ref={usernameInputRef} type="text" placeholder="Enter a username (8-32 characters)" className="bg-white p-3 rounded-xl min-w-128 w-fit text-black"></input>
        <button onClick={createAccount} className="bg-cyan-400 p-4 rounded-xl text-white font-bold hover:scale-102 text-xl shadow-xl">
            Submit
        </button>
    </div>
    </>
}

function ChatApp({auth}: {auth: AuthContext}){
    const profile = auth.profile!;
    const user = auth.user!;
    const [isPosting, setIsPosting] = useState(false);
    const signOut = async() => {
        await supabase.auth.signOut()
    };
    const reactToPost = async (post_id: string, reaction: string) => {
        const { data: _data, error } = await supabase
            .from("reactions")
            .upsert({
                post_id: post_id,
                user_id: user.id,
                reaction: reaction
            });
        if (error){
            console.log(error);
        }
        // Update posts after reacting
        // TODO: make it UI-side
        getPosts();
    };
    const deletePost = async (post_id: string) => {
        const { error } = await supabase
            .rpc("delete_post", {delete_post_id: post_id})
        if (error){
            console.log("Error deleting post", error);
            alert("Error deleting post");
        }
        // Update posts after deleting
        setPosts(posts => posts.filter(post => post.id !== post_id));
    };
    const [posts, setPosts] = useState<Post[]>([]);
    // Function to get post details from the db
    const getPosts = async () => {
        const { data, error } = await supabase
            .rpc("get_posts", { target_user_id: user.id });

        if (error){
            alert("Error: could not retrieve posts");
            console.log("Error retrieving posts: ", error);
            return;
        }
        for (const post of data){
            if (post.attachment_location){
                const { data: attachmentData } = supabase
                    .storage
                    .from("attachments")
                    .getPublicUrl(post.attachment_location);
                post.imageUrl = attachmentData.publicUrl;
            }
        }

        // Update the UI state with the posts
        setPosts(data ?? []);
    }
    // Get posts on start up
    useEffect(() => {
        getPosts();
    }, []);
    return <>
    {isPosting ? 
    (<CreatePost auth={auth} setIsPosting={setIsPosting}/>)
    :
    (<div className="w-full min-h-screen h-fit flex flex-col justify-start bg-black text-white">
        {/* header  */}
        <div className=" w-full p-4 bg-gray-400 shadow-2xl text-xl flex flex-row justify-between">
            {/* sign in name  */}
            <div className="flex flex-row space-x-2 text-black">
                <p>Logged in as:</p> <p className="font-bold">{profile!.username}</p>
            </div>
            {/* <nav className="flex flex-row space-x-2 sm:space-x-8">
                <button className="border-x-2 px-4 rounded-sm text-cyan-600 hover:scale-102">
                    All Users Chat
                </button>
                <button className="border-x-2 px-4 rounded-sm hover:text-cyan-600 hover:scale-102">
                    RIT Only Chat
                </button>
            </nav>
             */}
            {/* log out */}
            <button onClick={signOut} className="text-black hover:scale-103 font-bold text-lg">
                Log Out
            </button>
        </div>
        {/* posts  */}
        <div className="w-full h-full flex flex-col space-y-2 items-center py-4">
            {posts.map(post => (
                <div key={post.id} className="w-[99%] h-fit h-max-124 rounded-lg px-2 py-1 bg-slate-900">
                    {/* username + date */}
                    <div className="flex flex-row justify-between">
                        <div className="flex flex-row space-x-1">
                            <p>{post.username}</p>
                            <p>-- {new Date(post.created_on).toLocaleString()}</p>
                        </div>
                        {(post.user_id === user.id) && 
                        <button onClick={() => deletePost(post.id)} className="hover:text-red-700">
                            Delete Post
                        </button>}
                    </div>

                    {/* text  */}
                    <h1 className="font-bold text-xl">{post.title}</h1>
                    <p className="break-all text-wrap max-h-48 overflow-y-auto">{post.content}</p>
                    {/* attachment */}
                    {post.imageUrl && 
                    <div className="bg-black flex justify-center">
                        <img src={post.imageUrl} className="w-1/2 h-1/2 object-contan transition-"/>
                    </div>}

                    <div className="w-full space-x-2 flex flex-row text-xs">
                        {/* likes  */}
                        <div className={`flex flex-row space-x-1 ${(post.reaction === "like") ? "text-cyan-600" : "hover:animate-pulse hover:scale-102"}`}>
                            <button onClick={() => reactToPost(post.id, "like")}>
                                Like
                            </button>
                            <p>{post.like_count}</p>
                        </div>
                        {/* dislikes  */}
                        <div className={`flex flex-row space-x-1 ${(post.reaction === "dislike") ? "text-cyan-600" : "hover:animate-pulse hover:scale-102"}`} >
                            <button onClick={() => reactToPost(post.id, "dislike")}>
                                Dislike
                            </button>
                            <p>{post.dislike_count}</p>
                        </div>
                        {/* comments  */}
                        <button className="">Comments</button>
                    </div>
                </div>
            ))}
            
        </div>
        {/* Buttons  */}
        <div className="fixed bottom-2 right-2 w-fit h-fit p-4 hover:scale-101 text-xl rounded-2xl bg-gray-400 shadow-2xl text-black">
            <button onClick={() => setIsPosting(true)} className="flex flex-row space-x-2 font-bold text-xl justify-center items-center">
                <img src="/chat/plus.svg" alt="+" className="w-8 flex-shrink-0"/>
                <p>Create Post</p>
            </button>
        </div>
    </div>)}
    </>
}

function CreatePost({auth, setIsPosting}: {auth: AuthContext, setIsPosting: React.Dispatch<React.SetStateAction<boolean>>}){
    const user = auth.user;
    const titleRef = useRef<HTMLInputElement | null>(null);
    const contentRef = useRef<HTMLTextAreaElement | null>(null);
    const attachmentsRef = useRef<HTMLInputElement | null>(null);

    const sendPost = async () => {
        if (!user || !titleRef.current || !contentRef.current || !attachmentsRef.current) return;
        // set the UI to loading while sending the post
        auth.setLoading(true)
        // Retrieve the attachment before sending the post (this fixes a react unmount issue)
        const files = attachmentsRef.current?.files;
        // push the post to the database
        const { data: postData, error } = await supabase
            .from("posts")
            .insert({
                user_id: user.id,
                title: titleRef.current.value,
                content: contentRef.current.value
            })
            .select("id")
            .single();
        // alert the user if the post failed to send
        if (error){
            alert('Error sending post. Posts are limited to 10,000 ASCII characters.');
            console.log(error)
        } 
        const post_id = postData!.id;
        // Push attachments to database if there are any
        console.log(attachmentsRef.current)
        console.log(files)
        if (files && files.length > 0){
            for (const file of files){
                // Detect unsupported file attachments
                if (!imageFileTypes.includes(file.type)){
                    alert(`File attachment ${file.type} not supported.`);
                    break;
                }
                // Send the attachment(s) to the DB's bucket
                const fileExtension = file.name.split('.').pop();
                const storagePath = `${uuidv4()}.${fileExtension}`;
                const { error: attachmentError } = await supabase
                    .storage
                    .from("attachments")
                    .upload(storagePath, file, {
                        upsert: false,
                        contentType: file.type
                    });
                // Notify user if DB rejects the attachment
                if (attachmentError){
                    console.log("Error attaching attachment: ", attachmentError);
                    alert('Error attaching attachment to post. Files must be supported image files less than 20MB.');
                }
                // Push a log of the attachment to the DB
                const {error: attachmentLogError} = await supabase
                    .from("attachments")
                    .insert({
                        post_id: post_id,
                        sender_id: user.id,
                        img_path: storagePath,
                        mime_type: fileExtension
                    });
                if (attachmentLogError){
                    console.log("Error attaching attachment: ", attachmentLogError);
                    alert('Error attaching attachment to post. Files must be supported image files less than 20MB.');
                }
            }
        }
        auth.setLoading(false);
        setIsPosting(false);
    };

    return <>
    <div className="w-screen h-screen flex-col text-xl flex justify-center items-center bg-slate-900 text-white">
        <div className="flex flex-col space-y-2">
            <h1 className="text-3xl">Create Post:</h1>
            {/* title  */}
            <input ref={titleRef} className="bg-white border-1 border-black p-2 rounded-sm w-128 max-w-[98vw] text-black" type="text" placeholder="Title" id="title"></input>
            {/* content  */}
            <textarea ref={contentRef} className="bg-white border-1 border-black p-2 rounded-sm w-128 max-w-[98vw] resizable h-64 text-black" placeholder="Your post goes here" id="content"/>
            {/* Add attachments */}
            <div className="flex flex-col">
                <input ref={attachmentsRef} type="file" accept="image/png, image/jpeg, image/jpg" className="bg-gray-400 rounded-sm shadow-xl p-2 hover:scale-101"/>
            </div>
            {/* cancel or submit */}
            <div className="flex flex-row space-x-2 justify-between">
                <button onClick={() => setIsPosting(false)} className="bg-red-400 font-bold p-4 shadow-xl rounded-xl text-white hover:scale-101">
                    Cancel
                </button>
                <button onClick={sendPost} className="bg-cyan-400 w-fit p-4 rounded-xl text-white font-bold hover:scale-101 text-xl shadow-xl">
                    Post
                </button>
            </div>
        </div>
    </div>
    </>
}

