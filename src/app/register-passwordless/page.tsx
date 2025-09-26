'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Configuration, FrontendApi, RegistrationFlow, UiNode } from '@ory/client'
import { Mail, ArrowRight, Loader2, CheckCircle } from 'lucide-react'

const ory = new FrontendApi(
  new Configuration({
    basePath: process.env.NEXT_PUBLIC_ORY_SDK_URL || 'http://localhost:4433',
  })
)

export default function PasswordlessRegistrationPage() {
  const [flow, setFlow] = useState<RegistrationFlow>()
  const [isLoading, setIsLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [currentStep, setCurrentStep] = useState<'email' | 'code'>('email')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<any>({})
  const [codeSent, setCodeSent] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()

  // Helper function to get CSRF token
  const getCsrfToken = (flow: RegistrationFlow): string => {
    const csrfNode = flow.ui.nodes.find(
      (node: UiNode) => 
        node.attributes.node_type === 'input' && 
        (node.attributes as any).name === 'csrf_token'
    )
    return (csrfNode?.attributes as any)?.value || ''
  }

  // Create fresh registration flow
  const createFreshFlow = async () => {
    try {
      const returnTo = searchParams.get('return_to')
      const { data } = await ory.createBrowserRegistrationFlow({ 
        returnTo: returnTo || undefined 
      })
      setFlow(data)
      return data
    } catch (error) {
      console.error('Error creating registration flow:', error)
      throw error
    }
  }

  useEffect(() => {
    const flowId = searchParams.get('flow')
    const emailParam = searchParams.get('email')
    
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam))
    }
    
    if (flowId) {
      ory.getRegistrationFlow({ id: flowId })
        .then(({ data }) => {
          setFlow(data)
          setIsLoading(false)
        })
        .catch(() => {
          return createFreshFlow()
            .then((data) => {
              setFlow(data)
              setIsLoading(false)
            })
        })
    } else {
      createFreshFlow()
        .then((data) => {
          setFlow(data)
          setIsLoading(false)
        })
        .catch((error) => {
          console.error('Error creating registration flow:', error)
          setIsLoading(false)
        })
    }
  }, [searchParams])

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!flow || !email) return

    setIsSubmitting(true)
    setErrors({})
    
    try {
      const csrfToken = getCsrfToken(flow)
      
      const response = await ory.updateRegistrationFlow({
        flow: flow.id,
        updateRegistrationFlowBody: {
          method: 'code',
          traits: {
            email: email
          },
          csrf_token: csrfToken,
        },
      })
      
      setCodeSent(true)
      setCurrentStep('code')
      alert('Registration code sent to your email! Please check your inbox.')
      
    } catch (error: any) {
      console.error('Error sending registration code:', error)
      
      // Handle 400 responses that might be success
      if (error.response?.status === 400) {
        const data = error.response.data
        
        if (data?.ui?.messages) {
          const successMessage = data.ui.messages.find((msg: any) => 
            msg.type === 'info' && (
              msg.text?.includes('email') || 
              msg.text?.includes('code') || 
              msg.text?.includes('sent')
            )
          )
          
          if (successMessage) {
            setFlow(data)
            setCodeSent(true)
            setCurrentStep('code')
            alert('Registration code sent to your email! Please check your inbox.')
            return
          }
        }
      }
      
      if (error.response?.status === 403) {
        await createFreshFlow()
        setErrors({ general: 'Session expired. Please try again.' })
        return
      }
      
      setErrors({ general: 'Failed to send registration code. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!flow || !code) return

    setIsSubmitting(true)
    setErrors({})
    
    try {
      const csrfToken = getCsrfToken(flow)
      
      const response = await ory.updateRegistrationFlow({
        flow: flow.id,
        updateRegistrationFlowBody: {
          method: 'code',
          code: code,
          traits: {
            email: email
          },
          csrf_token: csrfToken,
        },
      })
      
      // Registration successful - user should be automatically logged in
      router.push('/dashboard')
      
    } catch (error: any) {
      console.error('Code verification error:', error)
      
      if (error.response?.status === 403) {
        await createFreshFlow()
        setErrors({ general: 'Session expired. Please try again.' })
        return
      }
      
      const errorMessage = error.response?.data?.ui?.messages?.[0]?.text || 'Invalid code. Please try again.'
      setErrors({ code: errorMessage })
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
            Join with just your email
          </h1>
          <p className="text-gray-600">
            {currentStep === 'email' && "Enter your email to get started - no password needed"}
            {currentStep === 'code' && `We've sent a code to ${email}`}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center space-x-4">
          <div className={`w-3 h-3 rounded-full ${currentStep === 'email' ? 'bg-blue-600' : 'bg-green-500'}`} />
          <div className={`w-3 h-3 rounded-full ${currentStep === 'code' ? 'bg-blue-600' : 'bg-gray-300'}`} />
        </div>

        {/* General Error Display */}
        {errors.general && (
          <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">
            {errors.general}
          </div>
        )}

        {currentStep === 'email' && (
          /* Email Input Form */
          <form onSubmit={handleSendCode} className="space-y-6">
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-md relative block w-full px-12 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your email address"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!email || isSubmitting}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Send verification code
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </form>
        )}

        {currentStep === 'code' && (
          /* Code Verification Form */
          <div className="space-y-6">
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div>
                <label htmlFor="code" className="sr-only">
                  Verification code
                </label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className={`appearance-none rounded-md relative block w-full px-4 py-3 border ${
                    errors.code ? 'border-red-500' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center text-lg tracking-widest`}
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
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Create account & sign in
                  </>
                )}
              </button>
            </form>

            <div className="text-center">
              <button
                onClick={() => {
                  setCurrentStep('email')
                  setCode('')
                  setCodeSent(false)
                  setErrors({})
                }}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Change email address
              </button>
            </div>
          </div>
        )}

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
