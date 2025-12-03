import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { authService } from '../services/authService'
import { customerService } from '../services/customerService'
import { staffService } from '../services/staffService'

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  signUp: async () => ({ data: null, error: { message: 'Not initialized' } }),
  signIn: async () => ({ data: null, error: { message: 'Not initialized' } }),
  signOut: async () => ({ error: { message: 'Not initialized' } }),
  isAdmin: () => false,
  isStaff: () => false
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session
    checkUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id) // Debug log
        if (session?.user) {
          // Set user immediately (don't wait for profile)
          setUser(session.user)
          setLoading(false) // Clear loading immediately when user is set
          
          // Load profile in background (don't block)
          loadUserProfile(session.user).catch((error) => {
            console.error('Error in auth state change:', error)
            // User is already set, profile will be null
            setProfile(null)
          })
        } else {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      }
    )

    // Safety timeout - ensure loading doesn't stay true forever
    const timeout = setTimeout(() => {
      console.warn('Loading timeout - forcing loading to false')
      setLoading(false)
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const checkUser = async () => {
    try {
      const user = await authService.getCurrentUser()
      if (user) {
        await loadUserProfile(user)
      } else {
        setUser(null)
        setProfile(null)
      }
    } catch (error) {
      console.error('Error checking user:', error)
      setUser(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  // Sync profile role from staff table if user is a staff member
  const syncProfileRoleFromStaff = async (userId) => {
    try {
      console.log('Checking if user is staff member:', userId) // Debug
      
      // Check if user is in staff table
      const { data: staff, error: staffError } = await staffService.checkIfStaffExists(userId)
      
      console.log('Staff check result:', { staff, staffError }) // Debug
      
      if (!staffError && staff) {
        console.log('User is staff member, syncing role:', staff.role) // Debug
        
        // Try direct update first (user can update their own profile)
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: staff.role })
          .eq('id', userId)
        
        if (updateError) {
          console.error('Error updating profile role directly:', updateError)
          
          // Try using RPC function as fallback (bypasses RLS)
          const { error: rpcError } = await supabase.rpc('sync_staff_profile_role')
          
          if (rpcError) {
            console.error('RPC sync also failed:', rpcError)
            console.warn('Profile role update failed. Admin needs to run: UPDATE profiles SET role = staff.role FROM staff WHERE profiles.id = staff.user_id')
          } else {
            console.log(`Synced profile role to ${staff.role} using RPC function`)
            return staff.role
          }
        } else {
          console.log(`Successfully updated profile role to ${staff.role}`)
          return staff.role
        }
      } else {
        console.log('User is not a staff member or error checking:', staffError)
      }
      return null
    } catch (err) {
      console.error('Exception syncing profile role:', err)
      return null
    }
  }

  const loadUserProfile = async (user) => {
    try {
      console.log('Loading profile for user:', user.id) // Debug
      const { data, error } = await authService.getUserProfile(user.id)
      
      if (error) {
        console.error('Error loading profile:', error)
        // If it's a recursion error, try again after a short delay
        if (error.message && error.message.includes('infinite recursion')) {
          console.warn('Recursion error detected, will retry after delay')
          setTimeout(async () => {
            const retry = await authService.getUserProfile(user.id)
            if (retry.data) {
              setUser(user)
              setProfile(retry.data)
            } else {
              setUser(user)
              setProfile(null)
            }
          }, 1000)
          return
        }
        // Don't throw - just set user without profile
        setUser(user)
        setProfile(null)
        return
      }
      
      // If profile loaded, check if user is staff and sync role
      if (data) {
        // Always try to sync role from staff table
        const syncedRole = await syncProfileRoleFromStaff(user.id)
        
        // If role was synced, reload profile to get updated role
        if (syncedRole) {
          // Wait a bit for the update to complete
          await new Promise(resolve => setTimeout(resolve, 500))
          
          const { data: updatedProfile, error: reloadError } = await authService.getUserProfile(user.id)
          if (updatedProfile) {
            console.log('Profile reloaded with synced role:', updatedProfile) // Debug log
            setUser(user)
            setProfile(updatedProfile)
            return
          } else if (reloadError) {
            console.error('Error reloading profile after sync:', reloadError)
            // Still use the original profile data
          }
        } else {
          // Even if sync didn't return a role, check if profile role needs updating
          // This handles cases where sync failed silently
          const { data: staffCheck } = await staffService.checkIfStaffExists(user.id)
          if (staffCheck && data.role !== staffCheck.role) {
            console.warn(`Profile role (${data.role}) doesn't match staff role (${staffCheck.role}). Admin should run sync SQL.`)
          }
        }
      }
      
      console.log('Profile loaded successfully:', data) // Debug log
      setUser(user)
      setProfile(data)
    } catch (error) {
      console.error('Exception loading profile:', error)
      // Always set user even if profile fails
      setUser(user)
      setProfile(null)
    }
  }

  const signUp = async (email, password, name) => {
    try {
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        return { 
          data: null, 
          error: { 
            message: 'Supabase is not configured. Please create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. See ENV_SETUP.md for instructions.' 
          } 
        }
      }

      const { data, error } = await authService.signUp(email, password, name)
      if (error) throw error

      // Customer record will be automatically created by database trigger
      // when profile is created with role 'Customer'

      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signIn = async (email, password) => {
    try {
      // Validate inputs
      if (!email || !password) {
        return { 
          data: null, 
          error: { message: 'Email and password are required' } 
        }
      }

      console.log('Attempting to sign in:', email) // Debug log
      
      const result = await authService.signIn(email, password)
      console.log('Auth service result:', result) // Debug log
      
      if (result.error) {
        console.error('Sign in error from service:', result.error) // Debug log
        return { data: null, error: result.error }
      }
      
      if (result.data?.user) {
        console.log('User signed in successfully:', result.data.user.id) // Debug log
        
        // Set user immediately and clear loading
        setUser(result.data.user)
        setLoading(false) // Clear loading immediately after sign in
        
        // Load profile in background (don't block)
        loadUserProfile(result.data.user).catch((profileError) => {
          console.warn('Profile loading failed, but user is logged in:', profileError)
          // User is already set, profile will be null
        })
        
        return { data: result.data, error: null }
      } else {
        console.warn('No user data returned from sign in') // Debug log
        return { 
          data: null, 
          error: { message: 'No user data returned from authentication' } 
        }
      }
    } catch (error) {
      console.error('Sign in exception:', error) // Debug log
      return { 
        data: null, 
        error: error || { message: 'An unexpected error occurred during sign in' } 
      }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await authService.signOut()
      if (error) throw error
      setUser(null)
      setProfile(null)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const isAdmin = () => {
    const role = profile?.role
    console.log('Checking admin status - Profile:', profile, 'Role:', role) // Debug log
    // Check both 'Admin' and 'Manager' roles (case-sensitive)
    return role === 'Admin' || role === 'Manager'
  }

  const isStaff = () => {
    return profile?.role === 'Staff' || profile?.role === 'Manager' || profile?.role === 'Admin'
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    isAdmin,
    isStaff
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

