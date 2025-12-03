import { supabase } from '../lib/supabase'

export const authService = {
  // Sign up a new user
  async signUp(email, password, name) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: 'Customer'
        }
      }
    })
    return { data, error }
  },

  // Sign in an existing user
  async signIn(email, password) {
    try {
      // Trim email to remove whitespace
      const trimmedEmail = email.trim().toLowerCase()
      
      console.log('Calling Supabase signInWithPassword...') // Debug
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: password
      })
      
      console.log('Supabase response - data:', data, 'error:', error) // Debug
      
      if (error) {
        console.error('Supabase auth error:', error) // Debug
        // Return error with better structure
        return { 
          data: null, 
          error: {
            message: error.message || 'Invalid login credentials',
            status: error.status,
            code: error.code || 'auth_error'
          }
        }
      }
      
      if (!data || !data.user) {
        console.error('No user data in Supabase response') // Debug
        return { 
          data: null, 
          error: { message: 'Authentication failed - no user data returned' } 
        }
      }
      
      return { data, error: null }
    } catch (err) {
      console.error('Exception in signIn:', err) // Debug
      return { 
        data: null, 
        error: { message: err.message || 'An unexpected error occurred' } 
      }
    }
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  // Get user profile
  async getUserProfile(userId) {
    try {
      // First try to get own profile (most common case)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error)
      }
      
      return { data, error }
    } catch (err) {
      console.error('Exception in getUserProfile:', err)
      return { data: null, error: err }
    }
  },

  // Update user profile
  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    return { data, error }
  }
}

