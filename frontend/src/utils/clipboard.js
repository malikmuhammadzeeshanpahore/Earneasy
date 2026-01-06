// Robust copy helper: tries Clipboard API first, then falls back to execCommand with a temporary textarea
export default async function copyToClipboard(text){
  if(!text) return Promise.reject(new Error('No text to copy'))

  // Prefer modern clipboard API
  if(navigator.clipboard && navigator.clipboard.writeText){
    try{
      await navigator.clipboard.writeText(text)
      return true
    }catch(e){
      // fall through to legacy fallback
      console.warn('navigator.clipboard.writeText failed, falling back to textarea method', e)
    }
  }

  // Fallback for older browsers
  return new Promise((resolve, reject)=>{
    try{
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', '')
      // place off-screen but focusable
      textarea.style.position = 'fixed'
      textarea.style.top = '0'
      textarea.style.left = '-9999px'
      textarea.style.width = '1px'
      textarea.style.height = '1px'
      textarea.style.opacity = '0'
      textarea.style.outline = 'none'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      textarea.setSelectionRange(0, textarea.value.length)

      const ok = document.execCommand('copy')
      document.body.removeChild(textarea)
      if(ok) resolve(true)
      else reject(new Error('execCommand copy failed'))
    }catch(err){
      reject(err)
    }
  })
}
