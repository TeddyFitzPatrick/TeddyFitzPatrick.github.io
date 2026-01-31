import { useEffect, useState, useRef } from 'react'
import { supabase } from "./supabase"
import { type User} from '@supabase/supabase-js'
import { ParticlesBack } from './particles';

// Type Definitions
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
    parent_id: string,
    title: string,
    content: string,
    created_on: string,
    like_count: string,
    dislike_count: string,
    username: string,
    reaction: string
    img_path: string,
    // fields not from the DB table
    imageUrl: string,
    add_reply: boolean,
    reply_ids: string[]
}

const DEFAULT_POST_QUANTITY = 500;


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
    };

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

function formatDate(timestamp: string){
    const date = new Date(timestamp);
    const today = new Date();
    const deltaMilliseconds = (Date.now() - date.getTime());
    // today
    if (date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()){
        const deltaHours = deltaMilliseconds / (1000 * 60 * 60);
        const deltaMinutes = deltaMilliseconds / (1000 * 60);
        return (deltaHours < 1) ? `${deltaMinutes.toFixed(0)}m ago` : `${deltaHours.toFixed(0)}hr ago`;
    }
    const deltaDays = deltaMilliseconds / (1000 * 60 * 60 * 24);
    return `${deltaDays.toFixed(0)} days ago`;
}

