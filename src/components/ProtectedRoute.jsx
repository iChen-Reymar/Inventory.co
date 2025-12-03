import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, profile, loading, isAdmin } = useAuth()

  // Show loading only for initial check (first 1 second, or until user is available)
  const [initialLoading, setInitialLoading] = useState(true)
  
  useEffect(() => {
    // If user exists, allow access immediately
    if (user) {
      setInitialLoading(false)
      return
    }
    
    // Otherwise, wait max 500ms (faster response)
    const timer = setTimeout(() => {
      setInitialLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [user])

  // If we have a user, allow access immediately (don't wait for profile)
  if (user) {
    // If admin-only route and user is not admin, redirect
    if (adminOnly && !isAdmin()) {
      return <Navigate to="/home" replace />
    }
    // Allow access immediately - profile will load in background
    return children
  }

  // Show loading only if no user and still checking (first 500ms)
  if (loading && initialLoading && !user) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  // If no user after initial load, redirect to login
  if (!user && !loading && !initialLoading) {
    return <Navigate to="/" replace />
  }

  // Default: allow access (profile will load in background)
  // This handles the case where user might be loading
  return children
}

export default ProtectedRoute

