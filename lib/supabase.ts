import { createClient } from "@supabase/supabase-js"

// Create a single supabase client for the entire app
export const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase environment variables")
    return createClient("https://placeholder-url.supabase.co", "placeholder-key")
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}
