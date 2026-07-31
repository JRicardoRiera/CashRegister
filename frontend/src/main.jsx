// ============================================================================
// main.jsx - Punto de entrada de la aplicación React
// ----------------------------------------------------------------------------
// Este es el archivo que Vite usa como entrada ("entry point") según la
// configuración del index.html. Es el encargado de "montar" (renderizar)
// el componente raíz <App /> dentro del elemento <div id="root"> del HTML.
// ============================================================================

// StrictMode es un componente de desarrollo que ejecuta dos veces los
// renderizados y efectos para detectar problemas de rendimiento o lógica.
// En producción no tiene ningún efecto visible.
import { StrictMode } from 'react'
// createRoot es la API moderna de React 19 para montar la aplicación.
import { createRoot } from 'react-dom/client'
// Importamos los estilos globales de Tailwind (en este proyecto se usa
// Tailwind CSS v4, que se importa desde index.css con @import "tailwindcss").
import './index.css'
// Importamos el componente raíz de la aplicación.
import App from './App.jsx'

// Buscamos el elemento <div id="root"> del index.html y creamos la raíz
// de React sobre él. "createRoot" gestiona el árbol de componentes.
createRoot(document.getElementById('root')).render(
  // StrictMode activa comprobaciones extra de desarrollo.
  <StrictMode>
    <App />
  </StrictMode>,
)
