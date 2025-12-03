import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { geminiService } from '../services/geminiService'
import { productService } from '../services/productService'
import { orderService } from '../services/orderService'

function ChatbotModal({ isOpen, onClose }) {
  const { user, profile, isAdmin, isStaff } = useAuth()
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const userRole = isAdmin() ? 'Admin' : isStaff() ? 'Staff' : 'Customer'

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage = userRole === 'Customer'
        ? "Hello! 👋 I'm your AI assistant. I can help you find products, check availability, and answer questions about our inventory. What would you like to know?"
        : `Hello! 👋 I'm your AI assistant for inventory management. I can help you with system insights, low stock alerts, highly demanded products, and answer questions about the inventory system. What would you like to know?`
      
      setMessages([{
        id: Date.now(),
        role: 'assistant',
        content: welcomeMessage
      }])
    }
  }, [isOpen, userRole])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    
    if (!inputMessage.trim() || loading) return

    // Check if Gemini is configured
    if (!geminiService.isConfigured()) {
      setError('Gemini AI is not configured. Please add VITE_GEMINI_API_KEY to your .env file.')
      return
    }

    const userMsg = inputMessage.trim()
    setInputMessage('')
    setError('')
    setLoading(true)

    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: userMsg
    }
    setMessages(prev => [...prev, userMessage])

    try {
      // Get conversation history (last 10 messages for context)
      const conversationHistory = [...messages, userMessage].slice(-10)

      // Call Gemini service
      const { data, error: geminiError } = await geminiService.sendMessage(
        userMsg,
        userRole,
        conversationHistory.slice(0, -1), // Exclude the current message
        productService,
        orderService
      )

      if (geminiError) {
        // Show detailed error
        console.error('Gemini API Error:', geminiError)
        setError(geminiError)
        
        // Add helpful error message to chat
        const errorMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: `I'm sorry, but I'm having trouble connecting right now. ${geminiError}\n\nPlease check:\n1. Your API key is correct in .env file\n2. You've restarted the dev server after adding the key\n3. Your API key has access to Gemini 1.5 models\n4. You haven't exceeded API quota limits`
        }
        setMessages(prev => [...prev, errorMessage])
        return
      }

      // Add assistant response
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      console.error('Error sending message:', err)
      const errorMsg = err.message || 'Failed to get response. Please try again.'
      setError(errorMsg)
      
      // Add error message to chat
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `I encountered an error: ${errorMsg}\n\nPlease check your API configuration and try again.`
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleClearChat = () => {
    setMessages([])
    setError('')
    // Re-add welcome message
    const welcomeMessage = userRole === 'Customer'
      ? "Hello! 👋 I'm your AI assistant. I can help you find products, check availability, and answer questions about our inventory. What would you like to know?"
      : `Hello! 👋 I'm your AI assistant for inventory management. I can help you with system insights, low stock alerts, highly demanded products, and answer questions about the inventory system. What would you like to know?`
    
    setMessages([{
      id: Date.now(),
      role: 'assistant',
      content: welcomeMessage
    }])
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-lg shadow-2xl z-50 flex flex-col border border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-blue to-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold">AI Assistant</h3>
              <p className="text-xs text-blue-100">
                {userRole === 'Customer' ? 'Product Helper' : 'System Assistant'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearChat}
              className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
              title="Clear Chat"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <svg className="w-16 h-16 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p>Start a conversation...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-primary-blue text-white'
                        : 'bg-white text-gray-800 border border-gray-200'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-200">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={userRole === 'Customer' ? "Ask about products..." : "Ask about system status..."}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-blue disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </form>
          {!geminiService.isConfigured() && (
            <div className="text-xs text-amber-600 mt-2 space-y-1">
              <p>⚠️ Gemini API not configured.</p>
              <p>Steps to fix:</p>
              <ol className="list-decimal list-inside ml-2 space-y-0.5">
                <li>Add VITE_GEMINI_API_KEY=your_key to .env file</li>
                <li>Restart dev server (npm run dev)</li>
                <li>Free tier uses "gemini-pro" model</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default ChatbotModal

