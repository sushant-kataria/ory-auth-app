'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Configuration, FrontendApi, VerificationFlow } from '@ory/client'
import { Mail, ArrowRight, Loader2, CheckCircle } from 'lucide-react'

const ory = new FrontendApi(
  new Configuration({
    basePath: process.env.NEXT_PUBLIC_ORY_SDK_URL,
  })
)

export default function VerificationPage() {
  const [flow, setFlow] = useState<VerificationFlow>()
  const [isLoading, setIsLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCodeSent, setIsCodeSent] = useState(false)
  const [errors, setErrors] = useState<any>({})
  const [success, setSuccess] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const flowId = searchParams.get('flow')
    
    if (flowId) {
      ory.getVerificationFlow({ id: flowId })
        .then(({ data }) => {
          setFlow(data)
          setIsLoading(false)
        })
        .catch(() => {
          return ory.createBrowserVerificationFlow()
            .then(({ data }) => {
              setFlow(data)
              setIsLoading(false)
            })
        })
    } else {
      ory.createBrowserVerificationFlow()
        .then(({ data }) => {
          setFlow(data)
          setIsLoading(false)
        })
        .catch((error) => {
          console.error('Error creating verification flow:', error)
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
      await ory.updateVerificationFlow({
        flow: flow.id,
        updateVerificationFlowBody: {
          method: 'code',
          email: email,
        },
      })
      
      setIsCodeSent(true)
    } catch (error: any) {
      console.error('Send code error:', error)
      setErrors({ email: 'Failed to send verification code. Please try again.' })
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
      await ory.updateVerificationFlow({
        flow: flow.id,
        updateVerificationFlowBody: {
          method: 'code',
          code: code,
        },
      })
      
      setSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (error: any) {
      console.error('Verify code error:', error)
      setErrors({ code: 'Invalid or expired verification code.' })
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

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center space-y-6">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900">
            Email verified successfully!
          </h1>
          <p className="text-gray-600">
            Your email has been verified. Redirecting to login...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Verify your email
          </h1>
          <p className="text-gray-600">
            {isCodeSent 
              ? `We've sent a verification code to ${email}`
              : 'Enter your email address to receive a verification code'
            }
          </p>
        </div>

        {!isCodeSent ? (
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
        ) : (
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
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                />
                {errors.code && (
                  <p className="text-red-600 text-xs mt-1">{errors.code}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={!code || code.length !== 6 || isSubmitting}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Verify email'
                )}
              </button>
            </form>

            {/* Resend Code */}
            <div className="text-center">
              <button
                onClick={() => {
                  setIsCodeSent(false)
                  setCode('')
                  setErrors({})
                }}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Didn't receive the code? Try again
              </button>
            </div>
          </div>
        )}

        {/* Footer Links */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already verified?{' '}
            <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
