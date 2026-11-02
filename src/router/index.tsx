import { createBrowserRouter, Navigate } from 'react-router-dom'

export const router = createBrowserRouter([
  {
    path: '/',
    lazy: async () => {
      const { default: App } = await import('../App')
      return { Component: App }
    },
  },
  {
    path: '/image-crop',
    lazy: async () => {
      const { default: ImageCropDemo } = await import('../pages/ImageCropDemo')
      return { Component: ImageCropDemo }
    },
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
