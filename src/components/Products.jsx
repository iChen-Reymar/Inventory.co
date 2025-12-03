import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Layout from './Layout'
import AddProductModal from './AddProductModal'
import OrderModal from './OrderModal'
import { useAuth } from '../contexts/AuthContext'
import { productService } from '../services/productService'
import { categoryService } from '../services/categoryService'

function Products() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const categoryFilter = searchParams.get('category')
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const { user, isAdmin, isStaff } = useAuth()
  
  // Check if user is a customer (not admin or staff)
  const isCustomer = () => {
    return !isAdmin() && !isStaff()
  }

  // Fetch products and categories from database
  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  // Filter products when category filter or search query changes
  useEffect(() => {
    let filtered = [...products]

    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter(
        p => p.category_name === categoryFilter || p.category === categoryFilter
      )
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(product => {
        const name = (product.name || '').toLowerCase()
        const category = (product.category_name || product.category || '').toLowerCase()
        const status = (product.status || '').toLowerCase()
        
        return name.includes(query) || 
               category.includes(query) || 
               status.includes(query) ||
               (product.stock && product.stock.toString().includes(query))
      })
    }

    setFilteredProducts(filtered)
  }, [categoryFilter, products, searchQuery])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const { data, error } = await productService.getAllProducts()
      if (error) throw error
      setProducts(data || [])
      setFilteredProducts(data || [])
    } catch (err) {
      console.error('Error fetching products:', err)
      setProducts([])
      setFilteredProducts([])
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await categoryService.getAllCategories()
      if (error) throw error
      setCategories(data || [])
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-primary-blue text-white'
      case 'Low stock':
        return 'bg-black text-white'
      case 'Sold':
        return 'bg-gray-300 text-gray-700'
      default:
        return 'bg-gray-200 text-gray-700'
    }
  }

  const getStatusFromStock = (stock) => {
    if (stock === 0) return 'Sold'
    if (stock <= 2) return 'Low stock'
    return 'Active'
  }

  const handleAddProduct = async (newProduct) => {
    try {
      // Find category by name
      const category = categories.find(cat => cat.name === newProduct.category)
      
      const { data, error } = await productService.createProduct({
        name: newProduct.name,
        stock: newProduct.stock,
        price: newProduct.price || 0,
        category_id: category?.id,
        category_name: newProduct.category,
        image: newProduct.image || null
      })
      
      if (error) throw error
      await fetchProducts()
    } catch (err) {
      console.error('Error adding product:', err)
      alert('Failed to add product. Please try again.')
    }
  }

  const handleEditProduct = (product) => {
    setEditingProduct(product)
    setIsModalOpen(true)
  }

  const handleUpdateProduct = async (updatedProduct) => {
    try {
      const category = categories.find(cat => cat.name === updatedProduct.category)
      
      const { error } = await productService.updateProduct(editingProduct.id, {
        name: updatedProduct.name,
        stock: updatedProduct.stock,
        price: updatedProduct.price || 0,
        category_id: category?.id,
        category_name: updatedProduct.category,
        image: updatedProduct.image || null
      })
      
      if (error) throw error
      setEditingProduct(null)
      await fetchProducts()
    } catch (err) {
      console.error('Error updating product:', err)
      alert('Failed to update product. Please try again.')
    }
  }

  const handleDeleteProduct = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    
    try {
      const { error } = await productService.deleteProduct(productId)
      if (error) throw error
      await fetchProducts()
    } catch (err) {
      console.error('Error deleting product:', err)
      alert('Failed to delete product. Please try again.')
    }
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingProduct(null)
  }

  const handleProductSubmit = (productData) => {
    if (editingProduct) {
      handleUpdateProduct(productData)
    } else {
      handleAddProduct(productData)
    }
    handleModalClose()
  }

  return (
    <Layout pageTitle="product">
      <AddProductModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onAddProduct={handleProductSubmit}
        editingProduct={editingProduct}
        categories={categories}
      />
      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onOrderPlaced={fetchProducts}
        user={user}
      />
      <div className="p-6">
        {/* Page Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {categoryFilter ? `Products - ${categoryFilter}` : 'Products'}
            </h1>
            {categoryFilter && (
              <button
                onClick={() => navigate('/products', { replace: true })}
                className="text-sm text-primary-blue hover:underline mt-1"
              >
                ← Show all products
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-blue w-64"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Clear search"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <svg
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <div className="flex items-center gap-3">
              {/* Add Product Button - For Admins and Staff */}
              {(isAdmin() || isStaff()) && (
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 bg-primary-blue text-white rounded-lg font-medium hover:bg-[#357abd] transition-colors"
                >
                  + Add product
                </button>
              )}
              
              {/* Place Order Button - For Customers Only */}
              {isCustomer() && (
                <button 
                  onClick={() => setIsOrderModalOpen(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  🛒 Place Order
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-4 px-6 text-gray-600 font-semibold">Name of product</th>
                  <th className="text-left py-4 px-6 text-gray-600 font-semibold">Status</th>
                  <th className="text-left py-4 px-6 text-gray-600 font-semibold">Price</th>
                  <th className="text-left py-4 px-6 text-gray-600 font-semibold">Stock info</th>
                  <th className="text-left py-4 px-6 text-gray-600 font-semibold">Categories</th>
                  {(isAdmin() || isStaff()) && (
                    <th className="text-left py-4 px-6 text-gray-600 font-semibold">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-400">
                      Loading products...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-400">
                      {searchQuery 
                        ? `No products found matching "${searchQuery}"`
                        : categoryFilter 
                          ? `No products found in ${categoryFilter} category`
                          : 'No products found'
                      }
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                            <img
                              src={product.image || '/images/Fender-P-Bass-electric-guitar.webp'}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src = `https://via.placeholder.com/48x48?text=${product.name.charAt(0)}`
                              }}
                            />
                          </div>
                          <span className="font-medium text-gray-900">{product.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(product.status)}`}>
                          {product.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-900 font-semibold">
                        ₱{parseFloat(product.price || 0).toFixed(2)}
                      </td>
                      <td className="py-4 px-6 text-gray-600">
                        {product.stock} in Stock
                      </td>
                      <td className="py-4 px-6 text-gray-600">
                        {product.category_name || product.category}
                      </td>
                      {(isAdmin() || isStaff()) && (
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditProduct(product)}
                              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                              title="Edit"
                            >
                              Edit
                            </button>
                            {isAdmin() && (
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                                title="Delete"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Products

