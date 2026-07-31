// ============================================================================
// ProductSearch.jsx - Buscador de productos del POS
// ----------------------------------------------------------------------------
// Es el catálogo de productos del Punto de Venta. Permite al cajero:
//   - Buscar productos por nombre o código de barras (mínimo 2 caracteres).
//   - Escanear códigos de barras con un lector físico (que se comporta como
//     un teclado escribiendo muy rápido y acabando con "Enter").
//   - Añadir productos al carrito con un clic o pulsando "Enter".
//   - Navegar entre páginas del catálogo (20 productos por página).
// Incluye feedback sonoro (beep) y visual (borde del input) al escanear.
// ============================================================================

import { useState, useRef, useEffect, useCallback } from 'react'
// listarProductos: catálogo paginado. buscarProductos: búsqueda exacta.
import { listarProductos, buscarProductos } from '../lib/api'
// Tienda global del carrito (para añadir productos).
import useCartStore from '../store/cartStore'

// ---------------------------------------------------------------------------
// beep(freq, duration)
// Genera un sonido breve con la API de Audio del navegador (Web Audio API).
// Se usa para dar feedback al escanear: un pitido agudo (éxito) o grave
// (error). Va envuelto en try/catch para que falle silenciosamente si el
// navegador no soporta audio.
// ---------------------------------------------------------------------------
function beep(freq = 1200, duration = 60) {
  try {
    // Creamos un contexto de audio (webkitAudioContext por compatibilidad).
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    // Un oscilador genera la onda sonora (tipo "square" = tono duro).
    const osc = ctx.createOscillator()
    // Un nodo de ganancia controla el volumen (para que no sature).
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = freq
    // Volumen inicial muy bajo para evitar un "clic" brusco.
    gain.gain.value = 0.06
    // Bajamos el volumen exponencialmente hasta casi 0 para apagar el tono.
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000)
    // Conectamos oscilador -> ganancia -> salida de audio.
    osc.connect(gain)
    gain.connect(ctx.destination)
    // Arrancamos el oscilador y lo detenemos al cabo de "duration" ms.
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration / 1000)
  } catch {
    /* Si falla (navegador sin soporte), no hacemos nada. */
  }
}

// Número de productos por página en el catálogo.
const PER_PAGE = 20

