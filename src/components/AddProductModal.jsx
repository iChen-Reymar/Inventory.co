import { useState, useEffect } from 'react'

function AddProductModal({ isOpen, onClose, onAddProduct, editingProduct, categories = [] }) {
  const [formData, setFormData] = useState({
    name: '',
    stock: '',
    price: '',
    category: '',
    image: ''
  })

  // Default product images
  const defaultImages = [
    { name: 'Base Guitar', path: '/images/Fender-P-Bass-electric-guitar.webp' },
    { name: 'Acoustic Guitar', path: '/images/cac23fb4865901db2c1ba83534e45ee1.jpg_720x720q80.jpg' },
    { name: 'Piano Keyboard', path: '/images/products_2FF03-097-1910-032_2FF03-097-1910-032_1719213023050_1200x1200 (1).webp' },
    { name: 'Electric Guitar', path: '/images/V6MRLB.webp' },
    { name: 'Drum', path: '/images/drum-kit-standard.eb6cdcf0e2d2b6c360fb.png' }
  ]

  // Get default image based on category name
  const getDefaultImageForCategory = (categoryName) => {
    if (!categoryName) return defaultImages[0].path
    const found = defaultImages.find(img => 
      categoryName.toLowerCase().includes(img.name.toLowerCase().split(' ')[0])
    )
    return found ? found.path : defaultImages[0].path
  }

  // Get category image if available
  const getCategoryImage = (categoryName) => {
    if (!categoryName || !categories.length) return null
    const category = categories.find(cat => cat.name === categoryName)
    return category?.image || null
  }

  // Update form when editing product changes
  useEffect(() => {
    if (editingProduct) {
      setFormData({
        name: editingProduct.name || '',
        stock: editingProduct.stock || '',
        price: editingProduct.price || '',
        category: editingProduct.category_name || editingProduct.category || '',
        image: editingProduct.image || ''
      })
    } else {
      setFormData({
        name: '',
        stock: '',
        price: '',
        category: '',
        image: ''
      })
    }
  }, [editingProduct, isOpen])

  // Auto-select image when category changes
  useEffect(() => {
    if (formData.category && !formData.image && !editingProduct) {
      // First try to get image from category
      const categoryImg = getCategoryImage(formData.category)
      if (categoryImg) {
        setFormData(prev => ({ ...prev, image: categoryImg }))
      } else {
        // Fallback to default image based on category name
        const defaultImg = getDefaultImageForCategory(formData.category)
        setFormData(prev => ({ ...prev, image: defaultImg }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.category])

  // Get category names from categories array or use defaults
  const categoryNames = categories.length > 0 
    ? categories.map(cat => cat.name)
    : ['Base Guitar', 'Acoustic Guitar', 'Piano Keyboard', 'Electric Guitar', 'Drum']

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleImageSelect = (imagePath) => {
    setFormData({
      ...formData,
      image: imagePath
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (formData.name && formData.stock && formData.category) {
      // Use selected image, or get from category, or use default
      const finalImage = formData.image || 
                        getCategoryImage(formData.category) || 
                        getDefaultImageForCategory(formData.category)
      
      onAddProduct({
        ...formData,
        stock: parseInt(formData.stock),
        price: parseFloat(formData.price) || 0,
        image: finalImage
      })
      // Reset form
      setFormData({
        name: '',
        stock: '',
        price: '',
        category: '',
        image: ''
      })
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            {editingProduct ? 'Edit Product' : 'Add Product'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          <div className="space-y-4">
            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter product name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-blue"
                required
              />
            </div>

            {/* Stock/Items */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock/Items *
              </label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                placeholder="Enter stock quantity"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-blue"
                required
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price *
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="Enter price (e.g., 99.99)"
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-blue"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-blue"
                required
              >
                <option value="">Select a category</option>
                {categoryNames.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Image Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Image
              </label>
              
              {/* Image URL Input */}
              <input
                type="text"
                name="image"
                value={formData.image}
                onChange={handleChange}
                placeholder="Enter image URL or select from defaults"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-blue mb-3"
              />

              {/* Image Preview */}
              {formData.image && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-2">Preview:</p>
                  <div className="w-24 h-24 rounded-lg overflow-hidden border border-gray-300">
                    <img
                      src={formData.image}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.parentElement.innerHTML = '<div class="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-400">Invalid</div>'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Default Images Selection */}
              <div>
                <p className="text-xs text-gray-500 mb-2">Or select from defaults:</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {defaultImages.map((img, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleImageSelect(img.path)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        formData.image === img.path
                          ? 'border-primary-blue ring-2 ring-primary-blue ring-offset-2'
                          : 'border-gray-300 hover:border-primary-blue'
                      }`}
                      title={img.name}
                    >
                      <img
                        src={img.path}
                        alt={img.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = `https://via.placeholder.com/64x64?text=${img.name.charAt(0)}`
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-[#357abd] transition-colors"
            >
              {editingProduct ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddProductModal

