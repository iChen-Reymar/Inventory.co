import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from './Layout'
import AddCustomerModal from './AddCustomerModal'
import { customerService } from '../services/customerService'
import { useAuth } from '../contexts/AuthContext'

function Customers() {
  const navigate = useNavigate()
  const { user, profile, isAdmin, isStaff } = useAuth()
  const [customers, setCustomers] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch customers from database
  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await customerService.getAllCustomers()
      if (error) throw error
      setCustomers(data || [])
    } catch (err) {
      console.error('Error fetching customers:', err)
      setError('Failed to load customers. Using local data.')
      // Fallback to empty array if database fails
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddCustomer = async (newCustomer) => {
    try {
      const { data, error } = await customerService.createCustomer(newCustomer)
      if (error) throw error
      
      // Refresh the list
      await fetchCustomers()
    } catch (err) {
      console.error('Error adding customer:', err)
      alert('Failed to add customer. Please try again.')
    }
  }

  const handleApprove = async (customerId) => {
    try {
      const { error } = await customerService.approveCustomer(customerId, user?.id)
      if (error) throw error
      await fetchCustomers()
    } catch (err) {
      console.error('Error approving customer:', err)
      alert('Failed to approve customer. Please try again.')
    }
  }

  const handleReject = async (customerId) => {
    if (!confirm('Are you sure you want to reject this customer?')) return
    
    try {
      const { error } = await customerService.rejectCustomer(customerId, user?.id)
      if (error) throw error
      await fetchCustomers()
    } catch (err) {
      console.error('Error rejecting customer:', err)
      alert('Failed to reject customer. Please try again.')
    }
  }

  const handleDeleteCustomer = async (customerId) => {
    if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) return
    
    try {
      const { error } = await customerService.deleteCustomer(customerId)
      if (error) throw error
      await fetchCustomers()
    } catch (err) {
      console.error('Error deleting customer:', err)
      alert('Failed to delete customer. Please try again.')
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {status?.toUpperCase() || 'PENDING'}
      </span>
    )
  }

  return (
    <Layout pageTitle="customers">
      <AddCustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddCustomer={handleAddCustomer}
      />
      <div className="p-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Customers</h1>
          
          {/* User Profile Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">User Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name*
                </label>
                <input
                  type="text"
                  value={profile?.name || user?.user_metadata?.name || 'N/A'}
                  disabled
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email*
                </label>
                <input
                  type="email"
                  value={profile?.email || user?.email || 'N/A'}
                  disabled
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role*
                </label>
                <input
                  type="text"
                  value={profile?.role || 'Customer'}
                  disabled
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Add Customer Button */}
          {(isAdmin() || isStaff()) && (
            <div className="flex items-center justify-end mb-6">
              <button 
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-primary-blue text-white rounded-lg font-medium hover:bg-[#357abd] transition-colors"
              >
                + Add Customer
              </button>
            </div>
          )}
        </div>

        {/* Customers Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-4 px-6 text-gray-600 font-semibold">ID</th>
                  <th className="text-left py-4 px-6 text-gray-600 font-semibold">Name</th>
                  <th className="text-left py-4 px-6 text-gray-600 font-semibold">Role</th>
                  <th className="text-left py-4 px-6 text-gray-600 font-semibold">Status</th>
                  <th className="text-left py-4 px-6 text-gray-600 font-semibold">Actions</th>
                  {isAdmin() && (
                    <th className="text-left py-4 px-6 text-gray-600 font-semibold">Admin</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={isAdmin() ? "6" : "5"} className="py-8 text-center text-gray-400">
                      Loading customers...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin() ? "6" : "5"} className="py-8 text-center text-gray-400">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6 text-gray-900 font-mono">
                        {customer.customer_id}
                      </td>
                      <td className="py-4 px-6 text-gray-900 font-medium">
                        {customer.name}
                      </td>
                      <td className="py-4 px-6 text-gray-600">
                        {customer.role}
                      </td>
                      <td className="py-4 px-6">
                        {getStatusBadge(customer.status)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          {customer.status === 'pending' && (isAdmin() || user) && (
                            <>
                              <button
                                onClick={() => handleApprove(customer.id)}
                                className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
                                title="Approve"
                              >
                                ✓ Approve
                              </button>
                              <button
                                onClick={() => handleReject(customer.id)}
                                className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                                title="Reject"
                              >
                                ✗ Reject
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => navigate(`/settings?userId=${customer.user_id || customer.id}`)}
                            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                            title="View Profile"
                          >
                            <svg
                              className="w-5 h-5 text-gray-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                      {isAdmin() && (
                        <td className="py-4 px-6">
                          <button
                            onClick={() => handleDeleteCustomer(customer.id)}
                            className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                            title="Delete Customer"
                          >
                            Delete
                          </button>
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

export default Customers

