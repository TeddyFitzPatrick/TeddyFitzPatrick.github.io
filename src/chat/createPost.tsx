import { useRef } from "react";
import { supabase } from "./supabase"
// types
import { type AuthContext, type Thread } from "./chat";
// pre-made components
import { ArrowUp, Paperclip, Upload, X } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  FileUpload,
  FileUploadItem,
  FileUploadDropzone,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadItemProgress,
  FileUploadList,
  FileUploadTrigger,
} from "@/components/ui/file-upload";
 
export default function CreatePost({auth, getPosts, isPosting, setIsPosting, currentThread}: 
                                   {auth: AuthContext,
                                    getPosts: () => Promise<void>,
                                    isPosting: boolean,
                                    setIsPosting: React.Dispatch<React.SetStateAction<boolean>>,
                                    currentThread: Thread | null}) {
  const user = auth.user!;
  // post inputs
  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const [files, setFiles] = React.useState<File[]>([]);
  const [isUploading, _setIsUploading] = React.useState(false);
  // sending a post or reply
  const sendPost = async () => {
    if (!titleRef.current || !contentRef.current ) return;
    const title = titleRef.current.value;
    const content = contentRef.current.value;
    const attachmentFile = files[0];
    if (!user || !title || !content || !currentThread) return;
    // push the post to the database
    const { data: postData, error } = await supabase
        .from("posts")
        .insert({
            user_id: user.id,
            thread_id: currentThread.id,
            title,
            content
        })
        .select("id")
        .single();
    // alert the user if the post failed to send
    if (error){
        alert("Error sending post. Posts must have a title and are limited to 10,000 characters.");
        console.log("Post send error::", error)
        setIsPosting(false);
        return;  // do not proceed to add attachments if the post failed
    };
    const post_id = postData.id;
    // Push attachments to database if there are any
    if (attachmentFile){
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
            alert('Error attaching attachment to post. Files must be supported image files less than 10MB.');
        }
    };
    // after sending post, retrieve post records from db
    getPosts();
    setIsPosting(false);
  }
  const onFileReject = React.useCallback((file: File, _message: string) => {
    console.log(`"${file.name.length > 20 ? `${file.name.slice(0, 20)}...` : file.name}" has been rejected`);
  }, []);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendPost();
    setFiles([]);
    if (titleRef && titleRef.current) titleRef.current.value = "";
    if (contentRef && contentRef.current) contentRef.current.value = "";
  }

  return (
    <section className="w-[99%] h-max-124 rounded-lg pt-4 pb-8 px-2 sm:px-6 flex flex-col space-y-3 my-2 bg-slate-950">
    <h1 className="w-full text-3xl tracking-wider">Create Post</h1>
    <FileUpload
      value={files}
      onValueChange={setFiles}
      onFileReject={onFileReject}
      maxFiles={1}
      maxSize={5 * 1024 * 1024}
      className="w-full items-center"
      disabled={isUploading}>
      <FileUploadDropzone
        tabIndex={-1}
        // Prevents the dropzone from triggering on click
        onClick={(event) => event.preventDefault()}
        className="absolute top-0 left-0 z-0 flex size-full items-center justify-center rounded-none border-none bg-background/50 p-0 opacity-0 backdrop-blur transition-opacity duration-200 ease-out data-dragging:z-10 data-dragging:opacity-100">
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="flex items-center justify-center rounded-full border p-2.5">
            <Upload className="size-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-sm">Drag & drop files here</p>
          <p className="text-muted-foreground text-xs">
            Upload max 1 file up to 10MB
          </p>
        </div>
      </FileUploadDropzone>

      <form
        onSubmit={onSubmit}
        className="relative flex w-full flex-col gap-2.5 rounded-md px-3 py-2 outline-none focus-within:ring-1 focus-within:ring-ring/50">
        <FileUploadList
          orientation="horizontal"
          className="overflow-x-auto px-0 py-1">
          {files.map((file, index) => (
            <FileUploadItem key={index} value={file} className="max-w-52 p-1.5">
              <FileUploadItemPreview className="size-8 [&>svg]:size-5">
                <FileUploadItemProgress variant="fill" />
              </FileUploadItemPreview>
              <FileUploadItemMetadata size="sm" />
              <FileUploadItemDelete asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute -top-1 -right-1 size-4 shrink-0 cursor-pointer rounded-full"
                >
                  <X className="size-2.5" />
                </Button>
              </FileUploadItemDelete>
            </FileUploadItem>
          ))}
        </FileUploadList>
        <Textarea 
          ref={titleRef}
          placeholder="Title*"
          className="field-sizing-content min-h-10 w-full resize-none border bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent text-white" 
          disabled={isUploading}/>
        <Textarea
          ref={contentRef}
          placeholder="Type your message here..."
          className="field-sizing-content w-full resize-none border border-input bg-transparent min-h-25 px-3 py-2 shadow-none focus-visible:ring-0 dark:bg-transparent text-white"
          disabled={isUploading}/>
        <div className="flex items-center justify-end">
          {/* cancel posting */}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7 rounded-sm backdrop-invert hover:invert" 
            disabled={!isPosting}
            onClick={() => setIsPosting(!isPosting)}>
              <img src="/chat/cancel.svg" className="size-3"/>
              <span className="sr-only">Cancel creating post</span>
          </Button>
          <div className="w-full flex items-center justify-end gap-1.5">
            {/* paperclip icon prompt file upload */}
            <FileUploadTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7 rounded-sm backdrop-invert hover:bg-black" 
              disabled={files && files.length === 1}>
              <Paperclip className="size-3.5 invert" />
              <span className="sr-only">Attach file</span>
            </Button>
          </FileUploadTrigger>
          {/* upload button up arrow */}
          <Button
            size="icon"
            className="size-7 rounded-sm bg-white hover:bg-white">
            <ArrowUp className="size-3.5 invert" />
            <span className="sr-only">Send message</span>
          </Button>
          </div>
        </div>
      </form>
    </FileUpload>
    </section>
  );
}
