import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://mdadjjnnzepxlgadkwig.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kYWRqam5uemVweGxnYWRrd2lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNjI4ODEsImV4cCI6MjA4MTYzODg4MX0.E3Wu7y4CoKJdr-tmVcczKtuTHmljk-11T79W2xMmoWk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const createEphemeralClient = () => createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storageKey: 'sb-admin-portal',
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
});

console.log("? Supabase Client Initialized (Module)");
