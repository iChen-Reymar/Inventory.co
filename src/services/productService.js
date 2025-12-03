import { supabase } from '../lib/supabase'
import { categoryService } from './categoryService'

export const productService = {
  // Get all products
  async getAllProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  // Get product by ID
  async getProductById(id) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  // Create a new product
  async createProduct(product) {
    // Get status based on stock
    let status = 'Active'
    if (product.stock === 0) status = 'Sold'
    else if (product.stock <= 2) status = 'Low stock'

    // Get category image if category_id exists
    let image = product.image
    if (product.category_id && !image) {
      const { data: category } = await supabase
        .from('categories')
        .select('image')
        .eq('id', product.category_id)
        .single()
      if (category) image = category.image
    }

    // Insert the product
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: product.name,
        stock: product.stock,
        price: product.price || 0,
        status,
        category_id: product.category_id,
        category_name: product.category_name,
        image: image || null
      })
      .select()
      .single()

    // If product created successfully, increment category item count
    if (data && !error && product.category_id) {
      try {
        // Get current category
        const { data: category } = await categoryService.getCategoryById(product.category_id)
        if (category) {
          // Increment item count
          const newCount = (category.item_count || 0) + 1
          await categoryService.updateItemCount(product.category_id, newCount)
        }
      } catch (err) {
        console.error('Error updating category item count:', err)
        // Don't fail the product creation if category update fails
      }
    }

    return { data, error }
  },

  // Update a product
  async updateProduct(id, updates) {
    // Get the current product to check for category changes
    let oldCategoryId = null
    if (updates.category_id) {
      const { data: currentProduct } = await this.getProductById(id)
      if (currentProduct) {
        oldCategoryId = currentProduct.category_id
      }
    }

    // Auto-update status based on stock if stock is being updated
    if (updates.stock !== undefined) {
      if (updates.stock === 0) updates.status = 'Sold'
      else if (updates.stock <= 2) updates.status = 'Low stock'
      else updates.status = 'Active'
    }

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    // If product updated successfully and category changed, update item counts
    if (data && !error && updates.category_id) {
      try {
        // Decrement old category if it exists and is different
        if (oldCategoryId && oldCategoryId !== updates.category_id) {
          const { data: oldCategory } = await categoryService.getCategoryById(oldCategoryId)
          if (oldCategory) {
            const newCount = Math.max(0, (oldCategory.item_count || 0) - 1)
            await categoryService.updateItemCount(oldCategoryId, newCount)
          }
        }

        // Increment new category
        const { data: newCategory } = await categoryService.getCategoryById(updates.category_id)
        if (newCategory) {
          const newCount = (newCategory.item_count || 0) + 1
          await categoryService.updateItemCount(updates.category_id, newCount)
        }
      } catch (err) {
        console.error('Error updating category item counts:', err)
        // Don't fail the product update if category update fails
      }
    }

    return { data, error }
  },

  // Delete a product
  async deleteProduct(id) {
    // Get the product first to get its category_id
    const { data: product } = await this.getProductById(id)
    
    // Delete the product
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    // If product deleted successfully, decrement category item count
    if (!error && product && product.category_id) {
      try {
        const { data: category } = await categoryService.getCategoryById(product.category_id)
        if (category) {
          // Decrement item count (don't go below 0)
          const newCount = Math.max(0, (category.item_count || 0) - 1)
          await categoryService.updateItemCount(product.category_id, newCount)
        }
      } catch (err) {
        console.error('Error updating category item count:', err)
        // Don't fail the product deletion if category update fails
      }
    }

    return { error }
  }
}

