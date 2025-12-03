import { supabase } from '../lib/supabase'

// Generate masked customer ID
const generateMaskedId = () => {
  return '********-' + Math.random().toString(36).substring(2, 6).toUpperCase()
}

export const customerService = {
  // Get all customers
  async getAllCustomers() {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  // Get customer by ID
  async getCustomerById(id) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  // Search customer by email
  async searchCustomerByEmail(email) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle()
    return { data, error }
  },

  // Create a new customer (with pending status - needs approval)
  async createCustomer(customer) {
    const customerId = generateMaskedId()
    
    const { data, error } = await supabase
      .from('customers')
      .insert({
        customer_id: customerId,
        name: customer.name,
        email: customer.email,
        role: customer.role || 'Customer',
        user_id: customer.user_id || null,
        status: 'pending' // New customers need approval
      })
      .select()
      .single()
    return { data, error }
  },

  // Approve a customer (Admin/Staff only)
  async approveCustomer(id, approverId) {
    const { data, error } = await supabase
      .from('customers')
      .update({
        status: 'approved',
        approved_by: approverId,
        approved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // Reject a customer (Admin/Staff only)
  async rejectCustomer(id, approverId) {
    const { data, error } = await supabase
      .from('customers')
      .update({
        status: 'rejected',
        approved_by: approverId,
        approved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // Update a customer
  async updateCustomer(id, updates) {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // Delete a customer
  async deleteCustomer(id) {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)
    return { error }
  },

  // Request approval (for customers)
  async requestApproval(customerId) {
    const { data, error } = await supabase
      .from('customers')
      .update({
        status: 'pending',
        approved_by: null,
        approved_at: null
      })
      .eq('id', customerId)
      .select()
      .single()
    return { data, error }
  },

  // Get pending approval requests (for Admin/Staff)
  async getPendingApprovals() {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  // Get customer by user_id
  async getCustomerByUserId(userId) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    return { data, error }
  }
}

