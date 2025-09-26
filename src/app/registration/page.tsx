'use client'

import { useState } from 'react'
import { Configuration, FrontendApi } from '@ory/client'

const ory = new FrontendApi(new Configuration({
  basePath: 'http://localhost:4433'
}))

export default function SimpleRegistration() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const register = async () => {
    setLoading(true)
    setMessage('')
    
    try {
      // Create fresh flow
      const { data: flow } = await ory.createBrowserRegistrationFlow()
      
      // Get CSRF token
      const csrfNode = flow.ui.nodes.find(n => 
        n.attributes.node_type === 'input' && 
        (n.attributes as any).name === 'csrf_token'
      )
      const csrfToken = (csrfNode?.attributes as any)?.value
      
      // Submit registration
      await ory.updateRegistrationFlow({
        flow: flow.id,
        updateRegistrationFlowBody: {
          method: 'password',
          password: password,
          csrf_token: csrfToken,
          traits: {
            email: email
          }
        }
      })
      
      setMessage('Registration successful!')
    } catch (error: any) {
      console.error('Registration failed:', error.response?.data || error)
      setMessage('Registration failed: ' + (error.response?.data?.ui?.messages?.[0]?.text || error.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl mb-4">Register</h1>
      
      <div className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
        />
        
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded"
        />
        
        <button
          onClick={register}
          disabled={loading}
          className="w-full p-2 bg-blue-500 text-white rounded"
        >
          {loading ? 'Registering...' : 'Register'}
        </button>
        
        {message && (
          <div className={`p-2 rounded ${message.includes('successful') ? 'bg-green-100' : 'bg-red-100'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
