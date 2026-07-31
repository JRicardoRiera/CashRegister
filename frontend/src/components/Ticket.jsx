// ============================================================================
// Ticket.jsx - Ticket de venta imprimible
// ----------------------------------------------------------------------------
// Muestra el ticket de una venta en formato compacto, pensado para imprimir
// en una impresora térmica de 80 mm (ver las reglas @media print en
// index.css). Recibe el objeto "venta" devuelto por el backend con su
// detalle (líneas de productos, subtotal, IVA, total, método de pago...).
// ============================================================================

// Componente "Ticket". Props: venta (objeto de la venta) y onClose.
export default function Ticket({ venta, onClose }) {
  // Si no hay venta, no renderizamos nada.
  if (!venta) return null

  // Imprime el documento usando el diálogo de impresión del navegador.
  // Las reglas CSS de @media print de index.css ocultan toda la página
  // y dejan visible únicamente el bloque .ticket-content.
  const handlePrint = () => window.print()

  return (
    // Fondo oscuro semi-transparente con desenfoque, como los otros modales.
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      {/* Papel del ticket: fondo claro, ancho reducido estilo rollo */}
      <div className="w-full max-w-xs" style={{ background: '#faf6f0' }}>
        {/* Contenido imprimible (clase usada por @media print) */}
        <div className="p-5 ticket-content">
          {/* Cabecera del ticket: nombre de la tienda */}
          <div className="text-center border-b border-dashed border-[#d4cdc6] pb-4 mb-4">
            <h2 className="text-base font-bold text-[#1c1a18]" style={{ fontFamily: 'system-ui, sans-serif' }}>CashRegister</h2>
            <p className="text-[10px] text-[#6b6460] mt-0.5">Ticket de venta</p>
          </div>

          {/* Folio y fecha de la venta.
              toLocaleString('es-MX') formatea la fecha según la convención
              de México (dd/mm/aaaa hh:mm). */}
          <div className="text-[10px] text-[#6b6460] mb-3 flex justify-between">
            <span className="font-[family-name:var(--font-mono)]">#{venta.id}</span>
            <span>{new Date(venta.fecha_hora).toLocaleString('es-MX')}</span>
          </div>

          {/* Tabla con las líneas del ticket: cantidad, producto, precio e
              importe de cada línea */}
          <table className="w-full text-[10px] mb-4">
            <thead>
              <tr className="border-b border-[#d4cdc6]">
                <th className="text-left py-1 font-semibold text-[#6b6460]">Cant</th>
                <th className="text-left py-1 font-semibold text-[#6b6460]">Producto</th>
                <th className="text-right py-1 font-semibold text-[#6b6460]">Precio</th>
                <th className="text-right py-1 font-semibold text-[#6b6460]">Importe</th>
              </tr>
            </thead>
            <tbody>
              {/* Renderizamos una fila por cada línea del detalle de la venta */}
              {venta.detalles?.map((d, i) => (
                <tr key={i}>
                  <td className="py-1 font-[family-name:var(--font-mono)] tabular-nums">{d.cantidad}</td>
                  {/* Mostramos el nombre del producto o, si no viene, su id */}
                  <td className="py-1 truncate max-w-[120px]">{d.producto_nombre || `#${d.producto_id}`}</td>
                  <td className="py-1 text-right font-[family-name:var(--font-mono)] tabular-nums">${Number(d.precio_unitario).toFixed(2)}</td>
                  {/* Importe de la línea = cantidad x precio unitario */}
                  <td className="py-1 text-right font-medium font-[family-name:var(--font-mono)] tabular-nums">
                    ${(d.cantidad * Number(d.precio_unitario)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Resumen económico: subtotal, IVA, total, método y cambio */}
          <div className="border-t border-dashed border-[#d4cdc6] pt-3 space-y-1 text-xs">
            <div className="flex justify-between text-[#6b6460]">
              <span>Subtotal</span>
              <span className="font-[family-name:var(--font-mono)] tabular-nums">${Number(venta.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#6b6460]">
              <span>IVA (15%)</span>
              <span className="font-[family-name:var(--font-mono)] tabular-nums">${Number(venta.impuestos).toFixed(2)}</span>
            </div>
            {/* Total destacado con borde superior */}
            <div className="flex justify-between text-base font-bold border-t border-[#d4cdc6] pt-2 text-[#1c1a18]">
              <span>Total</span>
              <span className="font-[family-name:var(--font-mono)] tabular-nums">${Number(venta.total).toFixed(2)}</span>
            </div>
            {/* Método de pago; capitalize pone la primera letra en mayúscula */}
            <div className="flex justify-between text-[10px] text-[#6b6460] pt-1">
              <span>Método de pago</span>
              <span className="capitalize">{venta.metodo_pago}</span>
            </div>
            {/* Monto recibido (solo si el backend lo envió) */}
            {venta.monto_recibido && (
              <div className="flex justify-between text-[10px] text-[#6b6460]">
                <span>Recibido</span>
                <span className="font-[family-name:var(--font-mono)] tabular-nums">${Number(venta.monto_recibido).toFixed(2)}</span>
              </div>
            )}
            {/* Cambio devuelto (solo si existe y es mayor que 0), en verde */}
            {venta.cambio_entregado && Number(venta.cambio_entregado) > 0 && (
              <div className="flex justify-between text-[10px] font-medium" style={{ color: '#2d6e2d' }}>
                <span>Cambio</span>
                <span className="font-[family-name:var(--font-mono)] tabular-nums">${Number(venta.cambio_entregado).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Botones de acción debajo del ticket (no se imprimen) */}
        <div className="px-5 py-4 border-t border-[#d4cdc6] flex gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 rounded-lg font-bold text-sm transition-colors"
            style={{ background: '#1c1a18', color: '#f7f5f0' }}
          >
            Imprimir
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg font-bold text-sm transition-colors"
            style={{ background: '#e0dad3', color: '#1c1a18' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
