// ==========================================
// SUPABASE
// ==========================================

const SUPABASE_URL = "https://uoxmidujsignkpnbvoeg.supabase.co";

const SUPABASE_ANON_KEY = "sb_publishable_WP1MPrpvK5w2t3s4NBxGrw_E8dbP563";

const db = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);