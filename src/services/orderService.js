import { supabase } from '../lib/supabase'

export const orderService = {
  // Get all orders (for Admin/Staff - sees all orders)
  // For Customers - RLS will automatically filter to their own orders
  async getAllOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customers (
          customer_id,
          name,
          email
        )
      `)
      .order('order_date', { ascending: false })
    return { data, error }
  },

  // Get orders for current customer (explicitly filter by customer)
  async getCustomerOrders(customerId) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customers (
          customer_id,
          name,
          email
        )
      `)
      .eq('customer_id', customerId)
      .order('order_date', { ascending: false })
    return { data, error }
  },

  // Get order by ID
  async getOrderById(id) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customers (
          customer_id,
          name,
          email
        )
      `)
      .eq('id', id)
      .single()
    return { data, error }
  },

  // Create a new order and decrement product stock using RPC function
  async createOrder(order) {
    try {
      // Create the order first
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: order.customer_id,
          product_name: order.product_name,
          quantity: order.quantity,
          order_date: order.order_date || new Date().toISOString()
        })
        .select()
        .single()

      if (orderError) {
        throw orderError
      }

      // Decrement product stock using RPC function (has elevated permissions)
      if (order.product_id) {
        console.log(`📦 Decrementing stock for product ${order.product_id} by ${order.quantity}`)
        
        const { data: stockResult, error: stockError } = await supabase
          .rpc('decrement_product_stock', {
            p_product_id: order.product_id,
            p_quantity: order.quantity
          })

        if (stockError) {
          console.error('❌ Error calling decrement_product_stock:', stockError)
          // Order was created but stock update failed
          console.warn('⚠️ Order created but stock was not decremented. Order ID:', orderData.id)
          return { 
            data: orderData, 
            error: { 
              message: 'Order created but stock update failed. Please contact admin.',
              stockUpdateError: stockError 
            } 
          }
        }

        // Check if the RPC function returned success
        if (stockResult && !stockResult.success) {
          console.error('❌ Stock decrement failed:', stockResult.error)
          return { 
            data: orderData, 
            error: { 
              message: stockResult.error || 'Stock update failed',
              stockUpdateError: stockResult 
            } 
          }
        }

        console.log(`✅ Stock decremented successfully:`, stockResult)
      } else {
        console.warn('⚠️ No product_id provided, stock was not decremented')
      }

      return { data: orderData, error: null }
    } catch (error) {
      console.error('❌ Error creating order:', error)
      return { data: null, error }
    }
  },

  // Update an order
  async updateOrder(id, updates) {
    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // Delete an order
  async deleteOrder(id) {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id)
    return { error }
  }
}

