import { useState, useRef, useEffect, useCallback } from 'react'
import { listarProductos, buscarProductos } from '../lib/api'
import useCartStore from '../store/cartStore'

function beep(freq = 1200, duration = 60) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = freq
    gain.gain.value = 0.06
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration / 1000)
  } catch {
    /* silent fail */
  }
}

const PER_PAGE = 20

export default function ProductSearch() {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [scanState, setScanState] = useState('idle')
  const inputRef = useRef(null)
  const addItem = useCartStore((s) => s.addItem)
  const lastKeyTimeRef = useRef(0)
  const isScanningRef = useRef(false)
  const fetchIdRef = useRef(0)

  const SCAN_THRESHOLD = 40
  const activeQ = query.length >= 2 ? query : ''

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
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

  const processScan = useCallback(async (barcode) => {
    isScanningRef.current = false
    setLoading(true)
    try {
      const data = await buscarProductos(barcode)
      const arr = Array.isArray(data) ? data : (data.items || [])
      if (arr.length > 0) {
        addItem(arr[0])
        setQuery('')
        setPage(1)
        setScanState('success')
        beep(1400, 50)
        setTimeout(() => setScanState('idle'), 300)
      } else {
        setScanState('error')
        beep(350, 120)
        setTimeout(() => setScanState('idle'), 400)
      }
    } catch {
      setScanState('error')
      beep(350, 120)
      setTimeout(() => setScanState('idle'), 400)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [addItem])

  function goToPage(p) {
    if (p < 1 || p > totalPages) return
    setPage(p)
  }

  function handleChange(e) {
    const value = e.target.value
    setQuery(value)
    if (value.length < 2 || value === '') {
      setPage(1)
    }

    const now = performance.now()
    const elapsed = now - lastKeyTimeRef.current
    if (elapsed < SCAN_THRESHOLD && lastKeyTimeRef.current > 0) {
      isScanningRef.current = true
    }
    lastKeyTimeRef.current = now
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      if (isScanningRef.current) {
        e.preventDefault()
        const barcode = query
        if (barcode.length > 2) {
          setQuery('')
          processScan(barcode)
        }
        return
      }

      if (items.length > 0) {
        addItem(items[0])
        setQuery('')
        setPage(1)
        inputRef.current?.focus()
      }
    }
  }

  let borderColor = 'border-[#e0dad3]'
  if (scanState === 'success') borderColor = 'border-[#2d6e2d]'
  else if (scanState === 'error') borderColor = 'border-[#b84a2c]'

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3">
        <div className="relative max-w-2xl">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={scanState === 'success' ? '#2d6e2d' : scanState === 'error' ? '#b84a2c' : '#9c928a'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
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
          {!activeQ && scanState === 'idle' && (
            <svg className="absolute right-3.5 top-1/2 -translate-y-1/2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d4cdc6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 22L9 15" /><path d="M15 9L22 2" /><path d="M12 20L20 12" /><path d="M4 12L12 4" /><rect x="9" y="9" width="6" height="6" rx="1" />
            </svg>
          )}
          {scanState === 'success' && (
            <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-scan-flash" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2d6e2d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {scanState === 'error' && (
            <svg className="absolute right-3.5 top-1/2 -translate-y-1/2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b84a2c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-4">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-[#c73e3e] border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-sm text-[#9c928a] font-medium">{activeQ ? 'Buscando...' : 'Cargando...'}</span>
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-10 h-10 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="#d4cdc6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {activeQ ? (
              <p className="text-sm text-[#9c928a] font-medium">
                Sin resultados para <span className="text-[#1c1a18] font-semibold">"{query}"</span>
              </p>
            ) : (
              <>
                <p className="text-sm text-[#9c928a] font-medium">No hay productos en el catálogo</p>
                <p className="text-xs text-[#beb5ad] mt-1">Pide al administrador que agregue inventario</p>
              </>
            )}
          </div>
        )}

        {!loading && items.length > 0 && (
          <>
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
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1c1a18] text-[15px] leading-tight truncate">{p.nombre}</p>
                    {p.codigo_barras && (
                      <p className="text-[11px] text-[#9c928a] mt-0.5 font-[family-name:var(--font-mono)] tracking-tight">{p.codigo_barras}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="bg-white px-2.5 py-1 rounded-md text-sm font-bold text-[#1c1a18] font-[family-name:var(--font-mono)] tracking-tight shadow-sm">
                      ${Number(p.precio_venta).toFixed(2)}
                    </span>
                    <span className="text-xs text-[#beb5ad] font-[family-name:var(--font-mono)] tabular-nums w-14 text-right">
                      {p.stock_actual} uds.
                    </span>
                    <span className="text-xs font-semibold text-[#c73e3e] opacity-0 group-hover:opacity-100 transition-opacity w-12 text-right">
                      + Añadir
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-center gap-3 mt-5 pb-2">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="px-4 py-2 text-xs font-bold rounded-lg transition-all tracking-wide disabled:opacity-25 disabled:cursor-not-allowed bg-[#1c1a18] text-[#e8e3dd] hover:bg-[#c73e3e] hover:text-white active:scale-95 font-[family-name:var(--font-mono)]"
              >
                ← ANT
              </button>
              <span className="text-xs font-medium text-[#9c928a] font-[family-name:var(--font-mono)] tabular-nums">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
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
