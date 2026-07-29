-- =============================================================================
-- Web Cash Register - DDL Unificado para Supabase PostgreSQL 15+
-- Basado en: EspecificacionesBBDD.md
-- Ejecutar en: Supabase SQL Editor
-- =============================================================================

-- Habilitar extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. TIPOS ENUM (con DO block para ser idempotente)
-- =============================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rol_usuario') THEN
    CREATE TYPE rol_usuario AS ENUM ('administrador', 'cajero');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'metodo_pago_enum') THEN
    CREATE TYPE metodo_pago_enum AS ENUM ('efectivo', 'tarjeta', 'transferencia');
  END IF;
END $$;

-- =============================================================================
-- 2. TABLA: perfiles
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre_completo TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    rol rol_usuario NOT NULL DEFAULT 'cajero',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 3. TABLA: categorias
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.categorias (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 4. TABLA: productos
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.productos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_barras VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    categoria_id BIGINT REFERENCES public.categorias(id) ON DELETE SET NULL,
    precio_compra NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CONSTRAINT chk_precio_compra_positivo CHECK (precio_compra >= 0),
    precio_venta NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CONSTRAINT chk_precio_venta_valido CHECK (precio_venta >= precio_compra),
    stock_actual INT NOT NULL DEFAULT 0 CONSTRAINT chk_stock_no_negativo CHECK (stock_actual >= 0),
    stock_minimo INT NOT NULL DEFAULT 5 CONSTRAINT chk_stock_minimo_valido CHECK (stock_minimo >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 5. TABLA: ventas
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ventas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE RESTRICT,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    impuestos NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (impuestos >= 0),
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
    metodo_pago metodo_pago_enum NOT NULL DEFAULT 'efectivo',
    monto_recibido NUMERIC(12, 2) NOT NULL CHECK (monto_recibido >= 0),
    cambio_entregado NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (cambio_entregado >= 0),
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 6. TABLA: detalle_ventas
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.detalle_ventas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    venta_id BIGINT NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
    producto_id BIGINT NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
    cantidad INT NOT NULL CONSTRAINT chk_cantidad_positiva CHECK (cantidad > 0),
    precio_unitario NUMERIC(12, 2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0)
);

-- =============================================================================
-- 7. ÍNDICES DE RENDIMIENTO
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_productos_codigo_barras ON public.productos(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON public.productos USING gin (to_tsvector('spanish', nombre));
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON public.productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON public.ventas(fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_ventas_usuario ON public.ventas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_detalle_ventas_venta ON public.detalle_ventas(venta_id);
CREATE INDEX IF NOT EXISTS idx_detalle_ventas_producto ON public.detalle_ventas(producto_id);

-- =============================================================================
-- 8. FUNCIÓN: actualizar_timestamp (trigger automático)
-- =============================================================================
CREATE OR REPLACE FUNCTION actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_productos_timestamp ON public.productos;
CREATE TRIGGER trg_actualizar_productos_timestamp
BEFORE UPDATE ON public.productos
FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

DROP TRIGGER IF EXISTS trg_actualizar_perfiles_timestamp ON public.perfiles;
CREATE TRIGGER trg_actualizar_perfiles_timestamp
BEFORE UPDATE ON public.perfiles
FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

-- =============================================================================
-- 9. FUNCIÓN: descontar_stock_venta (trigger automático)
-- =============================================================================
CREATE OR REPLACE FUNCTION descontar_stock_venta()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT stock_actual FROM public.productos WHERE id = NEW.producto_id) < NEW.cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para el producto ID %', NEW.producto_id;
    END IF;

    UPDATE public.productos
    SET stock_actual = stock_actual - NEW.cantidad
    WHERE id = NEW.producto_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_descontar_stock_venta ON public.detalle_ventas;
CREATE TRIGGER trg_descontar_stock_venta
BEFORE INSERT ON public.detalle_ventas
FOR EACH ROW EXECUTE FUNCTION descontar_stock_venta();

-- =============================================================================
-- 10. ROW LEVEL SECURITY (RLS)
-- =============================================================================
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_ventas ENABLE ROW LEVEL SECURITY;

-- Función auxiliar para obtener el rol del usuario autenticado
-- SECURITY DEFINER para leer perfiles aunque RLS esté activo en esa tabla
-- set search_path evita ataques de búsqueda de esquemas maliciosos
CREATE OR REPLACE FUNCTION public.obtener_mi_rol()
RETURNS rol_usuario
LANGUAGE sql
SECURITY DEFINER
set search_path = ''
AS $$
  SELECT rol FROM public.perfiles WHERE id = (SELECT auth.uid());
$$;

-- Revocar ejecución directa de roles públicos (solo se usa internamente en políticas)
REVOKE EXECUTE ON FUNCTION public.obtener_mi_rol() FROM PUBLIC, anon;

-- Índice para la columna usada en RLS policies
CREATE INDEX IF NOT EXISTS idx_perfiles_rol ON public.perfiles(rol);

-- Forzar RLS también para el owner de las tablas
ALTER TABLE public.perfiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.productos FORCE ROW LEVEL SECURITY;
ALTER TABLE public.categorias FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ventas FORCE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_ventas FORCE ROW LEVEL SECURITY;

-- NOTA: envolver (SELECT fn()) evita que la función se evalúe por cada fila
-- y se ejecute una sola vez por consulta, mejorando 5-10x el rendimiento

-- Políticas: Productos (lectura para todos, escritura solo admins)
DROP POLICY IF EXISTS "Lectura productos para usuarios autenticados" ON public.productos;
CREATE POLICY "Lectura productos para usuarios autenticados"
ON public.productos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Escritura productos solo para Administradores" ON public.productos;
CREATE POLICY "Escritura productos solo para Administradores"
ON public.productos FOR ALL TO authenticated
USING ((SELECT public.obtener_mi_rol()) = 'administrador')
WITH CHECK ((SELECT public.obtener_mi_rol()) = 'administrador');

-- Políticas: Categorías (lectura para todos, escritura solo admins)
DROP POLICY IF EXISTS "Lectura categorias para usuarios autenticados" ON public.categorias;
CREATE POLICY "Lectura categorias para usuarios autenticados"
ON public.categorias FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Escritura categorias solo para Administradores" ON public.categorias;
CREATE POLICY "Escritura categorias solo para Administradores"
ON public.categorias FOR ALL TO authenticated
USING ((SELECT public.obtener_mi_rol()) = 'administrador')
WITH CHECK ((SELECT public.obtener_mi_rol()) = 'administrador');

-- Políticas: Ventas (autenticados pueden crear y ver)
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear ventas" ON public.ventas;
CREATE POLICY "Usuarios autenticados pueden crear ventas"
ON public.ventas FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver ventas" ON public.ventas;
CREATE POLICY "Usuarios autenticados pueden ver ventas"
ON public.ventas FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Solo admins pueden modificar ventas" ON public.ventas;
CREATE POLICY "Solo admins pueden modificar ventas"
ON public.ventas FOR UPDATE TO authenticated
USING ((SELECT public.obtener_mi_rol()) = 'administrador')
WITH CHECK ((SELECT public.obtener_mi_rol()) = 'administrador');

-- Políticas: Detalle de ventas (autenticados pueden insertar y ver)
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar detalle" ON public.detalle_ventas;
CREATE POLICY "Usuarios autenticados pueden insertar detalle"
ON public.detalle_ventas FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver detalle" ON public.detalle_ventas;
CREATE POLICY "Usuarios autenticados pueden ver detalle"
ON public.detalle_ventas FOR SELECT TO authenticated USING (true);

-- Políticas: Perfiles (solo el propio usuario y admins pueden ver/editar)
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON public.perfiles;
CREATE POLICY "Usuarios pueden ver su propio perfil"
ON public.perfiles FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()) OR (SELECT public.obtener_mi_rol()) = 'administrador');

DROP POLICY IF EXISTS "Solo admins pueden modificar perfiles" ON public.perfiles;
CREATE POLICY "Solo admins pueden modificar perfiles"
ON public.perfiles FOR UPDATE TO authenticated
USING ((SELECT public.obtener_mi_rol()) = 'administrador')
WITH CHECK ((SELECT public.obtener_mi_rol()) = 'administrador');

-- =============================================================================
-- 11. TRIGGER: auto-creación de perfil al registrarse en Supabase Auth
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre_completo, email, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    CASE WHEN (SELECT COUNT(*) FROM public.perfiles) = 0
         THEN 'administrador'
         ELSE 'cajero'
    END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 12. DATOS INICIALES (Opcional - ejecutar después de crear usuarios)
-- =============================================================================
-- Insertar categorías de ejemplo (descomentar para usar)
-- INSERT INTO public.categorias (nombre, descripcion) VALUES
--     ('Bebidas', 'Refrescos, jugos y aguas'),
--     ('Alimentos', 'Snacks, botanas y comidas'),
--     ('Lácteos', 'Leche, yogurts y quesos'),
--     ('Limpieza', 'Productos de limpieza e higiene');
