const fs = require('fs')
const path = require('path')
const vm = require('vm')

// load clipboard.js code
const code = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'src', 'utils', 'clipboard.js'), 'utf8')

// Create a fake DOM with minimal APIs used by clipboard.js
const sandbox = {
  navigator: {},
  document: {
    body: {
      appendChild(){},
      removeChild(){},
    },
    createElement(tag){
      if(tag === 'textarea'){
        return {
          value: '',
          setAttribute(){},
          style: {},
          select(){},
          setSelectionRange(){},
          focus(){},
        }
      }
      return {}
    },
    execCommand(cmd){
      console.log('execCommand called with', cmd)
      return true
    }
  },
  console,
  module: {},
  exports: {}
}
vm.runInNewContext(code + '\nmodule.exports = exports.default || module.exports.default || module.exports', sandbox)
const copyToClipboard = sandbox.module.exports

copyToClipboard('hello world').then(()=>console.log('copyToClipboard resolved')).catch(e=>console.error('copyToClipboard rejected', e))
