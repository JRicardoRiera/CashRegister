-- =============================================================================
-- Web Cash Register - Migración: movimientos_stock
-- -----------------------------------------------------------------------------
-- RF-INV-03: Ajuste manual de inventario con trazabilidad
--
-- Añade la tabla "movimientos_stock", que registra CADA ajuste de stock que
-- hace un administrador (entradas, salidas y correcciones). Al guardar el
-- stock anterior y el resultante, más quién lo hizo y por qué, queda un
-- historial auditable de todos los cambios de inventario.
--
-- Ejecutar en: Supabase SQL Editor (después de 01_ddl_unificado.sql)
-- =============================================================================

-- Tabla de movimientos de stock
-- ---------------------------------------------------------------------------
--   - tipo: 'entrada' (suma), 'salida' (resta) o 'ajuste' (fija el valor).
--   - cantidad: unidades movidas en la operación.
--   - stock_anterior / stock_resultante: antes y después (para auditar).
--   - motivo: justificación obligatoria del ajuste.
--   - usuario_id: el administrador que realizó el ajuste (RESTRICT: si se
--     intenta borrar ese perfil y tiene movimientos, se bloquea).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.movimientos_stock (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    producto_id BIGINT NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste')),
    cantidad INT NOT NULL,
    stock_anterior INT NOT NULL,
    stock_resultante INT NOT NULL,
    motivo TEXT NOT NULL,
    usuario_id UUID NOT NULL REFERENCES public.perfiles(id),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de rendimiento
-- ---------------------------------------------------------------------------
-- Aceleran la búsqueda de movimientos por producto y los listados por fecha
-- (el dashboard y los informes consultan por estas columnas).
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_movimientos_stock_producto ON public.movimientos_stock(producto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_stock_fecha ON public.movimientos_stock(creado_en DESC);

-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
-- Activamos RLS y la forzamos (FORCE) para que ni el owner la salte, igual
-- que en el resto de tablas. Sin políticas, RLS deniega todo por defecto.
-- ---------------------------------------------------------------------------
ALTER TABLE public.movimientos_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_stock FORCE ROW LEVEL SECURITY;

-- Política de lectura: cualquier usuario autenticado puede ver los
-- movimientos (el backend filtra después por rol si hace falta).
DROP POLICY IF EXISTS "Lectura movimientos para usuarios autenticados" ON public.movimientos_stock;
CREATE POLICY "Lectura movimientos para usuarios autenticados"
ON public.movimientos_stock FOR SELECT TO authenticated USING (true);

-- Política de escritura: solo los administradores pueden registrar ajustes
-- (usa la función auxiliar obtener_mi_rol definida en 01_ddl_unificado.sql).
DROP POLICY IF EXISTS "Escritura movimientos solo para Administradores" ON public.movimientos_stock;
CREATE POLICY "Escritura movimientos solo para Administradores"
ON public.movimientos_stock FOR INSERT TO authenticated
WITH CHECK ((SELECT public.obtener_mi_rol()) = 'administrador');
