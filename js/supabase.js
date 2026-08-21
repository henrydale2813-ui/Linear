const SUPABASE_URL = "YOUR_PROJECT_URL";
const SUPABASE_KEY = "YOUR_PUBLISHABLE_OR_ANON_KEY";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
