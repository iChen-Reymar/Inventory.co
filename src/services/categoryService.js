import { supabase } from '../lib/supabase'

export const categoryService = {
  // Get all categories
  async getAllCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true })
    return { data, error }
  },

  // Get category by ID
  async getCategoryById(id) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  // Create a new category
  async createCategory(category) {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: category.name,
        image: category.image || null,
        item_count: category.itemCount || 0
      })
      .select()
      .single()
    return { data, error }
  },

  // Update a category
  async updateCategory(id, updates) {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // Delete a category
  async deleteCategory(id) {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
    return { error }
  },

  // Update item count for a category
  async updateItemCount(categoryId, count) {
    const { data, error } = await supabase
      .from('categories')
      .update({ item_count: count })
      .eq('id', categoryId)
      .select()
      .single()
    return { data, error }
  },

  // Recalculate item count for a category based on actual products
  async recalculateItemCount(categoryId) {
    try {
      // Count products in this category
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId)

      if (error) throw error

      // Update the category with the actual count
      const { data, error: updateError } = await supabase
        .from('categories')
        .update({ item_count: count || 0 })
        .eq('id', categoryId)
        .select()
        .single()

      return { data, error: updateError }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  // Recalculate item counts for all categories
  async recalculateAllItemCounts() {
    try {
      // Get all categories
      const { data: categories, error: categoriesError } = await this.getAllCategories()
      if (categoriesError) throw categoriesError

      // Recalculate each category
      const updates = await Promise.all(
        categories.map(async (category) => {
          const { count, error } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id)

          if (error) {
            console.error(`Error counting products for category ${category.id}:`, error)
            return null
          }

          return {
            id: category.id,
            item_count: count || 0
          }
        })
      )

      // Update all categories
      const validUpdates = updates.filter(u => u !== null)
      for (const update of validUpdates) {
        await supabase
          .from('categories')
          .update({ item_count: update.item_count })
          .eq('id', update.id)
      }

      return { success: true, error: null }
    } catch (err) {
      return { success: false, error: err }
    }
  }
}

