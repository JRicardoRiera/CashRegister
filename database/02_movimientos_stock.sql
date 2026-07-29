-- =============================================================================
-- Web Cash Register - Migración: movimientos_stock
-- RF-INV-03: Ajuste manual de inventario con trazabilidad
-- Ejecutar en: Supabase SQL Editor (después de 01_ddl_unificado.sql)
-- =============================================================================

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

CREATE INDEX IF NOT EXISTS idx_movimientos_stock_producto ON public.movimientos_stock(producto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_stock_fecha ON public.movimientos_stock(creado_en DESC);

ALTER TABLE public.movimientos_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_stock FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura movimientos para usuarios autenticados" ON public.movimientos_stock;
CREATE POLICY "Lectura movimientos para usuarios autenticados"
ON public.movimientos_stock FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Escritura movimientos solo para Administradores" ON public.movimientos_stock;
CREATE POLICY "Escritura movimientos solo para Administradores"
ON public.movimientos_stock FOR INSERT TO authenticated
WITH CHECK ((SELECT public.obtener_mi_rol()) = 'administrador');
