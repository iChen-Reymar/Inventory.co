import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Check if Supabase is properly configured
if (!supabaseUrl || !supabaseAnonKey || 
    supabaseUrl === 'your_project_url_here' || 
    supabaseAnonKey === 'your_anon_key_here' ||
    supabaseUrl.includes('placeholder')) {
  console.error('⚠️ Supabase is not configured!')
  console.error('Please create a .env file with your Supabase credentials:')
  console.error('VITE_SUPABASE_URL=your_actual_project_url')
  console.error('VITE_SUPABASE_ANON_KEY=your_actual_anon_key')
  console.error('Get these from: Supabase Dashboard > Settings > API')
}

// Create Supabase client
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey && 
           supabaseUrl !== 'https://placeholder.supabase.co' &&
           supabaseUrl !== 'your_project_url_here' &&
           supabaseAnonKey !== 'placeholder-key' &&
           supabaseAnonKey !== 'your_anon_key_here')
}