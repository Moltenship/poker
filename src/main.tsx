import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import router from './router'
import './index.css'

// ConvexProvider placeholder for future integration
const App = () => <RouterProvider router={router} />

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
