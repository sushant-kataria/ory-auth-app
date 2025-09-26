'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Configuration, FrontendApi, LoginFlow, UiNode } from '@ory/client'
import { Mail, Lock, Github, Chrome, ArrowRight, Loader2 } from 'lucide-react'

const ory = new FrontendApi(
  new Configuration({
    basePath: process.env.NEXT_PUBLIC_ORY_SDK_URL || 'http://localhost:4433',
  })
)

export default function LoginPage() {
  const [flow, setFlow] = useState<LoginFlow>()
  const [isLoading, setIsLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [showPasswordLogin, setShowPasswordLogin] = useState(false)
  const [showCodeLogin, setShowCodeLogin] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [errors, setErrors] = useState<any>({})
  
  const router = useRouter()
  const searchParams = useSearchParams()

  // Helper function to get CSRF token
  const getCsrfToken = (flow: LoginFlow): string => {
    const csrfNode = flow.ui.nodes.find(
      (node: UiNode) => 
        node.attributes.node_type === 'input' && 
        (node.attributes as any).name === 'csrf_token'
    )
    return (csrfNode?.attributes as any)?.value || ''
  }

  useEffect(() => {
    const flowId = searchParams.get('flow')
    const returnTo = searchParams.get('return_to')
    
    if (flowId) {
      ory.getLoginFlow({ id: flowId })
        .then(({ data }) => {
          setFlow(data)
          setIsLoading(false)
        })
        .catch(() => {
          return ory.createBrowserLoginFlow({ returnTo: returnTo || undefined })
            .then(({ data }) => {
              setFlow(data)
              setIsLoading(false)
            })
        })
    } else {
      ory.createBrowserLoginFlow({ returnTo: returnTo || undefined })
        .then(({ data }) => {
          setFlow(data)
          setIsLoading(false)
        })
        .catch((error) => {
          console.error('Error creating login flow:', error)
          setIsLoading(false)
        })
    }
  }, [searchParams])

  const handleContinue = () => {
    if (!email) return
    setShowPasswordLogin(true)
    setShowCodeLogin(true)
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!flow) return

    setIsSubmitting(true)
    setErrors({})
    
    try {
      const csrfToken = getCsrfToken(flow)
      const response = await ory.updateLoginFlow({
        flow: flow.id,
        updateLoginFlowBody: {
          method: 'password',
          identifier: email,
          password: password,
          csrf_token: csrfToken,
        },
      })
      
      // Check if flow has return_to for redirect
      if (flow.return_to) {
        window.location.href = flow.return_to
      } else {
        router.push('/dashboard')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      
      if (error.response?.status === 403) {
        alert('Session expired. Please refresh the page and try again.')
        window.location.reload()
        return
      }
      
      const errorMessage = error.response?.data?.ui?.messages?.[0]?.text || 'Login failed. Please check your credentials.'
      setErrors({ general: errorMessage })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!flow) return

    setIsSubmitting(true)
    setErrors({})
    
    try {
      const csrfToken = getCsrfToken(flow)
      const response = await ory.updateLoginFlow({
        flow: flow.id,
        updateLoginFlowBody: {
          method: 'code',
          code: code,
          csrf_token: csrfToken,
        },
      })
      
      // Check if flow has return_to for redirect
      if (flow.return_to) {
        window.location.href = flow.return_to
      } else {
        router.push('/dashboard')
      }
    } catch (error: any) {
      console.error('Code login error:', error)
      
      if (error.response?.status === 403) {
        alert('Session expired. Please refresh the page and try again.')
        window.location.reload()
        return
      }
      
      const errorMessage = error.response?.data?.ui?.messages?.[0]?.text || 'Invalid verification code. Please try again.'
      setErrors({ code: errorMessage })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSocialLogin = (provider: string) => {
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

  // FIXED sendCode function with proper null checks
  const sendCode = async () => {
    if (!flow || !email) return

    setIsSubmitting(true)
    setErrors({})
    
    try {
      const csrfToken = getCsrfToken(flow)
      
      const response = await ory.updateLoginFlow({
        flow: flow.id,
        updateLoginFlowBody: {
          method: 'code',
          identifier: email,
          csrf_token: csrfToken,
        },
      })
      
      // If we get here, code was sent successfully
      setCodeSent(true)
      alert('Login code sent to your email! Please check your inbox.')
      
    } catch (error: any) {
      console.error('Error sending code:', error)
      
      // Handle the 400 response which might be success
      if (error.response?.status === 400) {
        const data = error.response.data
        
        // Check if it's actually a success (code sent)
        if (data?.ui?.messages) {
          const successMessage = data.ui.messages.find((msg: any) => 
            msg.type === 'info' && (
              msg.text?.includes('email') || 
              msg.text?.includes('code') || 
              msg.text?.includes('sent')
            )
          )
          
          if (successMessage) {
            setCodeSent(true)
            // Update flow with the new flow data from response
            setFlow(data)
            alert('Login code sent to your email! Please check your inbox.')
            return
          }
          
          // If not success, show the error
          const errorMessage = data.ui.messages.find((msg: any) => msg.type === 'error')
          if (errorMessage) {
            if (errorMessage.text?.includes('strategy')) {
              setErrors({ 
                general: 'This account is not set up for code login. Please use password login or register first.' 
              })
            } else {
              setErrors({ general: errorMessage.text })
            }
            return
          }
        }
      }
      
      // Handle other errors
      if (error.response?.status === 403) {
        alert('Session expired. Please refresh the page and try again.')
        window.location.reload()
        return
      }
      
      setErrors({ 
        general: 'Unable to send login code. This account may not be set up for code login.' 
      })
    } finally {
      setIsSubmitting(false)
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
            Welcome back
          </h1>
          <p className="text-gray-600">
            Log in or create account to continue
          </p>
        </div>

        {/* General Error Display */}
        {errors.general && (
          <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">
            {errors.general}
          </div>
        )}

        {/* Social Login Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => handleSocialLogin('google')}
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Chrome className="w-5 h-5 mr-3" />
            Continue with Google
          </button>
          
          <button
            onClick={() => handleSocialLogin('github')}
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

        {/* Email Input */}
        {!showPasswordLogin && (
          <div className="space-y-4">
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-md relative block w-full px-12 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10"
                  placeholder="Enter your email address"
                />
              </div>
            </div>
            
            <button
              onClick={handleContinue}
              disabled={!email}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        )}

        {/* Login Methods */}
        {showPasswordLogin && (
          <div className="space-y-6">
            {/* Password Login */}
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none rounded-md relative block w-full px-12 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your password"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={!password || isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Log in with password'
                )}
              </button>
            </form>

            {/* OTP Login */}
            {showCodeLogin && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <button
                  onClick={sendCode}
                  disabled={isSubmitting}
                  className="w-full text-left py-2 text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
                >
                  {codeSent ? 'Code sent! Check your email' : 'Send me a login code instead'}
                </button>
                
                {codeSent && (
                  <form onSubmit={handleCodeSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="code" className="sr-only">
                        Verification code
                      </label>
                      <input
                        id="code"
                        name="code"
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className={`appearance-none rounded-md relative block w-full px-4 py-3 border ${
                          errors.code ? 'border-red-500' : 'border-gray-300'
                        } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                        placeholder="Enter verification code"
                        maxLength={6}
                      />
                      {errors.code && (
                        <p className="text-red-600 text-xs mt-1">{errors.code}</p>
                      )}
                    </div>
                    
                    <button
                      type="submit"
                      disabled={!code || isSubmitting}
                      className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Verify code'
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
            
            {/* Forgot Password */}
            <div className="text-center">
              <a href="/recovery" className="text-sm text-blue-600 hover:text-blue-500">
                Forgot your password?
              </a>
            </div>
          </div>
        )}

        {/* Footer Links */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <a href="/registration" className="font-medium text-blue-600 hover:text-blue-500">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
