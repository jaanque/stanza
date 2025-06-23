import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Replace with your actual Supabase URL and Anon Key
const supabaseUrl = 'https://qjechpfehfjpviscziwx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqZWNocGZlaGZqcHZpc2N6aXd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2OTY3NjksImV4cCI6MjA2NjI3Mjc2OX0.HEBDNiQw6ZOLaOOkUZVZC0_kVaGSvMQ8LYvuEMcQevI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