// Componente principal del buscador.
export default function ProductSearch() {
  // Texto escrito en el buscador.
  const [query, setQuery] = useState('')
  // Resultados de la página actual.
  const [items, setItems] = useState([])
  // Página actual del catálogo.
  const [page, setPage] = useState(1)
  // Total de páginas y total de productos.
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  // Indicador de carga (mientras se piden los datos al backend).
  const [loading, setLoading] = useState(false)
  // Estado visual del escáner: 'idle' | 'success' | 'error'.
  const [scanState, setScanState] = useState('idle')
  // Referencia al input para poder enfocarlo programáticamente.
  const inputRef = useRef(null)
  // Acción de la tienda que añade un producto al carrito.
  const addItem = useCartStore((s) => s.addItem)

  // Referencias para detectar escaneos de lector de códigos.
  // Un lector "escribe" las teclas casi a la vez; un humano tarda más.
  // lastKeyTimeRef: marca de tiempo de la última tecla pulsada.
  const lastKeyTimeRef = useRef(0)
  // isScanningRef: true mientras se sospecha que viene un escaneo.
  const isScanningRef = useRef(false)
  // fetchIdRef: contador para descartar respuestas obsoletas (ver abajo).
  const fetchIdRef = useRef(0)

  // Tiempo máximo (ms) entre teclas para considerarlo un escaneo.
  const SCAN_THRESHOLD = 40
  // Solo buscamos si el texto tiene 2+ caracteres (evita peticiones vacías).
  const activeQ = query.length >= 2 ? query : ''

  // Al montar, enfocamos el input automáticamente para poder teclear
  // o escanear directamente sin hacer clic.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Carga la lista de productos cada vez que cambia la página o el texto.
  useEffect(() => {
    // Incrementamos el contador de petición. Al compararlo después, si la
    // respuesta que llega no es de la última petición, la descartamos.
    // Esto evita "condiciones de carrera" (que una búsqueda antigua y lenta
    // sobrescriba los resultados de la búsqueda más reciente).
    const id = ++fetchIdRef.current
    const q = activeQ
    setLoading(true)
    listarProductos(page, PER_PAGE, q)
      .then((data) => {
        if (id !== fetchIdRef.current) return
        setItems(data.items || [])
        setTotalPages(data.total_pages || 1)
        setTotal(data.total || 0)
      })
      .catch(() => {
        if (id !== fetchIdRef.current) return
        setItems([])
      })
      .finally(() => {
        if (id !== fetchIdRef.current) return
        setLoading(false)
      })
  }, [page, activeQ])

  // -------------------------------------------------------------------------
  // processScan(barcode)
  // Busca el código de barras escaneado y, si existe, lo añade al carrito.
  // Da feedback con pitido y color del borde (verde éxito / rojo error).
  // useCallback evita recrear la función en cada render salvo que cambie
  // la dependencia (addItem).
  // -------------------------------------------------------------------------
  const processScan = useCallback(async (barcode) => {
    // Desactivamos el modo "escaneando" porque ya vamos a procesarlo.
    isScanningRef.current = false
    setLoading(true)
    try {
      // Buscamos por el código de barras (búsqueda exacta de coincidencia).
      const data = await buscarProductos(barcode)
      // Normalizamos la respuesta: a veces es un array y a veces un objeto
      // con la propiedad "items".
      const arr = Array.isArray(data) ? data : (data.items || [])
      if (arr.length > 0) {
        // Producto encontrado: lo añadimos al carrito.
        addItem(arr[0])
        // Limpiamos el buscador y volvemos a la primera página.
        setQuery('')
        setPage(1)
        // Feedback visual: borde verde con animación de destello.
        setScanState('success')
        beep(1400, 50)   // Pitido agudo corto = éxito.
        setTimeout(() => setScanState('idle'), 300)
      } else {
        // Código no encontrado: borde rojo y pitido grave.
        setScanState('error')
        beep(350, 120)
        setTimeout(() => setScanState('idle'), 400)
      }
    } catch {
      // Error de red o del servidor: mismo feedback que "no encontrado".
      setScanState('error')
      beep(350, 120)
      setTimeout(() => setScanState('idle'), 400)
    } finally {
      setLoading(false)
      // Devolvemos el foco al input para seguir escaneando.
      inputRef.current?.focus()
    }
  }, [addItem])

  // -------------------------------------------------------------------------
  // goToPage(p)
  // Cambia de página en el catálogo, respetando los límites.
  // -------------------------------------------------------------------------
  function goToPage(p) {
    if (p < 1 || p > totalPages) return
    setPage(p)
  }

  // -------------------------------------------------------------------------
  // handleChange(e)
  // Se ejecuta en cada tecla del input. Sirve tanto para escribir normal
  // como para detectar el "disparo" rápido de teclas de un lector de código.
  // -------------------------------------------------------------------------
  function handleChange(e) {
    const value = e.target.value
    setQuery(value)
    // Con menos de 2 caracteres volvemos a la primera página.
    if (value.length < 2 || value === '') {
      setPage(1)
    }

    // Detección de escaneo: medimos el tiempo entre teclas pulsadas.
    const now = performance.now()
    const elapsed = now - lastKeyTimeRef.current
    // Si el hueco entre dos teclas es menor que el umbral y ya había teclas
    // previas, entendemos que está llegando un código de barras.
    if (elapsed < SCAN_THRESHOLD && lastKeyTimeRef.current > 0) {
      isScanningRef.current = true
    }
    // Actualizamos la marca de tiempo de la última tecla.
    lastKeyTimeRef.current = now
  }

  // -------------------------------------------------------------------------
  // handleKeyDown(e)
  // Al pulsar "Enter":
  //   - Si venía un escaneo: procesamos el código completo.
  //   - Si no: añadimos el primer resultado de la lista al carrito.
  // -------------------------------------------------------------------------
  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      // Modo escáner: el código está completo, lo procesamos.
      if (isScanningRef.current) {
        e.preventDefault()
        const barcode = query
        // Solo procesamos si el código tiene sentido (más de 2 caracteres).
        if (barcode.length > 2) {
          setQuery('')
          processScan(barcode)
        }
        return
      }

      // Modo búsqueda normal: añadimos el primer resultado de la lista.
      if (items.length > 0) {
        addItem(items[0])
        setQuery('')
        setPage(1)
        inputRef.current?.focus()
      }
    }
  }

  // Color del borde del input según el estado del escáner.
  let borderColor = 'border-[#e0dad3]'
  if (scanState === 'success') borderColor = 'border-[#2d6e2d]'   // Verde éxito
  else if (scanState === 'error') borderColor = 'border-[#b84a2c]' // Rojo error

  return (
    <div className="flex flex-col h-full">
      {/* Barra de búsqueda */}
      <div className="px-4 pt-4 pb-3">
        <div className="relative max-w-2xl">
          {/* Icono de lupa; cambia de color según el estado del escáner */}
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={scanState === 'success' ? '#2d6e2d' : scanState === 'error' ? '#b84a2c' : '#9c928a'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {/* Input de búsqueda / escaneo */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Buscar producto o escanear código"
            className={`w-full pl-10 pr-4 py-3 text-[15px] rounded-xl border-2 focus:outline-none bg-white text-[#1c1a18] placeholder-[#9c928a] font-medium transition-all duration-150 ${borderColor} ${scanState === 'idle' ? 'focus:border-[#c73e3e]' : ''}`}
            autoComplete="off"
            spellCheck="false"
          />
          {/* Icono de código de barras a la derecha cuando no hay búsqueda */}
          {!activeQ && scanState === 'idle' && (
            <svg className="absolute right-3.5 top-1/2 -translate-y-1/2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d4cdc6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 22L9 15" /><path d="M15 9L22 2" /><path d="M12 20L20 12" /><path d="M4 12L12 4" /><rect x="9" y="9" width="6" height="6" rx="1" />
            </svg>
          )}
          {/* Check verde animado cuando el escaneo tiene éxito */}
          {scanState === 'success' && (
            <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-scan-flash" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2d6e2d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {/* Equis roja cuando el código no se encuentra */}
          {scanState === 'error' && (
            <svg className="absolute right-3.5 top-1/2 -translate-y-1/2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b84a2c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
        </div>
      </div>

      {/* Zona de resultados con scroll */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-4">
        {/* Spinner de carga */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-[#c73e3e] border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-sm text-[#9c928a] font-medium">{activeQ ? 'Buscando...' : 'Cargando...'}</span>
          </div>
        )}

        {/* Estado vacío: sin resultados o sin productos en el catálogo */}
        {!loading && items.length === 0 && (
          <div className="text-center py-16">
            {/* Icono de caja vacía */}
            <svg className="w-10 h-10 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="#d4cdc6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {activeQ ? (
              /* Mensaje cuando la búsqueda no da resultados */
              <p className="text-sm text-[#9c928a] font-medium">
                Sin resultados para <span className="text-[#1c1a18] font-semibold">"{query}"</span>
              </p>
            ) : (
              /* Mensaje cuando el catálogo está vacío */
              <>
                <p className="text-sm text-[#9c928a] font-medium">No hay productos en el catálogo</p>
                <p className="text-xs text-[#beb5ad] mt-1">Pide al administrador que agregue inventario</p>
              </>
            )}
          </div>
        )}

        {/* Lista de productos con paginación */}
        {!loading && items.length > 0 && (
          <>
            {/* Cada producto es un botón que lo añade al carrito */}
            <div className="divide-y divide-[#e0dad3]/60">
              {items.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    addItem(p)
                    inputRef.current?.focus()
                  }}
                  className="w-full flex items-center gap-4 py-3 px-1 text-left hover:bg-[#eae6df] transition-colors active:bg-[#e0dad3] group cursor-pointer"
                >
                  {/* Nombre y código de barras del producto */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1c1a18] text-[15px] leading-tight truncate">{p.nombre}</p>
                    {p.codigo_barras && (
                      <p className="text-[11px] text-[#9c928a] mt-0.5 font-[family-name:var(--font-mono)] tracking-tight">{p.codigo_barras}</p>
                    )}
                  </div>
                  {/* Precio, stock disponible y etiqueta "Añadir" */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="bg-white px-2.5 py-1 rounded-md text-sm font-bold text-[#1c1a18] font-[family-name:var(--font-mono)] tracking-tight shadow-sm">
                      ${Number(p.precio_venta).toFixed(2)}
                    </span>
                    <span className="text-xs text-[#beb5ad] font-[family-name:var(--font-mono)] tabular-nums w-14 text-right">
                      {p.stock_actual} uds.
                    </span>
                    {/* "Añadir" solo aparece al pasar el ratón (group-hover) */}
                    <span className="text-xs font-semibold text-[#c73e3e] opacity-0 group-hover:opacity-100 transition-opacity w-12 text-right">
                      + Añadir
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Controles de paginación: anterior / página / siguiente */}
            <div className="flex items-center justify-center gap-3 mt-5 pb-2">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1} // En la primera página no se puede ir atrás
                className="px-4 py-2 text-xs font-bold rounded-lg transition-all tracking-wide disabled:opacity-25 disabled:cursor-not-allowed bg-[#1c1a18] text-[#e8e3dd] hover:bg-[#c73e3e] hover:text-white active:scale-95 font-[family-name:var(--font-mono)]"
              >
                ← ANT
              </button>
              <span className="text-xs font-medium text-[#9c928a] font-[family-name:var(--font-mono)] tabular-nums">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages} // En la última página no se avanza
                className="px-4 py-2 text-xs font-bold rounded-lg transition-all tracking-wide disabled:opacity-25 disabled:cursor-not-allowed bg-[#1c1a18] text-[#e8e3dd] hover:bg-[#c73e3e] hover:text-white active:scale-95 font-[family-name:var(--font-mono)]"
              >
                SIG →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
