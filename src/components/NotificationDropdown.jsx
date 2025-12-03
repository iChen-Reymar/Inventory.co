import { useState, useEffect } from 'react'
import { productService } from '../services/productService'
import { customerService } from '../services/customerService'

function NotificationDropdown({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const alerts = []
      
      // Fetch stock alerts
      const { data: products, error: productsError } = await productService.getAllProducts()
      if (!productsError && products) {
        products.forEach(product => {
          if (product.stock === 0) {
            alerts.push({
              id: `stock_${product.id}`,
              type: 'out_of_stock',
              message: `${product.name} is out of stock`,
              productName: product.name,
              stock: product.stock,
              severity: 'high',
              category: 'stock'
            })
          } else if (product.stock <= 2) {
            alerts.push({
              id: `stock_${product.id}`,
              type: 'low_stock',
              message: `${product.name} has low stock (${product.stock} remaining)`,
              productName: product.name,
              stock: product.stock,
              severity: 'medium',
              category: 'stock'
            })
          }
        })
      }

      // Fetch approval requests
      const { data: pendingCustomers, error: customersError } = await customerService.getPendingApprovals()
      if (!customersError && pendingCustomers) {
        pendingCustomers.forEach(customer => {
          alerts.push({
            id: `approval_${customer.id}`,
            type: 'approval_request',
            message: `${customer.name} (${customer.email}) is requesting approval`,
            customerName: customer.name,
            customerEmail: customer.email,
            customerId: customer.id,
            severity: 'high',
            category: 'approval'
          })
        })
      }

      // Sort by severity and category (approval requests first, then stock alerts)
      alerts.sort((a, b) => {
        // Approval requests first
        if (a.category === 'approval' && b.category !== 'approval') return -1
        if (a.category !== 'approval' && b.category === 'approval') return 1
        // Then by severity
        if (a.severity === 'high' && b.severity !== 'high') return -1
        if (a.severity !== 'high' && b.severity === 'high') return 1
        return 0
      })

      setNotifications(alerts)
    } catch (err) {
      console.error('Error fetching notifications:', err)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  const getNotificationIcon = (type) => {
    if (type === 'approval_request') {
      return (
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      )
    }
    if (type === 'out_of_stock') {
      return (
        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    }
    return (
      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  }

  const getNotificationColor = (type, severity) => {
    if (type === 'approval_request') {
      return 'bg-blue-50 border-blue-200'
    }
    if (severity === 'high') {
      return 'bg-red-50 border-red-200'
    }
    return 'bg-yellow-50 border-yellow-200'
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      {/* Dropdown */}
      <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="p-4 text-center text-gray-400 text-sm">Loading alerts...</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">
              <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>No notifications</p>
              <p className="text-xs mt-1">All caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 ${getNotificationColor(notification.type, notification.severity)} hover:bg-opacity-80 transition-colors`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      {notification.type === 'approval_request' ? (
                        <>
                          <p className="text-sm font-medium text-gray-900">
                            Approval Request
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Pending Approval
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-gray-900">
                            {notification.productName}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <div className="mt-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              notification.severity === 'high'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {notification.stock === 0 ? 'Out of Stock' : `Low Stock: ${notification.stock}`}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {notifications.filter(n => n.category === 'approval').length > 0 && (
                  <span className="text-blue-600 font-medium">
                    {notifications.filter(n => n.category === 'approval').length} approval{notifications.filter(n => n.category === 'approval').length !== 1 ? 's' : ''}
                  </span>
                )}
              </span>
              <span>
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''} total
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default NotificationDropdown

