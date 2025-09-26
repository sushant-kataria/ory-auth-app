'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Configuration, FrontendApi, Session } from '@ory/client'
import { User, Mail, Calendar, Shield, LogOut, Settings, Loader2, CheckCircle } from 'lucide-react'

const ory = new FrontendApi(
  new Configuration({
    basePath: process.env.NEXT_PUBLIC_ORY_SDK_URL,
  })
)

export default function DashboardPage() {
  const [session, setSession] = useState<Session>()
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  
  const router = useRouter()

  useEffect(() => {
    ory.toSession()
      .then(({ data }) => {
        setSession(data)
        setIsLoading(false)
      })
      .catch((error) => {
        console.error('Session error:', error)
        router.push('/login')
      })
  }, [router])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    
    try {
      const { data } = await ory.createBrowserLogoutFlow()
      window.location.href = data.logout_url
    } catch (error) {
      console.error('Logout error:', error)
      setIsLoggingOut(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Session not found. Redirecting...</p>
        </div>
      </div>
    )
  }

  const userEmail = session.identity?.traits?.email
  const userName = session.identity?.traits?.name
  const fullName = userName ? `${userName.first} ${userName.last}` : 'User'
  const isVerified = session.identity?.verifiable_addresses?.[0]?.verified

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/settings')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isLoggingOut ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4 mr-2" />
                )}
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Section */}
          <div className="bg-white overflow-hidden shadow-sm rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                <div className="ml-5">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Welcome back, {fullName}!
                  </h2>
                  <p className="text-gray-600">
                    {userEmail}
                  </p>
                  <div className="mt-2 flex items-center">
                    {isVerified ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        <span className="text-sm">Email verified</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-yellow-600">
                        <Shield className="w-4 h-4 mr-1" />
                        <span className="text-sm">Email not verified</span>
                        <a href="/verification" className="ml-2 text-blue-600 hover:text-blue-500 text-sm">
                          Verify now
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Profile Information */}
            <div className="bg-white overflow-hidden shadow-sm rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Profile Information
                </h3>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Full Name
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {fullName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      Email Address
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {userEmail}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <Shield className="w-4 h-4 mr-2" />
                      Account Status
                    </dt>
                    <dd className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isVerified 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {isVerified ? 'Verified' : 'Pending Verification'}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Session Information */}
            <div className="bg-white overflow-hidden shadow-sm rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Session Information
                </h3>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Authenticated At
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {session.authenticated_at ? formatDate(session.authenticated_at) : 'Unknown'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Expires At
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {session.expires_at ? formatDate(session.expires_at) : 'Unknown'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Session ID
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono break-all">
                      {session.id}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6">
            <div className="bg-white overflow-hidden shadow-sm rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <button
                    onClick={() => router.push('/settings')}
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Account Settings
                  </button>
                  
                  <button
                    onClick={() => router.push('/recovery')}
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Change Password
                  </button>
                  
                  {!isVerified && (
                    <button
                      onClick={() => router.push('/verification')}
                      className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Verify Email
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
