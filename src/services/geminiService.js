// Gemini AI Service for Chatbot
// Note: Install @google/generative-ai package: npm install @google/generative-ai

let genAI = null
let model = null
let availableModels = null

// List available models
const listAvailableModels = async () => {
  try {
    if (!genAI) return []
    
    // Try to fetch available models
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ''
    if (!apiKey) return []
    
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey)
    if (response.ok) {
      const data = await response.json()
      // Return full model objects with name and supported methods
      const models = data.models?.map(m => ({
        name: m.name?.replace('models/', ''),
        fullName: m.name,
        supportedMethods: m.supportedGenerationMethods || []
      })) || []
      console.log('📋 Available models:', models.map(m => m.name))
      return models
    } else {
      console.warn(`⚠️ Could not fetch models list: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.warn('⚠️ Could not fetch available models:', error.message)
  }
  return []
}

// Initialize Gemini (lazy loading)
const initializeGemini = async () => {
  try {
    // Dynamic import to handle missing package gracefully
    const module = await import('@google/generative-ai')
    const { GoogleGenerativeAI } = module
    
    // Check API key
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ''
    console.log('🔍 Checking API key...', {
      hasKey: !!apiKey,
      keyLength: apiKey.length,
      keyPreview: apiKey ? `${apiKey.substring(0, 10)}...` : 'none',
      allEnvVars: Object.keys(import.meta.env).filter(k => k.includes('GEMINI'))
    })
    
    if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '') {
      console.error('❌ Gemini API key not found!')
      console.error('Please add VITE_GEMINI_API_KEY=your_key to your .env file')
      console.error('Then restart your dev server with: npm run dev')
      return { model: null, error: 'API key not configured. Check console for details.' }
    }

    console.log('✅ API key found, initializing Gemini...')
    genAI = new GoogleGenerativeAI(apiKey)
    
    // Try to get available models
    availableModels = await listAvailableModels()
    
    // Find a suitable model that supports generateContent
    let modelName = null
    
    // Preferred model names for free tier (in order of preference)
    // Prioritize stable models over experimental ones to avoid quota issues
    const preferredModels = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-flash-latest',
      'gemini-2.0-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-2.5-flash-lite',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash'
    ]
    
    // First, try to find a model from the available models list
    if (availableModels.length > 0) {
      console.log(`📋 Found ${availableModels.length} available models`)
      
      // Filter models that support generateContent
      const supportedModels = availableModels.filter(m => 
        m.supportedMethods?.includes('generateContent') || 
        m.supportedMethods?.length === 0 // Some models might not list methods
      )
      
      if (supportedModels.length > 0) {
        // Try to find a flash model first (free tier)
        for (const preferred of preferredModels) {
          const found = supportedModels.find(m => 
            m.name === preferred || 
            m.name.includes('flash') && m.name.includes(preferred.replace('gemini-', '').split('-')[0])
          )
          if (found) {
            modelName = found.name
            break
          }
        }
        
        // If no preferred model found, use the first flash model
        if (!modelName) {
          const flashModel = supportedModels.find(m => m.name.includes('flash'))
          if (flashModel) {
            modelName = flashModel.name
          }
        }
        
        // If still no model, use the first available one
        if (!modelName && supportedModels.length > 0) {
          modelName = supportedModels[0].name
        }
      }
    }
    
    // Fallback: use a default model name if list didn't provide one
    // The actual validation will happen when we try to use it
    if (!modelName) {
      console.log('⚠️ Could not determine model from list, using fallback...')
      modelName = 'gemini-2.5-flash' // Common free tier model (avoid exp models)
      console.log(`⚠️ Using fallback model: ${modelName} (will be validated on first use)`)
    }
    
    // Create the model instance
    model = genAI.getGenerativeModel({ model: modelName })
    console.log(`✅ Initialized Gemini model: ${modelName}`)
    if (availableModels.length > 0) {
      console.log(`📋 All available models: ${availableModels.slice(0, 10).map(m => m.name).join(', ')}`)
    }
    
    return { model, error: null }
  } catch (error) {
    console.error('❌ Error initializing Gemini:', error)
    console.error('Full error:', error)
    console.warn('Make sure to install: npm install @google/generative-ai')
    return { model: null, error: error.message || 'Failed to initialize Gemini' }
  }
}

// Get system context based on user role
const getSystemContext = async (userRole, productService, orderService) => {
  let context = ''

  if (userRole === 'Customer') {
    // For customers: provide product availability information only
    try {
      const { data: products } = await productService.getAllProducts()
      if (products && products.length > 0) {
        // Only show available products (stock > 0 and status = Active)
        const availableProducts = products.filter(p => p.stock > 0 && p.status === 'Active')
        
        context = `You are a helpful customer service assistant for an inventory management system. 

IMPORTANT RULES:
- You can ONLY answer questions about AVAILABLE PRODUCTS (products with stock > 0 and status = 'Active')
- You CANNOT provide information about low stock items, out of stock items, or system statistics
- You CANNOT access or discuss order history, system performance, or inventory management details
- Keep your responses friendly, helpful, and focused on helping customers find products they can purchase

Current Available Products (${availableProducts.length} products in stock):
${availableProducts.slice(0, 30).map(p => `- ${p.name}: ${p.stock} in stock, Price: ₱${parseFloat(p.price || 0).toFixed(2)}${p.category_name ? `, Category: ${p.category_name}` : ''}`).join('\n')}
${availableProducts.length > 30 ? `\n... and ${availableProducts.length - 30} more products available` : ''}

Your role: Help customers find available products, check product availability, answer questions about products they can purchase, and provide friendly, conversational responses. Only discuss products that are currently available for purchase.`
      }
    } catch (error) {
      console.error('Error fetching products for context:', error)
    }
  } else {
    // For Admin/Staff: provide comprehensive system insights
    try {
      const { data: products } = await productService.getAllProducts()
      const { data: orders } = await orderService.getAllOrders()
      
      if (products && products.length > 0) {
        const lowStock = products.filter(p => p.stock > 0 && p.stock <= 5)
        const outOfStock = products.filter(p => p.stock === 0)
        const highStock = products.filter(p => p.stock > 10)
        const availableProducts = products.filter(p => p.stock > 0 && p.status === 'Active')
        
        // Calculate most ordered products (highly demanded)
        const productOrderCounts = {}
        if (orders && orders.length > 0) {
          orders.forEach(order => {
            const productName = order.product_name || 'Unknown'
            productOrderCounts[productName] = (productOrderCounts[productName] || 0) + (order.quantity || 1)
          })
        }
        
        const topProducts = Object.entries(productOrderCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([name, count]) => `${name} (${count} orders)`)
        
        // Calculate total revenue from orders
        let totalRevenue = 0
        if (orders && orders.length > 0) {
          orders.forEach(order => {
            const product = products.find(p => p.name === order.product_name)
            if (product) {
              totalRevenue += parseFloat(product.price || 0) * (order.quantity || 1)
            }
          })
        }
        
        context = `You are an intelligent assistant for inventory management system administrators and staff.

You have access to comprehensive system information and can help with:
- Low stock alerts and recommendations
- Highly demanded products analysis
- Out of stock items that need restocking
- System statistics and insights
- Product performance analysis
- Order trends and patterns

System Overview:
- Total Products: ${products.length}
- Available Products (in stock): ${availableProducts.length}
- Low Stock (≤5 items): ${lowStock.length} products
- Out of Stock: ${outOfStock.length} products
- Well Stocked (>10 items): ${highStock.length} products
- Total Orders: ${orders?.length || 0}
- Estimated Revenue: ₱${totalRevenue.toFixed(2)}

Low Stock Products (Need Attention):
${lowStock.slice(0, 15).map(p => `- ${p.name}: ${p.stock} remaining, Price: ₱${parseFloat(p.price || 0).toFixed(2)}${p.category_name ? `, Category: ${p.category_name}` : ''}`).join('\n')}
${lowStock.length > 15 ? `\n... and ${lowStock.length - 15} more low stock items` : ''}

${outOfStock.length > 0 ? `Out of Stock Products (Need Restocking):\n${outOfStock.slice(0, 15).map(p => `- ${p.name}: Out of stock, Price: ₱${parseFloat(p.price || 0).toFixed(2)}${p.category_name ? `, Category: ${p.category_name}` : ''}`).join('\n')}\n${outOfStock.length > 15 ? `... and ${outOfStock.length - 15} more out of stock items\n` : ''}` : ''}

${topProducts.length > 0 ? `Highly Demanded Products (Top Orders):\n${topProducts.join('\n')}\n` : ''}

Your role: Help staff and admins understand system status, identify issues (low stock, high demand), provide insights, answer questions about inventory management, and suggest actions to improve the inventory system. Be professional, analytical, and helpful.`
      }
    } catch (error) {
      console.error('Error fetching system data for context:', error)
    }
  }

  return context
}

export const geminiService = {
  async sendMessage(userMessage, userRole, conversationHistory = [], productService, orderService) {
    try {
      // Initialize Gemini if not already done
      if (!model) {
        const { model: initializedModel, error: initError } = await initializeGemini()
        if (initError || !initializedModel) {
          return {
            error: initError || 'Gemini AI is not configured. Please add VITE_GEMINI_API_KEY to your .env file and install @google/generative-ai package.'
          }
        }
        model = initializedModel
      }

      // Get system context based on user role
      const systemContext = await getSystemContext(userRole, productService, orderService)

      // Build the full prompt with system context
      const fullPrompt = systemContext 
        ? `${systemContext}\n\nUser: ${userMessage}\n\nAssistant:`
        : `User: ${userMessage}\n\nAssistant:`

      // Preferred models (prioritize stable models over experimental to avoid quota issues)
      const preferredModels = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-flash-latest',
        'gemini-2.0-flash-lite',
        'gemini-flash-lite-latest',
        'gemini-2.5-flash-lite',
        'gemini-1.5-flash-latest',
        'gemini-1.5-flash'
      ]
      
      // Get list of models to try (avoid exp models first)
      const getModelsToTry = () => {
        const modelsToTry = []
        
        // Start with existing model if available
        if (model) {
          modelsToTry.push({ name: 'existing', model: model })
        }
        
        if (availableModels && availableModels.length > 0) {
          const supportedModels = availableModels.filter(m => 
            m.supportedMethods?.includes('generateContent') || 
            m.supportedMethods?.length === 0
          )
          
          // First, add non-experimental preferred models
          for (const preferred of preferredModels) {
            const found = supportedModels.find(m => 
              m.name === preferred && 
              !m.name.includes('-exp') && 
              !m.name.includes('experimental') &&
              !modelsToTry.some(mt => mt.name === m.name)
            )
            if (found) {
              modelsToTry.push({ name: found.name })
            }
          }
          
          // Then add any flash models (avoiding duplicates)
          const flashModels = supportedModels.filter(m => 
            m.name.includes('flash') && 
            !modelsToTry.some(mt => mt.name === m.name)
          )
          for (const flashModel of flashModels) {
            modelsToTry.push({ name: flashModel.name })
          }
        } else {
          // Fallback if no available models list
          for (const preferred of preferredModels) {
            if (!preferred.includes('-exp')) {
              modelsToTry.push({ name: preferred })
            }
          }
        }
        
        return modelsToTry
      }
      
      const modelsToTry = getModelsToTry()
      let lastError = null
      let triedModels = []
      
      // Try each model until one works
      for (let i = 0; i < modelsToTry.length; i++) {
        const modelToTry = modelsToTry[i]
        let currentModel = null
        let currentModelName = null
        
        try {
          if (modelToTry.model) {
            currentModel = modelToTry.model
            currentModelName = 'existing'
            console.log(`🔄 Trying existing model instance...`)
          } else {
            currentModelName = modelToTry.name
            currentModel = genAI.getGenerativeModel({ model: currentModelName })
            console.log(`🔄 Trying model: ${currentModelName}`)
          }
          
          triedModels.push(currentModelName)
          
          console.log(`📤 Sending request to Gemini API...`)
          console.log(`📝 Prompt length: ${fullPrompt.length} characters`)
          
          const result = await currentModel.generateContent(fullPrompt)
          const response = await result.response
          const text = response.text()

          // Success! Save model for future calls
          model = currentModel
          console.log(`✅ Successfully got response from Gemini using ${currentModelName}`)
          console.log(`📥 Response length: ${text.length} characters`)
          
          return { data: text, error: null }
        } catch (modelError) {
          console.warn(`⚠️ Model ${currentModelName || 'unknown'} failed:`, modelError.message)
          lastError = modelError
          
          const errorMsg = modelError?.message?.toLowerCase() || ''
          
          // If it's a quota error (429) or 404, try next model
          if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('rate limit') ||
              errorMsg.includes('404') || errorMsg.includes('not found')) {
            console.log(`🔄 ${errorMsg.includes('429') ? 'Quota exceeded' : 'Model not found'} for ${currentModelName}, trying next model...`)
            // Continue to next model
            continue
          }
          
          // For other errors, only try one more time
          if (i < modelsToTry.length - 1) {
            continue
          }
        }
      }
      
      // All models failed
      model = null
      const errorMsg = lastError?.message?.toLowerCase() || ''
      const availableModelNames = availableModels && availableModels.length > 0
        ? availableModels.map(m => m.name).join(', ')
        : '(check browser console for available models)'
      
      if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('rate limit')) {
        throw new Error(`All available models have exceeded quota limits (429).\n\nTried models: ${triedModels.join(', ')}\n\nAvailable models: ${availableModelNames}\n\nPlease:\n1. Wait a few minutes and try again\n2. Check your usage in Google AI Studio\n3. Consider using a different API key or upgrading your plan`)
      }
      
      if (errorMsg.includes('404') || errorMsg.includes('not found')) {
        throw new Error(`Model not found (404). Tried multiple models but none worked.\n\nTried models: ${triedModels.join(', ')}\n\nAvailable models: ${availableModelNames}\n\nPlease check:\n1. Your API key is valid and active in Google AI Studio\n2. Your API key has access to Gemini API\n3. Try regenerating your API key in Google AI Studio`)
      }
      
      throw lastError || new Error('All model attempts failed')
    } catch (error) {
      console.error('Error calling Gemini API:', error)
      
      // Provide more helpful error messages
      let errorMessage = 'Failed to get response from AI. Please try again.'
      
      if (error.message) {
        const errorMsg = error.message.toLowerCase()
        console.error('🔍 Analyzing error:', errorMsg)
        
        if (errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('model')) {
          const availableModelNames = availableModels && availableModels.length > 0
            ? `\n\nAvailable models for your API key:\n${availableModels.map(m => `- ${m.name}`).join('\n')}`
            : '\n\nCheck the browser console (F12) for the list of available models.'
          
          errorMessage = `Model not found (404). The selected model is not available for your API key.${availableModelNames}\n\nPlease check:\n1. Your API key is valid and active in Google AI Studio\n2. Your API key has access to Gemini API\n3. Try regenerating your API key in Google AI Studio\n4. Check the browser console (F12) for detailed model information`
        } else if (errorMsg.includes('403') || errorMsg.includes('permission') || errorMsg.includes('forbidden')) {
          errorMessage = 'API access denied (403). Please check:\n1. Your API key is valid\n2. Your API key has proper permissions\n3. Your API key hasn\'t been restricted'
        } else if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('rate limit')) {
          const availableModelNames = availableModels && availableModels.length > 0
            ? `\n\nAvailable models: ${availableModels.map(m => m.name).join(', ')}`
            : ''
          errorMessage = `API quota exceeded (429). The code will automatically try other available models.\n\nPlease:\n1. Wait a few minutes and try again\n2. Check your usage in Google AI Studio\n3. Consider upgrading if needed${availableModelNames}`
        } else if (errorMsg.includes('api key') || errorMsg.includes('invalid') || errorMsg.includes('401')) {
          errorMessage = `Invalid API key (401). Please check:\n1. Your VITE_GEMINI_API_KEY in .env file\n2. No extra spaces or quotes around the key\n3. You've restarted the dev server\n4. The key is correct from Google AI Studio`
        } else {
          errorMessage = `Error: ${error.message}\n\nCheck the browser console (F12) for more details.`
        }
      }
      
      return {
        error: errorMessage
      }
    }
  },

  // Check if Gemini is configured
  isConfigured() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ''
    const isConfigured = !!(apiKey && apiKey !== 'your_gemini_api_key_here' && apiKey !== '' && apiKey.trim() !== '')
    
    if (!isConfigured) {
      console.warn('⚠️ Gemini API key not found!')
      console.warn('Current env check:', {
        apiKey: apiKey || '(empty)',
        length: apiKey.length,
        allViteEnvKeys: Object.keys(import.meta.env).filter(k => k.startsWith('VITE_'))
      })
      console.warn('Please add VITE_GEMINI_API_KEY=your_key to .env file and restart dev server')
    } else {
      console.log('✅ Gemini API key found:', apiKey.substring(0, 15) + '...' + apiKey.substring(apiKey.length - 5))
    }
    
    return isConfigured
  },

  // Test API connection
  async testConnection() {
    try {
      if (!this.isConfigured()) {
        return { success: false, error: 'API key not configured' }
      }

      const { model: testModel, error: initError } = await initializeGemini()
      if (initError || !testModel) {
        return { success: false, error: initError || 'Failed to initialize model' }
      }

      // Try a simple test call
      const result = await testModel.generateContent('Say "Hello" if you can hear me.')
      const response = await result.response
      const text = response.text()

      return { success: true, message: text }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}

