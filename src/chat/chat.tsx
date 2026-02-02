import { useEffect, useState, useRef } from "react";
import { supabase } from "./supabase"
import { type User} from "@supabase/supabase-js";
import { ParticlesBack } from "./particles";

// Component 
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadItemProgress,
  FileUploadList,
  type FileUploadProps,
} from "@/components/ui/file-upload";
import { Upload, X } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";

// Type Definitions
type Profile = { 
    username: string,
    pfp_path?: string
    pfpUrl?: string
};
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
    pfp_path: string,
    reaction: string,
    img_path: string,
    // fields not from the DB table
    imageUrl: string,
    pfpUrl: string,
    add_reply: boolean,
    reply_ids: string[]
}

const DEFAULT_POST_QUANTITY = 500;

export default function Chat(){
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
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
                const { data: profileData, error: profileRetrievalError } = await supabase
                    .from('profiles')
                    .select('username, pfp_path')
                    .eq('id', user.id)
                    .single();
                if (profileRetrievalError){
                    console.log("Error retrieving user profile::", profileRetrievalError);
                    return;
                }
                let profileWithPFP: Profile = profileData;
                if (profileData.pfp_path){
                    const { data: pfpData } = supabase
                        .storage
                        .from("profile_pics")
                        .getPublicUrl(profileData.pfp_path);
                    profileWithPFP = {...profileWithPFP, pfpUrl: pfpData.publicUrl};
                }
                setProfile(profileWithPFP);
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
    const [profilePic, setProfilePic] = useState<File | null>(null);

    const createAccount = async() => {
        if (!usernameInputRef.current){
            alert('Please enter a username (required)')
            return;
        }
        // Log the username string put into the textinput element
        const inputtedUsername: string = usernameInputRef.current.value.trim();
        if (inputtedUsername.trim() === "") return;
        let userProfile: {
            id: string,
            username: string,
            pfp_path?: string
        } = {
            id: user?.id,
            username: inputtedUsername,
        };
        if (profilePic) userProfile = {...userProfile, pfp_path: profilePic.name};
        // Create a row in the profiles table of the id + username
        const {data, error} = await supabase
            .from("profiles")
            .insert(userProfile)
            .select()
            .single();
        // Account creation error handling
        if (!error){
            setProfile(data);  
        } else{
            alert("Error creating user profile. Usernames must be unique and between 4-32 characters.");
            console.log("Error creating user profile: ", error);
        }
        // Upload the profile pic if one was provided
        if (!profilePic) return;
        const {error: uploadPFPError} = await supabase
            .storage
            .from("profile_pics")
            .upload(profilePic.name, profilePic, {
                upsert: false,
            });
        if (uploadPFPError){
            console.log("Error logging PFP: ", uploadPFPError);
            alert('Error uploading profile picture ');
        }
            
    };

    return <div className="w-full h-full flex flex-col items-center">
        <button className="fixed text-white p-3 hover:scale-103 left-3 top-3 font-bold bg-cyan-600 rounded-xl shadow-2xl" onClick={() => auth.setUser(null)}>Back to Log In</button>
        <ParticlesBack/>
        <div className=" text-white rounded-xl flex flex-col p-4 space-y-4 w-lg max-w-full">
            <h1 className="font-bold text-3xl">Create an account:</h1>
            {/* username input */}
            <input ref={usernameInputRef} type="text" placeholder="Enter a username (4-32 characters)" className="bg-white p-3 rounded-xl w-lg max-w-full text-black"></input>
            {/* profile pic selection */}
            <h1 className="font-bold text-3xl">Add a profile picture (optional)</h1>
            <div className="flex w-full justify-center">
                <ImageUpload setAttachment={setProfilePic}/>    
            </div>

            <button onClick={createAccount} className="bg-cyan-600 p-4 rounded-xl text-white font-bold hover:scale-101 text-xl shadow-xl">
                Submit
            </button>
        </div>
    </div>
}

function ImageUpload({setAttachment}: {setAttachment: React.Dispatch<React.SetStateAction<File | null>>}) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [files, setFiles] = React.useState<File[]>([]);
  const onUpload: NonNullable<FileUploadProps["onUpload"]> = React.useCallback(
    async (files, {  }) => {
        setIsUploading(true);
        if (files && files[0]){
            setAttachment(files[0]);
        }
        setIsUploading(false);
    },
    [],
  );
  const onFileReject = React.useCallback((file: File, message: string) => {
    console.log(message, {
      description: `"${file.name.length > 20 ? `${file.name.slice(0, 20)}...` : file.name}" has been rejected`,
    });
  }, []);
  return (
    <FileUpload
      accept="image/*"
      maxFiles={1}
      maxSize={4 * 1024 * 1024}
      className="w-full max-w-md"
      onAccept={(files) => setFiles(files)}
      onUpload={onUpload}
      onFileReject={onFileReject}
      multiple
      disabled={isUploading}
    >
      <FileUploadDropzone>
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="flex items-center justify-center rounded-full border p-2.5 mb-2">
            <Upload className="size-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-sm">Drag & drop images here (optional)</p>
          <p className="text-muted-foreground text-xs">
            Or click to browse (max 1 file, up to 20MB)
          </p>
        </div>
      </FileUploadDropzone>
      <FileUploadList>
        {files.map((file, index) => (
          <FileUploadItem key={index} value={file}>
            <div className="flex w-full items-center gap-2">
              <FileUploadItemPreview />
              <FileUploadItemMetadata />
              <FileUploadItemDelete asChild>
                <Button variant="ghost" size="icon" className="size-7">
                  <X />
                </Button>
              </FileUploadItemDelete>
            </div>
            <FileUploadItemProgress />
          </FileUploadItem>
        ))}
      </FileUploadList>
    </FileUpload>
  );
}

function SortBySelect({getPosts}: {getPosts: (sortBy: string) => Promise<void>}){
    type SortBySetting = {
        name: string,
        sql_clause: string,
        image: string
    }
    const sortSettings: SortBySetting[] = [
        {name: "New", sql_clause: "created_on like_count", image: "/chat/new_star.svg"},
        {name: "Hot", sql_clause: "like_count created_on", image: "/chat/fire.svg"},
    ];
    const [isOpen, setIsOpen] = React.useState<boolean>(false);
    const [selectedSetting, setSelectedSetting] = React.useState<SortBySetting>(sortSettings[0]);
    // update the sort by ordering of the post feed
    const updateSortBy = (newSetting: SortBySetting) => {
        setIsOpen(false);
        if (selectedSetting.name === newSetting.name) return;
        console.log("updated")
        setSelectedSetting(newSetting);
        getPosts(newSetting.sql_clause);
    };
    // Load posts on app start up
    useEffect(() => {
        getPosts(sortSettings[0].sql_clause);
    }, []);
    return <div className="flex flex-row w-[99%] items-center justify-start pt-2 font-bold text-white shadow-xl">
    <div className="flex flex-col w-32 text-sm relative">
        <button type="button" onClick={() => setIsOpen(!isOpen)} className="group flex items-center justify-between w-full text-left px-2 py-2  rounded-lg bg-slate-900 shadow-sm focus:outline-none border border-black">
            <div className="flex items-center gap-2">
                <img className="w-6 h-6 rounded-full invert" src={selectedSetting.image} alt={selectedSetting.name} />
                <span>{selectedSetting.name}</span>
            </div>
            <svg className="invert" width="11" height="17" viewBox="0 0 11 17" fill="none" xmlns="http://www.w3.org/2000/svg" >
                <path d="M9.92546 6L5.68538 1L1.44531 6" stroke="#6B7280" strokeOpacity="0.7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M1.44564 11L5.68571 16L9.92578 11" stroke="#6B7280" strokeOpacity="0.7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </button>

        {isOpen && (
            <ul className="w-32 bg-slate-900 rounded shadow-md mt-1 right-0">
                {sortSettings.map((setting) => (
                    <li key={setting.name} className={`px-2 py-2 flex items-center gap-2 cursor-pointer ${setting.name === selectedSetting.name ? "bg-indigo-500 text-white" : "hover:bg-indigo-500 hover:text-white"}`}
                        onClick={() => updateSortBy(setting)} >
                        <img className="w-6 h-6 rounded-full invert" src={setting.image} alt={setting.name} />
                        <span>{setting.name}</span>
                    </li>
                ))}
            </ul>
        )}
    </div>
    </div>
}

function ChatApp({auth}: {auth: AuthContext}){
    const profile = auth.profile!;
    const user = auth.user!;
    const [isPosting, setIsPosting] = useState(false);
    const signOut = async() => {
        await supabase.auth.signOut()
    };
    // new post - input fields
    const titleRef = useRef<HTMLInputElement | null>(null);
    const contentRef = useRef<HTMLTextAreaElement | null>(null);
    const toggleCreatePost = async() => {
        setIsPosting(true);
        window.scrollTo({top:0, left:0, behavior: 'smooth'});
    };
    // sending a post or reply
    const [attachment, setAttachment] = useState<File | null>(null); 
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
            const { data: _logData, error: logError } = await supabase
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
    const getPosts = async (sort_by: string) => {
        // Retrieving a fixed quantity of posts + replies
        const { data, error } = await supabase
            .rpc("get_posts", { target_user_id: user.id, quantity: DEFAULT_POST_QUANTITY})
            .order(sort_by.split(" ")[0], {ascending: false})
            .order(sort_by.split(" ")[1], {ascending: false});
        if (error){
            alert("Error: could not retrieve posts");
            console.log("Error retrieving posts: ", error);
            return;
        }
        // Retrieving the post attachment and/or sender's profile picture
        for (const post of data){
            if (post.img_path){
                const { data: attachmentData } = supabase
                    .storage
                    .from("attachments")
                    .getPublicUrl(post.img_path);
                post.imageUrl = attachmentData.publicUrl;
            }
            if (post.pfp_path){
                const { data: pfpData } = supabase
                    .storage
                    .from("profile_pics")
                    .getPublicUrl(post.pfp_path);
                post.pfpUrl = pfpData.publicUrl;
            }
        }
        for (const post of data){
            post.reply_ids = [];
        }
        const idToPost = new Map<string, Post>(data.map((post: Post) => [post.id, post]));
        for (const post of data){
            if (!post.parent_id) continue;
            // add replies to their parent post
            const parentPost = idToPost.get(post.parent_id)!;
            parentPost.reply_ids.push(post.id);
        }
        // Update the UI state with the posts
        setPosts(data ?? []);
    };
    
    return <>
    <div className="w-full min-h-screen h-fit flex flex-col items-center bg-slate-800 text-white space-y-1">
        {/* header  */}
        <div className="w-full p-4 bg-slate-900 shadow-2xl text-xl flex flex-row justify-between ">
            {/* sign in name  */}
            <div className="flex flex-row space-x-2 text-white items-center">
                <p className="font-bold">Welcome</p> 
                {profile.pfpUrl && <img src={profile.pfpUrl} className="w-10 h-10 rounded-full shadow-2xl"/>}
                <p>{profile!.username}</p>
            </div>
            {/* log out */}
            <button onClick={signOut} className=" hover:scale-103 font-bold text-lg">
                Log Out
            </button>
        </div>
        {/* posts sort by  */}
        <SortBySelect getPosts={getPosts}/>

        {/* posts */}
        <div className="w-full h-full flex flex-col space-y-1 items-center pt-2 pb-6">
            {/* new post  */}
            {isPosting && 
            <div className="w-[99%] h-fit h-max-124 rounded-lg py-2 px-2 sm:px-6 bg-slate-700 flex flex-col shadow-2xl space-y-2 my-2">
                <div className="w-full flex flex-row justify-between space-x-2 items-center py-1">
                    <h1 className="text-xl sm:text-2xl font-bold">Create Post</h1>
                    <button onClick={() => setIsPosting(false)} className="text-white hover:text-red-700">
                        Cancel
                    </button>
                </div>
                {/* title  */}
                <input ref={titleRef} className="w-full rounded-xl bg-transparent border border-gray-200 text-white p-3 font-bold tracking-wider" type="text" placeholder="Title*" id="title"/>
                {/* content  */}
                <textarea ref={contentRef} className="bg-transparent text-white border border-gray-200 rounded-xl p-4" placeholder="Post Text" id="content"/>
                {/* Add attachments */}
                <ImageUpload setAttachment={setAttachment}/>
                {/* send post  */}
                <button 
                    onClick={() => sendPost(titleRef.current!.value, contentRef.current!.value, attachment!)}
                    className="bg-cyan-600 rounded-2xl shadow-xl py-2 px-6 w-fit h-fit hover:scale-102 text-lg font-semibold">
                    Post
                </button>
            </div>}
            {/* existing posts */}
            {posts.filter((post: Post) => (post.parent_id === null)).map(post => (
            <div key={post.id} className="items-end flex flex-col w-[99%] space-y-1">
                {/* post */}
                <div key={post.id} className="w-full h-max-124 rounded-lg px-2 py-2 bg-slate-700">
                    {/* user + date */}
                    <div className="flex flex-row justify-between">
                        <div className="flex flex-row space-x-1 items-center">
                            {post.pfpUrl && <img src={post.pfpUrl} className="mr-2 w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-transparent shadow-2xl"/>}
                            <p>{post.username}</p>
                            <p className="opacity-60 text-sm">∘ {formatDate(post.created_on)}</p>
                        </div>
                        {(post.user_id === user.id) && 
                        <button onClick={() => deletePost(posts, setPosts, post.id)} className="hover:text-red-700">
                            Delete
                        </button>}
                    </div>
                    {/* text */}
                    <h1 className="font-bold text-xl sm:text-2xl">{post.title}</h1>
                    <p className="break-all text-wrap max-h-48 overflow-y-auto text-base sm:text-lg">{post.content}</p>
                    {/* attachment */}
                    {post.imageUrl && 
                    <div className="my-1">
                        <img src={post.imageUrl} className="max-h-96 object-contan aspect-auto"/>
                    </div>}
                    {/* buttons  */}
                    <MessageOptions auth={auth} post={post} posts={posts} setPosts={setPosts}/>
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
                  setPosts: React.Dispatch<React.SetStateAction<Post[]>>}){
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
    const idToPost = new Map<string, Post>(posts.map(post => [post.id, post]));
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
                    {(reply.user_id === user.id) && 
                    <button onClick={() => deletePost(posts, setPosts, reply.id)} className="hover:text-red-700">
                        Delete
                    </button>}
                </div>
                {/* reply text */}
                <p className="break-all text-wrap max-h-48 overflow-y-auto text-base sm:text-lg">{reply.content}</p>
                {/* buttons  */}
                <MessageOptions auth={auth} post={reply} posts={posts} setPosts={setPosts}/>
            </div>
            {/* replies to the reply */}
            <Replies auth={auth} parent_post={reply} posts={posts} setPosts={setPosts}/>
        </div>
        ))}
        {/* add a reply window */}
        {parent_post.add_reply && 
        <div className="w-full bg-slate-700 px-2 py-1 rounded-lg space-y-1 mb-1">
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

function MessageOptions({auth, post, posts, setPosts}:
                        {auth: AuthContext,
                         post: Post,
                         posts: Post[],
                         setPosts: React.Dispatch<React.SetStateAction<Post[]>>}){
    return <div className="w-full space-x-2 flex flex-row text-lg pt-1">
        {/* likes  */}
        <div className={`flex flex-row items-center ${(post.reaction === "like") ? "text-cyan-600" : "hover:scale-104"}`}>
            <button onClick={() => reactToPost(auth, posts, setPosts, post.id, post.reaction, "like")}>
                <Upvote styles={(post.reaction === "like") ? "fill-cyan-600" : "fill-white"}/>
            </button>
            <p>{post.like_count}</p>
        </div>
        {/* dislikes  */}
        <div className={`flex flex-row items-center ${(post.reaction === "dislike") ? "text-cyan-600" : "hover:scale-104"}`} >
            <button onClick={() => reactToPost(auth, posts, setPosts, post.id, post.reaction, "dislike")}>
                <Upvote styles={`scale-y-[-1] ${(post.reaction === "dislike") ? "fill-cyan-600" : "fill-white"}`}/>
            </button>
            <p>{post.dislike_count}</p>
        </div>
        {/* replies */}
        <div className="flex flex-row space-x-1">
            <button className="" onClick={() => toggleCreateReply(posts, setPosts, post.id)}>
                Reply
            </button>
            <p></p>
        </div>
    </div>
}

function Upvote({styles}: {styles: string}){
    return <>
        <svg className={`w-6 h-6 ${styles}`} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 14h4v7a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-7h4a1.001 1.001 0 0 0 .781-1.625l-8-10c-.381-.475-1.181-.475-1.562 0l-8 10A1.001 1.001 0 0 0 4 14z"/>
        </svg>
    </>
}

const reactToPost = async (auth: AuthContext,
                           posts: Post[],
                           setPosts: React.Dispatch<React.SetStateAction<Post[]>>,
                           post_id: string, 
                           oldReaction: string, 
                           newReaction: string) => {
    // delete existing reaction
    if (oldReaction === newReaction){
        const { error: deleteReactionError } = await supabase
            .from("reactions")
            .delete()
            .eq("post_id", post_id)
            .eq("user_id", auth.user!.id);
        if (deleteReactionError){
            console.log("Error deleting reaction: ", deleteReactionError);
        }
        // Update the UI
        setPosts(posts.map(post => {
            if (post.id !== post_id) return post;
            post.reaction = "";
            let newLikeCount: number = +post.like_count!;
            let newDislikeCount: number = +post.dislike_count!;
            if (newReaction === "like") newLikeCount--;
            else if (newReaction === "dislike") newDislikeCount--; 
            return {...post, like_count: newLikeCount.toString(), dislike_count: newDislikeCount.toString()};
        }));
        return;
    }
    const { data: _data, error } = await supabase
        .from("reactions")
        .upsert({
            post_id: post_id,
            user_id: auth.user!.id,
            reaction: newReaction
        });
    if (error){
        console.log(error);
    }
    // Update the UI with the new reaction
    setPosts(posts.map(post => {
        if (post.id !== post_id) return post;
        let newLikeCount: number = +post.like_count!;
        let newDislikeCount: number = +post.dislike_count!;
        if (newReaction === "like") newLikeCount += 1;
        if (newReaction === "dislike") newDislikeCount += 1;
        if (oldReaction === "like") newLikeCount -= 1;
        if (oldReaction === "dislike") newDislikeCount -= 1;
        return {...post, like_count: newLikeCount.toString(), dislike_count: newDislikeCount.toString(), reaction: newReaction}
    }));
}

const deletePost = async (posts: Post[],
                          setPosts: React.Dispatch<React.SetStateAction<Post[]>>,
                          post_id: string) => {
    const { error } = await supabase
        .rpc("delete_post", {delete_post_id: post_id});
    if (error){
        console.log("Error deleting post", error);
        alert("Error deleting post");
    }
    // Update posts after deleting
    setPosts(posts.filter(post => post.id !== post_id));
}

const formatDate = (timestamp: string) =>{
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
    const deltaDaysTruncated = deltaDays.toFixed(0);
    if (deltaDaysTruncated === "1") return "1 day ago";
    return `${deltaDays.toFixed(0)} days ago`;
}

const toggleCreateReply = async (posts: Post[], setPosts: React.Dispatch<React.SetStateAction<Post[]>>, post_id: string) => {
    setPosts(posts.map(post => {
        if (post.id !== post_id) return {...post, add_reply: false};
        return {...post, add_reply: (post.id === post_id) ? !post.add_reply : post.add_reply}
    }));
}