function ChatApp({auth}: {auth: AuthContext}){
    const profile = auth.profile!;
    const user = auth.user!;
    const [isPosting, setIsPosting] = useState(false);
    const signOut = async() => {
        await supabase.auth.signOut()
    };
    const reactToPost = async (post_id: string, oldReaction: string, newReaction: string) => {
        if (oldReaction === newReaction) return;
        const { data: _data, error } = await supabase
            .from("reactions")
            .upsert({
                post_id: post_id,
                user_id: user.id,
                reaction: newReaction
            });
        if (error){
            console.log(error);
        }
        // Update the UI with the new reaction
        setPosts(posts => posts.map(post => {
            if (post.id !== post_id) return post;
            let newLikeCount: number = +post.like_count!;
            let newDislikeCount: number = +post.dislike_count!;
            if (newReaction === "like") newLikeCount += 1;
            if (newReaction === "dislike") newDislikeCount += 1;
            if (oldReaction === "like") newLikeCount -= 1;
            if (oldReaction === "dislike") newDislikeCount -= 1;
            return {...post, like_count: newLikeCount.toString(), dislike_count: newDislikeCount.toString(), reaction: newReaction}
        }));
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
    const toggleReplies = async (post_id: string) => {
        setPosts(posts.map(post => {
            return {...post, add_reply: (post.id === post_id) ? !post.add_reply : post.add_reply}
        }));
    };
    // new post - input fields
    const titleRef = useRef<HTMLInputElement | null>(null);
    const contentRef = useRef<HTMLTextAreaElement | null>(null);
    const attachmentsRef = useRef<HTMLInputElement | null>(null);
    const toggleCreatePost = async() => {
        setIsPosting(true);
        window.scrollTo({top:0, left:0, behavior: 'smooth'});
    };
    // sending a post or reply
    const sendPost = async (title: string, content: string, attachmentFile: File) => {
        if (!user || !title || !content) return;
        // set the UI to loading while sending the post
        auth.setLoading(true)
        // push the post to the database
        const { data: postData, error } = await supabase
            .from("posts")
            .insert({
                user_id: user.id,
                title,
                content
            })
            .select("id")
            .single();
        // alert the user if the post failed to send
        if (error){
            alert("Error sending post. Posts are limited to 10,000 ASCII characters.");
            console.log(error)
            auth.setLoading(false);
            setIsPosting(false);
            return;  // do not proceed to add attachments if the post failed
        };
        const post_id = postData.id;
        // Push attachments to database if there are any
        if (attachmentFile){
            console.log("atfile.name",attachmentFile.name)
            // add extension log
            const { data: logData, error: logError } = await supabase
                .from("attachments")
                .insert({
                    post_id: post_id,
                    sender_id: user.id,
                    img_path: attachmentFile.name,
                })
                .select()
                .single();
            if (logError){
                console.log("Error sending attachment log: ", logError)
                alert("Error attaching attachment log");
                auth.setLoading(false);
                setIsPosting(false);
                return
            }
            // Send the attachment to the DB's bucket
            const { error: attachmentError } = await supabase
                .storage
                .from("attachments")
                .upload(attachmentFile.name, attachmentFile, {
                    upsert: false,
                });
            // Notify user if DB rejects the attachment
            if (attachmentError){
                console.log("Error attaching attachment: ", attachmentError);
                alert('Error attaching attachment to post. Files must be supported image files less than 20MB.');
            }
        };
        auth.setLoading(false);
        setIsPosting(false);
    };
    // Function to get post details from the db
    const [posts, setPosts] = useState<Post[]>([]);
    const idToPost = new Map<string, Post>([]);
    const getPosts = async () => {
        // Retrieving a fixed quantity of posts + replies
        const { data, error } = await supabase
            .rpc("get_posts", { target_user_id: user.id, quantity: DEFAULT_POST_QUANTITY});
        if (error){
            alert("Error: could not retrieve posts");
            console.log("Error retrieving posts: ", error);
            return;
        }
        // Retrieving the post attachments
        for (const post of data){
            if (post.img_path){
                const { data: attachmentData } = supabase
                    .storage
                    .from("attachments")
                    .getPublicUrl(post.img_path);
                post.imageUrl = attachmentData.publicUrl;
            }
        }
        for (const post of data){
            // create a mapping of post id's => posts for post tree traversal
            idToPost.set(post.id, post);
            post.reply_ids = [];
        }
        for (const post of data){
            if (!post.parent_id) continue;
            // add replies to their parent post
            const parentPost = idToPost.get(post.parent_id)!;
            parentPost.reply_ids.push(post.id);
        }
        // Update the UI state with the posts
        setPosts(data ?? []);
    };
    // Load posts on app start up
    useEffect(() => {
        getPosts();
    }, []);
    return <>
    <div className="w-full min-h-screen h-fit flex flex-col justify-start bg-slate-800 text-white">
        {/* header  */}
        <div className=" w-full p-4 bg-slate-900 shadow-2xl text-xl flex flex-row justify-between">
            {/* sign in name  */}
            <div className="flex flex-row space-x-2 text-white">
                <p>Logged in as:</p> <p className="font-bold">{profile!.username}</p>
            </div>
            {/* log out */}
            <button onClick={signOut} className=" hover:scale-103 font-bold text-lg">
                Log Out
            </button>
        </div>
        {/* posts */}
        <div className="w-full h-full flex flex-col space-y-1 items-center py-4">
            {/* new post  */}
            {isPosting && 
            <div className="w-[99%] h-fit h-max-124 rounded-lg p-2 bg-slate-700 flex flex-col border border-dashed shadow-2xl space-y-2">
                {/* title  */}
                <div className="w-full flex flex-row justify-between space-x-2">
                    <input ref={titleRef} className="w-full sm:w-1/2 bg-slate-100 font-bold text-black rounded-sm p-1" type="text" placeholder="Post Title" id="title"/>
                    <button onClick={() => setIsPosting(false)} className="text-white hover:text-red-700">
                        Cancel
                    </button>
                </div>
                {/* content  */}
                <textarea ref={contentRef} className="bg-slate-100 rounded-sm text-black px-2 py-1" placeholder="What would you like to say?" id="content"/>
                {/* Add attachments */}
                <div className="flex flex-col">
                    <input ref={attachmentsRef} type="file" accept="image/png, image/jpeg, image/jpg" className="bg-gray-400 rounded-sm shadow-xl p-2 hover:scale-101"/>
                </div>
                {/* send post  */}
                <button 
                    onClick={() => sendPost(titleRef.current!.value, contentRef.current!.value, attachmentsRef.current!.files![0])}
                    className="bg-cyan-600 rounded-lg py-2 px-4 w-fit h-fit hover:scale-104 hover:font-bold">
                    Post
                </button>
            </div>}
            {/* existing posts */}
            {posts.filter((post: Post) => (post.parent_id === null)).map(post => (
            <div key={post.id} className="items-end flex flex-col w-[99%] space-y-1">
                {/* post */}
                <div key={post.id} className="w-full h-max-124 rounded-lg px-2 py-1 bg-slate-700">
                    {/* username + date */}
                    <div className="flex flex-row justify-between">
                        <div className="flex flex-row space-x-1">
                            <p>{post.username}</p>
                            <p className="opacity-60 text-sm">∘ {formatDate(post.created_on)}</p>
                        </div>
                        {(post.user_id === user.id) && 
                        <button onClick={() => deletePost(post.id)} className="hover:text-red-700">
                            Delete
                        </button>}
                    </div>
                    {/* text */}
                    <h1 className="font-bold text-xl">{post.title}</h1>
                    <p className="break-all text-wrap max-h-48 overflow-y-auto">{post.content}</p>
                    {/* attachment */}
                    {post.imageUrl && 
                    <div className="">
                        <img src={post.imageUrl} className="max-h-96 object-contan aspect-auto"/>
                    </div>}
                    <div className="w-full space-x-2 flex flex-row text-xs pt-1">
                        {/* likes  */}
                        <div className={`flex flex-row space-x-1 ${(post.reaction === "like") ? "text-cyan-600" : "hover:scale-104"}`}>
                            <button onClick={() => reactToPost(post.id, post.reaction, "like")}>
                                Like
                            </button>
                            <p>{post.like_count}</p>
                        </div>
                        {/* dislikes  */}
                        <div className={`flex flex-row space-x-1 ${(post.reaction === "dislike") ? "text-cyan-600" : "hover:scale-104"}`} >
                            <button onClick={() => reactToPost(post.id, post.reaction, "dislike")}>
                                Dislike
                            </button>
                            <p>{post.dislike_count}</p>
                        </div>
                        {/* replies */}
                        <div className="flex flex-row space-x-1">
                            <button className="" onClick={() => toggleReplies(post.id)}>
                                Reply
                            </button>
                            <p></p>
                        </div>
                    </div>
                </div>
                {/* replies */}
                <Replies auth={auth} parent_post={post} posts={posts} setPosts={setPosts}/>
            </div>
            ))}
            
        </div>
        {/* Buttons  */}
        <div className="fixed bottom-2 right-2 w-fit h-fit p-4 hover:scale-101 text-xl rounded-2xl bg-slate-900 shadow-2xl text-white">
            <button onClick={() => toggleCreatePost()} className="flex flex-row space-x-2 font-bold text-xl justify-center items-center">
                <img src="/chat/plus.svg" alt="+" className="w-8 invert"/>
                <p>Create Post</p>
            </button>
        </div>
    </div>
    </>
}

function Replies({auth, parent_post, posts, setPosts}:
                 {auth: AuthContext,
                  parent_post: Post,
                  posts: Post[],
                  setPosts: React.Dispatch<React.SetStateAction<Post[]>>,
                }){
    const user = auth.user!;
    const replyRef = useRef<HTMLInputElement | null>(null);
    const sendReply = async (content: string, parent_id: string) => {
        if (!user || !content || !parent_id) return;
        auth.setLoading(true);
        const { data: _data, error } = await supabase
            .from("posts")
            .insert({
                user_id: user.id,
                parent_id,
                content
            })
            .select("id")
            .single();
        if (error){
            alert("Error sending reply");
            console.log(error);
        }
        auth.setLoading(false);
    };
    const toggleReplies = async (post_id: string) => {
        setPosts(posts.map(post => {
            return {...post, add_reply: (post.id === post_id) ? !post.add_reply : post.add_reply}
        }));
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
    const reactToPost = async (post_id: string, oldReaction: string, newReaction: string) => {
        console.log("old", oldReaction);
        console.log("new", newReaction);
        if (oldReaction === newReaction) return;
        const { data: _data, error } = await supabase
            .from("reactions")
            .upsert({
                post_id: post_id,
                user_id: user.id,
                reaction: newReaction
            });
        if (error){
            console.log(error);
        }

        console.log("REPLY REACTION")
        // Update the UI with the new reaction
        setPosts(posts => posts.map(post => {
            if (post.id !== post_id) return post;
            let newLikeCount: number = +post.like_count!;
            let newDislikeCount: number = +post.dislike_count!;
            if (newReaction === "like") newLikeCount += 1;
            if (newReaction === "dislike") newDislikeCount += 1;
            if (oldReaction === "like") newLikeCount -= 1;
            if (oldReaction === "dislike") newDislikeCount -= 1;
            console.log("setting: ", newReaction);
            console.log(post.id);
            return {...post, like_count: newLikeCount.toString(), dislike_count: newDislikeCount.toString(), reaction: newReaction}
        }));
    }; 
    const idToPost = new Map<string, Post>([]);
    for (const post of posts){
        // create a mapping of post id's => posts for post tree traversal
        idToPost.set(post.id, post);
    }
    const replies = parent_post.reply_ids.map(reply_id => idToPost.get(reply_id)!).filter(reply => reply !== undefined && reply !== null);
    return <>
    <div className="w-[95%] sm:w-[98%]">
        {/* existing replies */}
        {parent_post.reply_ids.length > 0 && replies.map((reply: Post) => (
        <div key={reply.id} className="w-full flex items-end flex-col space-y-1">
            {/* reply */}
            <div key={reply.id} className="w-full bg-slate-700 rounded-lg space-y-1 px-2 py-1">
                {/* username, date, delete button */}
                <div className="w-full flex flex-row justify-between">
                    <div className="flex flex-row space-x-1">
                        <p className="">{reply.username}</p>
                        <p className="opacity-60 text-sm">∘ {formatDate(reply.created_on)}</p>
                    </div>
                    <button onClick={() => deletePost(reply.id)} className="text-white hover:text-red-700">
                        Delete
                    </button>
                </div>
                {/* reply text */}
                <p className="break-all text-wrap max-h-48 overflow-y-auto">{reply.content}</p>
                <div className="w-full space-x-2 flex flex-row text-xs pt-1">
                    {/* likes  */}
                    <div className={`flex flex-row space-x-1 ${(reply.reaction === "like") ? "text-cyan-600" : "hover:scale-104"}`}>
                        <button onClick={() => reactToPost(reply.id, reply.reaction, "like")}>
                            Like
                        </button>
                        <p>{reply.like_count}</p>
                    </div>
                    {/* dislikes  */}
                    <div className={`flex flex-row space-x-1 ${(reply.reaction === "dislike") ? "text-cyan-600" : "hover:scale-104"}`} >
                    <button onClick={() => reactToPost(reply.id, reply.reaction, "dislike")}>
                        Dislike
                    </button>
                    <p>{reply.dislike_count}</p>
                    </div>
                    {/* replies */}
                    <div className="flex flex-row space-x-1">
                        <button className="" onClick={() => toggleReplies(reply.id)}>
                            Reply
                        </button>
                        <p>{reply.reply_ids.length}</p>
                    </div>
                </div>
            </div>
            {/* replies to the reply */}
            <Replies auth={auth} parent_post={reply} posts={posts} setPosts={setPosts}/>
        </div>
        ))}
        {/* add a reply window */}
        {parent_post.add_reply && 
        <div className="w-full bg-slate-700 px-2 py-1 rounded-lg space-y-1">
            <h1 className="font-bold ">Add a reply</h1>
            <input ref={replyRef} type="text" placeholder="Your reply" className="w-full bg-slate-100 rounded-lg px-2 py-1 text-black"/>
            <button 
                onClick={() => sendReply(replyRef.current!.value, parent_post.id)}
                className="bg-cyan-600 rounded-lg py-1 px-3 w-fit h-fit hover:scale-104 hover:font-bold">
                Post
            </button>
        </div>}
    </div>
    </>
}
