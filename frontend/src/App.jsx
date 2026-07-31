// ============================================================================
// App.jsx - Definición de rutas de la aplicación
// ----------------------------------------------------------------------------
// Este componente configura el enrutado de toda la aplicación con React
// Router. Define qué página se muestra según la URL, y aplica dos capas de
// protección:
//   - ProtectedRoute: exige estar logueado.
//   - AdminRoute: exige ser administrador.
// Es la estructura "esqueleto" que une login, registro, POS de cajero y
// panel de administración.
// ============================================================================

// Componentes de React Router para manejar las rutas.
// BrowserRouter: histórico de navegación real (usa la barra de direcciones).
// Routes/Route: definen la tabla de rutas.
// Navigate: redirige automáticamente a otra ruta.
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
// Páginas públicas de autenticación.
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
// Página principal del Punto de Venta (también llamada POS).
import PosPage from './pages/PosPage'
// Panel de administración (contiene sus propias sub-rutas).
import AdminPage from './pages/AdminPage'
// Páginas específicas del rol cajero: consulta de productos y de sus ventas.
import CajeroProductos from './pages/cajero/ProductosPage'
import CajeroMisVentas from './pages/cajero/MisVentasPage'
// Componentes de guardia de rutas (protección de acceso).
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

// Componente principal de la aplicación. Se exporta como función por defecto.
export default function App() {
  return (
    // Envolvemos todo en BrowserRouter para que React Router gestione las
    // URLs y el historial del navegador.
    <BrowserRouter>
      {/* Tabla de rutas de la aplicación */}
      <Routes>
        {/* Ruta pública: página de inicio de sesión */}
        <Route path="/login" element={<LoginPage />} />
        {/* Ruta pública: página de registro de nuevos usuarios */}
        <Route path="/register" element={<RegisterPage />} />
        {/* Ruta raíz: el POS. Solo accesible si hay sesión iniciada. */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <PosPage />
            </ProtectedRoute>
          }
        />
        {/* Consulta de productos por parte del cajero (protegida) */}
        <Route
          path="/cajero/productos"
          element={
            <ProtectedRoute>
              <CajeroProductos />
            </ProtectedRoute>
          }
        />
        {/* Historial de ventas del cajero (protegida) */}
        <Route
          path="/cajero/mis-ventas"
          element={
            <ProtectedRoute>
              <CajeroMisVentas />
            </ProtectedRoute>
          }
        />
        {/* Panel de administración. Requiere sesión Y rol administrador.
            El comodín "*" permite sub-rutas internas (/admin/productos,
            /admin/ventas, ...) que gestionará AdminPage. */}
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
        {/* Ruta comodín: cualquier URL desconocida redirige a "/".
            "replace" sustituye la entrada del historial en vez de añadir una,
            para que el botón "atrás" no vuelva a la ruta inexistente. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
