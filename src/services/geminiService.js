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
      const models = data.models?.map(m => m.name?.replace('models/', '')) || []
      console.log('📋 Available models:', models)
      return models
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
    
    // FREE TIER ONLY - Use flash models, NOT gemini-pro
    // Free tier supports: gemini-1.5-flash-latest, gemini-1.5-flash
    const preferredModels = ['gemini-1.5-flash-latest', 'gemini-1.5-flash'] // Removed gemini-pro
    
    // Filter to only models that are available (if we got the list)
    const modelsToTry = availableModels.length > 0 
      ? preferredModels.filter(m => availableModels.some(am => am.includes(m.replace('-latest', ''))))
      : preferredModels
    
    const modelName = modelsToTry[0] || 'gemini-1.5-flash-latest'
    model = genAI.getGenerativeModel({ model: modelName })
    console.log(`✅ Initialized Gemini model: ${modelName} (Free tier - Flash models only)`)
    if (availableModels.length > 0) {
      console.log(`📋 Available models for your API key: ${availableModels.slice(0, 5).join(', ')}`)
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
    // For customers: provide product availability information
    try {
      const { data: products } = await productService.getAllProducts()
      if (products && products.length > 0) {
        const availableProducts = products.filter(p => p.stock > 0 && p.status === 'Active')
        const outOfStock = products.filter(p => p.stock === 0)
        
        context = `You are a helpful customer service assistant for an inventory management system. 
        
Current Product Information:
- Total Products: ${products.length}
- Available Products: ${availableProducts.length}
- Out of Stock: ${outOfStock.length}

Available Products:
${availableProducts.slice(0, 20).map(p => `- ${p.name}: ${p.stock} in stock, Price: ₱${parseFloat(p.price || 0).toFixed(2)}`).join('\n')}

${outOfStock.length > 0 ? `\nOut of Stock Products:\n${outOfStock.slice(0, 10).map(p => `- ${p.name}`).join('\n')}` : ''}

Your role: Help customers find products, check availability, answer questions about products, and provide friendly, human-like responses. Be conversational and helpful.`
      }
    } catch (error) {
      console.error('Error fetching products for context:', error)
    }
  } else {
    // For Admin/Staff: provide system insights
    try {
      const { data: products } = await productService.getAllProducts()
      const { data: orders } = await orderService.getAllOrders()
      
      if (products && products.length > 0) {
        const lowStock = products.filter(p => p.stock > 0 && p.stock <= 5)
        const outOfStock = products.filter(p => p.stock === 0)
        const highStock = products.filter(p => p.stock > 10)
        
        // Calculate most ordered products
        const productOrderCounts = {}
        if (orders && orders.length > 0) {
          orders.forEach(order => {
            const productName = order.product_name || 'Unknown'
            productOrderCounts[productName] = (productOrderCounts[productName] || 0) + (order.quantity || 1)
          })
        }
        
        const topProducts = Object.entries(productOrderCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => `${name} (${count} orders)`)
        
        context = `You are an intelligent assistant for inventory management system administrators and staff.

System Overview:
- Total Products: ${products.length}
- Low Stock (≤5 items): ${lowStock.length} products
- Out of Stock: ${outOfStock.length} products
- Well Stocked (>10 items): ${highStock.length} products

Low Stock Products:
${lowStock.slice(0, 10).map(p => `- ${p.name}: ${p.stock} remaining`).join('\n')}

${outOfStock.length > 0 ? `Out of Stock Products:\n${outOfStock.slice(0, 10).map(p => `- ${p.name}`).join('\n')}\n` : ''}

${topProducts.length > 0 ? `Highly Demanded Products:\n${topProducts.join('\n')}\n` : ''}

Your role: Help staff and admins understand system status, identify issues (low stock, high demand), provide insights, and answer questions about inventory management. Be professional but conversational.`
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

      // Get system context
      const systemContext = await getSystemContext(userRole, productService, orderService)

      // Build the full prompt with system context
      const fullPrompt = systemContext 
        ? `${systemContext}\n\nUser: ${userMessage}\n\nAssistant:`
        : `User: ${userMessage}\n\nAssistant:`

      // FREE TIER ONLY - Use flash models, NOT gemini-pro
      // Order: gemini-1.5-flash-latest > gemini-1.5-flash
      let modelNames = ['gemini-1.5-flash-latest', 'gemini-1.5-flash'] // Removed gemini-pro for free tier
      
      // If we have available models list, prioritize those (flash models only)
      if (availableModels && availableModels.length > 0) {
        const flashLatest = availableModels.find(m => m.includes('flash') && m.includes('latest'))
        const flash = availableModels.find(m => m.includes('flash') && !m.includes('latest'))
        
        modelNames = []
        if (flashLatest) modelNames.push(flashLatest.replace('models/', ''))
        if (flash) modelNames.push(flash.replace('models/', ''))
        
        // Add fallbacks (flash models only)
        if (!modelNames.includes('gemini-1.5-flash-latest')) modelNames.push('gemini-1.5-flash-latest')
        if (!modelNames.includes('gemini-1.5-flash')) modelNames.push('gemini-1.5-flash')
      }
      
      let lastError = null
      
      // Start with existing model if available
      if (model) {
        modelNames.unshift('existing')
      }
      
      for (const modelName of modelNames) {
        let currentModel
        
        if (modelName === 'existing' && model) {
          currentModel = model
          console.log(`🔄 Trying existing model...`)
        } else {
          currentModel = genAI.getGenerativeModel({ model: modelName })
          console.log(`🔄 Trying model: ${modelName}`)
        }
        
        try {
          console.log(`📤 Sending request to ${modelName === 'existing' ? 'existing' : modelName}...`)
          console.log(`📝 Prompt length: ${fullPrompt.length} characters`)
          
          const result = await currentModel.generateContent(fullPrompt)
          const response = await result.response
          const text = response.text()

          // Success! Save model for future calls
          model = currentModel
          console.log(`✅ Successfully got response from ${modelName === 'existing' ? 'existing' : modelName}`)
          console.log(`📥 Response length: ${text.length} characters`)
          
          return { data: text, error: null }
        } catch (modelError) {
          console.warn(`⚠️ Model ${modelName === 'existing' ? 'existing' : modelName} failed:`, modelError.message)
          lastError = modelError
          
          // If existing model failed, reset it
          if (modelName === 'existing') {
            model = null
          }
          
          // Try next model
          continue
        }
      }
      
      // All models failed
      model = null
      const errorMsg = lastError?.message?.toLowerCase() || ''
      
      if (errorMsg.includes('404') || errorMsg.includes('not found')) {
        throw new Error(`None of the models work with your API key (404 errors).\n\nPlease check:\n1. Your API key is valid and active in Google AI Studio\n2. Your API key has access to Gemini API\n3. Try regenerating your API key\n4. Check API key restrictions in Google AI Studio\n\nTried models: ${modelNames.filter(m => m !== 'existing').join(', ')}\n\nIf available models were detected, they are shown in the console above.`)
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
          errorMessage = `Model not found (404). Free tier requires flash models. Please check:\n1. Your API key is valid and active\n2. Your API key has access to Gemini API\n3. You're using a free tier API key (not restricted)\n4. Try regenerating your API key in Google AI Studio\n\nNote: Free tier only supports flash models, not gemini-pro`
        } else if (errorMsg.includes('403') || errorMsg.includes('permission') || errorMsg.includes('forbidden')) {
          errorMessage = 'API access denied (403). Please check:\n1. Your API key is valid\n2. Your API key has proper permissions\n3. Your API key hasn\'t been restricted'
        } else if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('rate limit')) {
          errorMessage = 'API quota exceeded (429). Please:\n1. Wait a few minutes\n2. Check your usage in Google AI Studio\n3. Consider upgrading if needed'
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
