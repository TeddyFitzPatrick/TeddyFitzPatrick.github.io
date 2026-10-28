import { useState } from "react";
import { Upload, X} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
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
import type { Setter } from "./chat";

export default function ImageUpload({setAttachment}: {setAttachment: Setter<File | null>}) {
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const onUpload: NonNullable<FileUploadProps["onUpload"]> = React.useCallback(
    async (files) => {
        setIsUploading(true);
        if (files && files[0]){
            setAttachment(files[0]);
        }
        setIsUploading(false);
    },
    [setAttachment],
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
          <p className="font-medium text-sm">Drag & drop an image here</p>
          <p className="text-muted-foreground text-xs">
            Or click to browse (max 1 file, up to 10MB)
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
