
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './app/App'
import './styles/global.css'

const rootEl = document.getElementById('root')
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl)
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('SW registered:', reg.scope)
    }).catch(err => {
      console.log('SW registration failed:', err)
    })
  })
}
