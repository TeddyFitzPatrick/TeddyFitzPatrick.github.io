import { useState } from "react";

import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
import { type AuthContext, type Profile, supabase, retrieveProfile } from "./chat";
import ImageUpload from "./imageUpload";

export default function EditProfile({auth}: {auth: AuthContext}) {
    const user_id = auth.user!.id;
    const [profilePic, setProfilePic] = useState<File | null>(null);

    const updateProfilePic = async() => {
        if (!profilePic) return;
        // delete the old profile photo (if it exists)
        const { data: oldPFPData, error: oldPFPError } = await supabase
            .from("profiles")
            .select("pfp_path")
            .eq("id", user_id);
        if (!oldPFPError && oldPFPData[0] && oldPFPData[0].pfp_path ){
            // const oldPFPPath = oldPFPData[0].pfp_path;
            // const {error: deleteOldPFPError} = await supabase
            //     .storage
            //     .from("profile_pics")
            //     .delete({})
        }   
        // upload the new profile photo
        const {error: uploadPFPError} = await supabase
            .storage
            .from("profile_pics")
            .upload(profilePic.name, profilePic, {
                upsert: false,
            });
        if (uploadPFPError){
            console.log("Error uploading PFP: ", uploadPFPError);
            alert("Error uploading profile photo.")
            return;
        }
        // update the pfp path in the user profile
        const { error: updatePFPPathError } = await supabase
            .from('profiles')
            .update({
                pfp_path: profilePic.name
            })
            .eq('id', user_id)
            .select();
        if (updatePFPPathError){
            console.log("Error logging PFP path: ", updatePFPPathError)
            alert("Error updating profile picture path.");
            return;
        }
        // update the profile with the new pfp
        const profile: Profile | null = await retrieveProfile(user_id);
        if (profile) auth.setProfile(profile);
    }

    return <>
    <ResponsiveDialog>
        <ResponsiveDialogTrigger asChild>
            <button className="flex flex-row bg-black  rounded-lg shadow-2xl text-white text-sm tracking-wider items-center p-2 space-x-2 hover:scale-101">
                <img className="w-6 h-6 shrink-0 hover:scale-102" alt="cog" src="/chat/cog.svg"/>
                <p>Profile</p>
            </button>
        </ResponsiveDialogTrigger>
        <ResponsiveDialogContent >
        <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Update your profile picture</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
            Upload an image file (5MB max).
            </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="grid gap-4 py-4">
            <ImageUpload setAttachment={setProfilePic}/>
        </div>
        <ResponsiveDialogFooter>
            <ResponsiveDialogClose type="submit" className="bg-black text-white rounded-lg shadow-xl px-4 py-2" onClick={updateProfilePic}>Submit</ResponsiveDialogClose>
        </ResponsiveDialogFooter>

        </ResponsiveDialogContent>
    </ResponsiveDialog>
    </>
}