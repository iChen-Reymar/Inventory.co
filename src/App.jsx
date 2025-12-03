import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import Signup from './components/Signup'
import Login from './components/Login'
import Home from './components/Home'
import Products from './components/Products'
import Categories from './components/Categories'
import Staffs from './components/Staffs'
import Customers from './components/Customers'
import Settings from './components/Settings'
import ProtectedRoute from './components/ProtectedRoute'

function AuthPage() {
  const location = useLocation()
  const [isSignup, setIsSignup] = useState(true)

  // Check if we're on the login route
  useEffect(() => {
    if (location.pathname === '/login') {
      setIsSignup(false) // Show login form
    } else {
      setIsSignup(true) // Show signup form
    }
  }, [location.pathname])

  const toggleForm = () => {
    setIsSignup(!isSignup)
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-5">
      {isSignup ? (
        <Signup onToggle={toggleForm} />
      ) : (
        <Login onToggle={toggleForm} />
      )}
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route 
            path="/home" 
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/products" 
            element={
              <ProtectedRoute>
                <Products />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/categories" 
            element={
              <ProtectedRoute>
                <Categories />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/staffs" 
            element={
              <ProtectedRoute adminOnly={true}>
                <Staffs />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customers" 
            element={
              <ProtectedRoute adminOnly={true}>
                <Customers />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App

