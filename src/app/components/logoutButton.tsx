'use client'

import { useState } from 'react'
import { Configuration, FrontendApi } from '@ory/client'
import { LogOut } from 'lucide-react'

const ory = new FrontendApi(
  new Configuration({
    basePath: process.env.NEXT_PUBLIC_ORY_SDK_URL || 'http://localhost:4433',
  })
)

export default function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      const { data } = await ory.createBrowserLogoutFlow()
      window.location.href = data.logout_url
    } catch (error) {
      console.error('Logout error:', error)
      // Fallback: clear cookies and redirect
      document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
      })
      window.location.href = '/login'
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-500 disabled:opacity-50"
    >
      <LogOut className="w-4 h-4 mr-1" />
      {isLoading ? 'Signing out...' : 'Sign out'}
    </button>
  )
}
