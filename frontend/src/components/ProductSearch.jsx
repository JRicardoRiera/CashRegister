import { useState, useRef, useEffect, useCallback } from 'react'
import { buscarProductos } from '../lib/api'
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

export default function ProductSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [scanState, setScanState] = useState('idle')
  const inputRef = useRef(null)
  const addItem = useCartStore((s) => s.addItem)
  const timerRef = useRef(null)
  const lastKeyTimeRef = useRef(0)
  const isScanningRef = useRef(false)

  const SCAN_THRESHOLD = 40

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      if (isScanningRef.current) return
      setLoading(true)
      try {
        const data = await buscarProductos(query)
        setResults(data)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => clearTimeout(timerRef.current)
  }, [query])

  const processScan = useCallback(async (barcode) => {
    isScanningRef.current = false

    setLoading(true)
    try {
      const data = await buscarProductos(barcode)
      if (data.length > 0) {
        addItem(data[0])
        setQuery('')
        setResults([])
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

  function handleChange(e) {
    const value = e.target.value
    setQuery(value)

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

      if (results.length > 0) {
        addItem(results[0])
        setQuery('')
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
            placeholder="Buscar por nombre o código de barras..."
            className={`w-full pl-10 pr-4 py-3 text-[15px] rounded-xl border-2 focus:outline-none bg-white text-[#1c1a18] placeholder-[#9c928a] font-medium transition-all duration-150 ${borderColor} ${scanState === 'idle' ? 'focus:border-[#c73e3e]' : ''}`}
            autoComplete="off"
            spellCheck="false"
          />
          {query.length < 2 && scanState === 'idle' && (
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
            <span className="ml-3 text-sm text-[#9c928a] font-medium">Buscando...</span>
          </div>
        )}

        {!loading && query.length >= 2 && results.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-10 h-10 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="#d4cdc6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" />
            </svg>
            <p className="text-sm text-[#9c928a] font-medium">Sin resultados para <span className="text-[#1c1a18] font-semibold">"{query}"</span></p>
          </div>
        )}

        {!loading && query.length < 2 && (
          <div className="text-center py-16">
            <svg className="w-12 h-12 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="#d4cdc6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <p className="text-sm text-[#9c928a] font-medium">Escanea o busca un producto</p>
            <p className="text-xs text-[#beb5ad] mt-1">Escribe al menos 2 caracteres</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {results.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  addItem(p)
                  setQuery('')
                  inputRef.current?.focus()
                }}
                className="bg-white border-2 border-[#e0dad3] rounded-xl p-4 text-left hover:border-[#c73e3e] hover:shadow-lg hover:shadow-[#c73e3e]/5 transition-all active:scale-[0.98] group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#1c1a18] truncate text-[15px]">{p.nombre}</p>
                    {p.codigo_barras && (
                      <p className="text-xs text-[#9c928a] mt-0.5 font-[family-name:var(--font-mono)]">{p.codigo_barras}</p>
                    )}
                  </div>
                  <svg className="w-5 h-5 text-[#c73e3e] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xl font-bold text-[#1c1a18] font-[family-name:var(--font-mono)] tracking-tight">
                    ${Number(p.precio_venta).toFixed(2)}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: p.stock_actual <= p.stock_minimo ? '#fde8d9' : '#e4f0e4', color: p.stock_actual <= p.stock_minimo ? '#b84a2c' : '#2d6e2d' }}>
                    {p.stock_actual} uds.
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
