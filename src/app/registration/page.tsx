'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Configuration, FrontendApi, RegistrationFlow, UiNode } from '@ory/client'
import { Mail, Lock, User, Github, Chrome, ArrowRight, Loader2, RefreshCw } from 'lucide-react'

const ory = new FrontendApi(
  new Configuration({
    basePath: process.env.NEXT_PUBLIC_ORY_SDK_URL || 'http://localhost:4433',
  })
)

interface InputAttributes {
  node_type: 'input'
  name: string
  type: string
  value?: any
  required?: boolean
  disabled?: boolean
}

export default function RegistrationPage() {
  const [flow, setFlow] = useState<RegistrationFlow>()
  const [isLoading, setIsLoading] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<any>({})
  const [retryCount, setRetryCount] = useState(0)
  
  const router = useRouter()
  const searchParams = useSearchParams()

  // Helper function to get CSRF token
  const getCsrfToken = (flow: RegistrationFlow): string => {
    const csrfNode = flow.ui.nodes.find(
      (node: UiNode) => 
        node.attributes.node_type === 'input' && 
        (node.attributes as InputAttributes).name === 'csrf_token'
    )
    return csrfNode ? (csrfNode.attributes as InputAttributes).value : ''
  }

  // Function to create a completely fresh registration flow
  const createFreshFlow = async (forceNew = false) => {
    try {
      console.log('Creating fresh registration flow...')
      const returnTo = searchParams.get('return_to')
      
      // Clear any existing cookies if forcing new flow
      if (forceNew) {
        document.cookie.split(";").forEach((c) => {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
        })
      }
      
      const { data } = await ory.createBrowserRegistrationFlow({ 
        returnTo: returnTo || undefined 
      })
      
      console.log('Fresh flow created:', data.id, 'CSRF token:', getCsrfToken(data) ? 'Present' : 'Missing')
      setFlow(data)
      setErrors({}) // Clear errors on fresh flow
      return data
    } catch (error) {
      console.error('Error creating fresh registration flow:', error)
      throw error
    }
  }

  // Enhanced flow refresh with better error handling
  const refreshFlowOnError = async () => {
    try {
      console.log('Refreshing flow due to CSRF error...')
      setRetryCount(prev => prev + 1)
      
      // Wait a moment to let any pending requests complete
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const newFlow = await createFreshFlow(true) // Force clear cookies
      setFlow(newFlow)
      
      setErrors({ 
        general: 'Session refreshed successfully. Please try again.' 
      })
      
      return newFlow
    } catch (error) {
      console.error('Failed to refresh flow:', error)
      setErrors({ 
        general: 'Unable to refresh session. Please reload the page.' 
      })
      throw error
    }
  }

  // Initialize flow
  useEffect(() => {
    const initializeFlow = async () => {
      const flowId = searchParams.get('flow')
      
      try {
        if (flowId) {
          console.log('Getting existing flow:', flowId)
          const { data } = await ory.getRegistrationFlow({ id: flowId })
          
          // Check if flow has a valid CSRF token
          const csrfToken = getCsrfToken(data)
          if (!csrfToken) {
            console.log('Flow missing CSRF token, creating fresh flow')
            await createFreshFlow()
          } else {
            console.log('Using existing flow:', data.id, 'CSRF:', csrfToken ? 'Present' : 'Missing')
            setFlow(data)
          }
        } else {
          console.log('No flow ID, creating new flow')
          await createFreshFlow()
        }
      } catch (error) {
        console.log('Flow initialization failed, creating fresh flow:', error)
        try {
          await createFreshFlow()
        } catch (freshFlowError) {
          console.error('Failed to create fresh flow:', freshFlowError)
          setErrors({ general: 'Unable to initialize registration. Please reload the page.' })
        }
      } finally {
        setIsLoading(false)
      }
    }

    initializeFlow()
  }, [searchParams])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev: any) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!flow) {
      console.log('No flow available, creating fresh flow...')
      await createFreshFlow()
      return
    }

    setIsSubmitting(true)
    setErrors({})
    
    try {
      const csrfToken = getCsrfToken(flow)
      
      if (!csrfToken) {
        console.log('No CSRF token found, refreshing flow...')
        await refreshFlowOnError()
        return
      }

      console.log('Submitting registration with flow ID:', flow.id, 'CSRF token present:', !!csrfToken)
      
      // Add a small delay to ensure cookies are properly set
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const response = await ory.updateRegistrationFlow({
        flow: flow.id,
        updateRegistrationFlowBody: {
          method: 'password',
          password: formData.password,
          csrf_token: csrfToken,
          traits: {
            email: formData.email,
            name: {
              first: formData.firstName,
              last: formData.lastName,
            },
          },
        },
      })
      
      console.log('Registration successful:', response.data)
      
      // Registration successful
      router.push('/dashboard')
      
    } catch (error: any) {
      console.error('Registration error:', error)
      
      if (error.response?.status === 403) {
        // CSRF error - only retry a few times to avoid infinite loops
        if (retryCount < 3) {
          console.log('403 CSRF error - refreshing flow (attempt', retryCount + 1, ')')
          await refreshFlowOnError()
        } else {
          setErrors({
            general: 'Unable to process registration after multiple attempts. Please reload the page and try again.'
          })
        }
        return
      }
      
      if (error.response?.status === 400 && error.response?.data?.ui?.messages) {
        const messages = error.response.data.ui.messages
        const newErrors: any = {}
        
        messages.forEach((message: any) => {
          if (message.context?.property) {
            const property = message.context.property
            if (property === 'traits.email') {
              newErrors.email = message.text
            } else if (property === 'password') {
              newErrors.password = message.text
            } else if (property === 'traits.name.first') {
              newErrors.firstName = message.text
            } else if (property === 'traits.name.last') {
              newErrors.lastName = message.text
            } else {
              newErrors.general = message.text
            }
          } else {
            newErrors.general = message.text
          }
        })
        
        setErrors(newErrors)
      } else if (error.response?.status === 410) {
        // Flow expired
        console.log('Flow expired, creating new flow...')
        await createFreshFlow()
        setErrors({ 
          general: 'Registration session expired. Please try again.' 
        })
      } else {
        setErrors({ general: 'Registration failed. Please try again.' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSocialRegistration = (provider: string) => {
    if (!flow) return
    
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = flow.ui.action
    
    const csrfInput = document.createElement('input')
    csrfInput.type = 'hidden'
    csrfInput.name = 'csrf_token'
    csrfInput.value = getCsrfToken(flow)
    form.appendChild(csrfInput)
    
    const providerInput = document.createElement('input')
    providerInput.type = 'hidden'
    providerInput.name = 'provider'
    providerInput.value = provider
    form.appendChild(providerInput)
    
    const methodInput = document.createElement('input')
    methodInput.type = 'hidden'
    methodInput.name = 'method'
    methodInput.value = 'oidc'
    form.appendChild(methodInput)
    
    document.body.appendChild(form)
    form.submit()
  }

  // Manual retry function for users
  const handleRetry = async () => {
    setIsLoading(true)
    try {
      await createFreshFlow(true)
      setRetryCount(0)
    } catch (error) {
      setErrors({ general: 'Failed to refresh. Please reload the page.' })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create your account
          </h1>
          <p className="text-gray-600">
            Welcome! Please fill in the details to get started.
          </p>
        </div>

        {/* General Error Display */}
        {errors.general && (
          <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">
            {errors.general}
            {retryCount > 0 && (
              <div className="mt-2">
                <button
                  onClick={handleRetry}
                  className="inline-flex items-center text-blue-600 hover:text-blue-500 text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Try refreshing session
                </button>
              </div>
            )}
          </div>
        )}

        {/* Social Registration Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => handleSocialRegistration('google')}
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Chrome className="w-5 h-5 mr-3" />
            Continue with Google
          </button>
          
          <button
            onClick={() => handleSocialRegistration('github')}
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Github className="w-5 h-5 mr-3" />
            Continue with GitHub
          </button>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-50 text-gray-500">OR</span>
          </div>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="sr-only">
                First Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`appearance-none rounded-md relative block w-full px-12 py-3 border ${
                    errors.firstName ? 'border-red-500' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="First name"
                />
              </div>
              {errors.firstName && (
                <p className="text-red-600 text-xs mt-1">{errors.firstName}</p>
              )}
            </div>

            <div>
              <label htmlFor="lastName" className="sr-only">
                Last Name
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleInputChange}
                className={`appearance-none rounded-md relative block w-full px-4 py-3 border ${
                  errors.lastName ? 'border-red-500' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                placeholder="Last name"
              />
              {errors.lastName && (
                <p className="text-red-600 text-xs mt-1">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className={`appearance-none rounded-md relative block w-full px-12 py-3 border ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                placeholder="Enter your email address"
              />
            </div>
            {errors.email && (
              <p className="text-red-600 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className={`appearance-none rounded-md relative block w-full px-12 py-3 border ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                placeholder="Create a password"
              />
            </div>
            {errors.password && (
              <p className="text-red-600 text-xs mt-1">{errors.password}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Must be at least 8 characters long
            </p>
          </div>

          {/* Debug Info (for troubleshooting) */}
          {process.env.NODE_ENV === 'development' && flow && (
            <div className="text-xs text-gray-400 bg-gray-100 p-2 rounded">
              <div>Flow ID: {flow.id.substring(0, 8)}...</div>
              <div>CSRF: {getCsrfToken(flow) ? '✓' : '✗'}</div>
              <div>Retry Count: {retryCount}</div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !flow}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Create account
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
