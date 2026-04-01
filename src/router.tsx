import { createBrowserRouter } from 'react-router-dom'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Room from '@/pages/Room'
import History from '@/pages/History'
import NotFound from '@/pages/NotFound'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <Home />,
      },
      {
        path: '/room/:roomCode/*',
        element: <Room />,
      },
      {
        path: '/history',
        element: <History />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
])

export default router
