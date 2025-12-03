import { supabase } from '../lib/supabase'

// Generate masked staff ID
const generateMaskedId = () => {
  return '*******-' + Math.random().toString(36).substring(2, 6).toUpperCase()
}

export const staffService = {
  // Get all staff
  async getAllStaff() {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  // Get staff by ID
  async getStaffById(id) {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  // Create a new staff member
  async createStaff(staff) {
    const staffId = generateMaskedId()
    const staffRole = staff.role || 'Staff'
    
    // If user_id is not provided, try to find it by email
    let userId = staff.user_id
    if (!userId && staff.email) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', staff.email.trim().toLowerCase())
          .maybeSingle()
        
        if (profile) {
          userId = profile.id
          console.log(`Found user_id ${userId} for email ${staff.email}`)
        }
      } catch (err) {
        console.warn('Could not find user_id by email:', err)
      }
    }
    
    // Insert staff record
    const { data, error } = await supabase
      .from('staff')
      .insert({
        staff_id: staffId,
        name: staff.name,
        email: staff.email,
        role: staffRole,
        user_id: userId || null
      })
      .select()
      .single()

    // If staff created successfully and has a user_id, update the user's profile role
    if (data && !error && userId) {
      try {
        // Use RPC function to update profile role (bypasses RLS)
        const { error: rpcError } = await supabase.rpc('sync_staff_profile_role')
        
        if (rpcError) {
          // Fallback: Try direct update
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ role: staffRole })
            .eq('id', userId)

          if (profileError) {
            console.error('Error updating profile role:', profileError)
          } else {
            console.log(`Updated user ${userId} profile role to ${staffRole}`)
          }
        } else {
          console.log(`Synced profile role for user ${userId} to ${staffRole}`)
        }
      } catch (err) {
        console.error('Exception updating profile role:', err)
        // Don't fail staff creation if profile update fails
      }
    }

    return { data, error }
  },

  // Update a staff member
  async updateStaff(id, updates) {
    // Get current staff to check for user_id and role changes
    const { data: currentStaff } = await this.getStaffById(id)
    
    // If user_id is missing, try to find it by email
    let userId = currentStaff?.user_id
    if (!userId && (updates.email || currentStaff?.email)) {
      const emailToSearch = updates.email || currentStaff.email
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', emailToSearch.trim().toLowerCase())
          .maybeSingle()
        
        if (profile) {
          userId = profile.id
          updates.user_id = userId // Add user_id to updates
          console.log(`Found user_id ${userId} for email ${emailToSearch}`)
        }
      } catch (err) {
        console.warn('Could not find user_id by email:', err)
      }
    }
    
    // Update staff record
    const { data, error } = await supabase
      .from('staff')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    // If staff updated successfully and has a user_id, update the user's profile role
    if (data && !error && userId) {
      try {
        // If role is being updated, sync it to the profile
        const newRole = updates.role || currentStaff.role
        
        // Try RPC first (bypasses RLS)
        const { error: rpcError } = await supabase.rpc('sync_staff_profile_role')
        
        if (rpcError) {
          // Fallback: Try direct update
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId)

          if (profileError) {
            console.error('Error updating profile role:', profileError)
          } else {
            console.log(`Updated user ${userId} profile role to ${newRole}`)
          }
        } else {
          console.log(`Synced profile role for user ${userId} to ${newRole} using RPC`)
        }
      } catch (err) {
        console.error('Exception updating profile role:', err)
      }
    }

    return { data, error }
  },

  // Delete a staff member
  async deleteStaff(id) {
    // Get staff record first to check for user_id
    const { data: staff } = await this.getStaffById(id)
    
    // Delete staff record
    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', id)

    // If staff deleted successfully and had a user_id, optionally revert profile role to Customer
    // Note: You might want to keep the role or change it based on your business logic
    if (!error && staff?.user_id) {
      try {
        // Option 1: Revert to Customer role
        // const { error: profileError } = await supabase
        //   .from('profiles')
        //   .update({ role: 'Customer' })
        //   .eq('id', staff.user_id)

        // Option 2: Keep the role (don't change it)
        // This is commented out - you can uncomment if you want to revert to Customer
        
        // For now, we'll keep the role as is (don't automatically revert)
        console.log(`Staff deleted for user ${staff.user_id}, profile role unchanged`)
      } catch (err) {
        console.error('Exception handling profile role on staff deletion:', err)
      }
    }

    return { error }
  },

  // Search user by email or name in profiles
  async searchUserByEmailOrName(searchTerm) {
    try {
      const searchLower = searchTerm.toLowerCase().trim()
      
      // Search in profiles table by email or name
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.ilike.%${searchLower}%,name.ilike.%${searchLower}%`)
        .limit(5)
      
      if (error) throw error
      
      // Return first match or null
      return { data: data && data.length > 0 ? data[0] : null, error: null }
    } catch (err) {
      console.error('Error searching user:', err)
      return { data: null, error: err }
    }
  },

  // Check if user is already a staff member
  async checkIfStaffExists(userId) {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      
      return { data, error }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  // Get staff by user_id (for syncing roles)
  async getStaffByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      
      return { data, error }
    } catch (err) {
      return { data: null, error: err }
    }
  }
}

