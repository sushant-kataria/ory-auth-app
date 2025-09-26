export const isKratosSuccessful400 = (error: any): boolean => {
  if (error.response?.status === 400) {
    const data = error.response.data
    
    // Check if it's a successful code send
    if (data?.ui?.messages) {
      const hasSuccessMessage = data.ui.messages.some((msg: any) => 
        msg.type === 'info' && (
          msg.text?.includes('email') || 
          msg.text?.includes('code') ||
          msg.text?.includes('sent')
        )
      )
      return hasSuccessMessage
    }
    
    // Check if flow state indicates success
    if (data?.state === 'sent_email' || data?.state === 'choose_method') {
      return true
    }
  }
  
  return false
}
