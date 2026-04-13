import {createClient} from '@supabase/supabase-js';

const projectURL = "https://vtxnhauvmmbwrztpmsuq.supabase.co";
const publishableAPIKey = "sb_publishable_fH2b-bBB5OIuJ8jFNtK8Cg_onFY3P5L";

export const supabase = createClient(projectURL, publishableAPIKey)
