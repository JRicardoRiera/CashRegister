import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import PosPage from './pages/PosPage'
import AdminPage from './pages/AdminPage'
import CajeroProductos from './pages/cajero/ProductosPage'
import CajeroMisVentas from './pages/cajero/MisVentasPage'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <PosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cajero/productos"
          element={
            <ProtectedRoute>
              <CajeroProductos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cajero/mis-ventas"
          element={
            <ProtectedRoute>
              <CajeroMisVentas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
