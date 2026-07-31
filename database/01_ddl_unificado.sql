-- =============================================================================
-- Web Cash Register - DDL Unificado para Supabase PostgreSQL 15+
-- -----------------------------------------------------------------------------
-- Este script crea TODA la estructura de la base de datos del sistema POS:
-- tipos enumerados, tablas, índices, funciones, triggers, políticas de
-- seguridad (RLS) y el trigger de auto-creación de perfiles.
--
-- Basado en: EspecificacionesBBDD.md
-- Ejecutar en: Supabase SQL Editor (pegar el contenido completo).
--
-- Idempotencia: la mayoría de sentencias usan IF NOT EXISTS / DROP IF EXISTS,
-- por lo que se puede ejecutar más de una vez sin romper nada.
-- =============================================================================

-- Habilitar la extensión "uuid-ossp" que aporta funciones para generar UUID.
-- (Supabase suele traerla, pero la aseguramos para que no falle el DDL.)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. TIPOS ENUM (con DO block para ser idempotente)
-- -----------------------------------------------------------------------------
-- Los tipos ENUM restringen los valores válidos de una columna a una lista.
-- El bloque DO comprueba antes si el tipo existe para poder ejecutar el
-- script varias veces sin dar error de "already exists".
-- =============================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rol_usuario') THEN
    -- Roles del sistema: un administrador gestiona todo; el cajero solo cobra.
    CREATE TYPE rol_usuario AS ENUM ('administrador', 'cajero');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'metodo_pago_enum') THEN
    -- Formas de pago aceptadas en la caja.
    CREATE TYPE metodo_pago_enum AS ENUM ('efectivo', 'tarjeta', 'transferencia');
  END IF;
END $$;

-- =============================================================================
-- 2. TABLA: perfiles
-- -----------------------------------------------------------------------------
-- Datos ampliados de cada usuario. El id es el mismo UUID que genera
-- Supabase Auth, así que es la clave primaria y referencia a auth.users.
-- ON DELETE CASCADE: si se borra el usuario de Auth, se borra su perfil.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre_completo TEXT NOT NULL,          -- Nombre visible en la app.
    email TEXT UNIQUE NOT NULL,             -- Correo (único, como en Auth).
    rol rol_usuario NOT NULL DEFAULT 'cajero',  -- Por defecto, cajero.
    activo BOOLEAN NOT NULL DEFAULT TRUE,   -- Permite desactivar accesos.
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 3. TABLA: categorias
-- -----------------------------------------------------------------------------
-- Clasificación de los productos. id autogenerado (IDENTITY) como BIGINT,
-- el mismo patrón para todas las tablas de negocio del sistema.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.categorias (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,    -- No puede repetirse el nombre.
    descripcion TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 4. TABLA: productos
-- -----------------------------------------------------------------------------
-- Catálogo de productos con precio de compra/venta, stock e inventario
-- mínimo para alertas. Las constraints CHECK refuerzan reglas de negocio
-- directamente en la base de datos (defensa en profundidad):
--   - Los precios y stocks no pueden ser negativos.
--   - El precio de venta no puede ser menor que el de compra.
-- ON DELETE SET NULL en categoria_id: si se borra una categoría, el producto
-- se queda sin categoría pero no se borra.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.productos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_barras VARCHAR(50) UNIQUE NOT NULL,      -- Para el lector de códigos.
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    categoria_id BIGINT REFERENCES public.categorias(id) ON DELETE SET NULL,
    precio_compra NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CONSTRAINT chk_precio_compra_positivo CHECK (precio_compra >= 0),
    precio_venta NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CONSTRAINT chk_precio_venta_valido CHECK (precio_venta >= precio_compra),
    stock_actual INT NOT NULL DEFAULT 0 CONSTRAINT chk_stock_no_negativo CHECK (stock_actual >= 0),
    stock_minimo INT NOT NULL DEFAULT 5 CONSTRAINT chk_stock_minimo_valido CHECK (stock_minimo >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,           -- Borrado lógico: activo=false.
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 5. TABLA: ventas
-- -----------------------------------------------------------------------------
-- Cabecera de cada ticket: quién la hizo, totales calculados y datos del
-- pago. NUMERIC(12,2) para todo el dinero (nunca FLOAT, evitaría errores
-- de redondeo). ON DELETE RESTRICT: no se puede borrar un perfil que tenga
-- ventas asociadas (integridad del histórico).
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ventas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE RESTRICT,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),        -- Suma de líneas sin IVA.
    impuestos NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (impuestos >= 0),      -- IVA aplicado.
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),              -- Subtotal + impuestos.
    metodo_pago metodo_pago_enum NOT NULL DEFAULT 'efectivo',                   -- Usa el ENUM definido arriba.
    monto_recibido NUMERIC(12, 2) NOT NULL CHECK (monto_recibido >= 0),         -- Dinero entregado.
    cambio_entregado NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (cambio_entregado >= 0),
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW()   -- Momento del cobro (UTC).
);

-- =============================================================================
-- 6. TABLA: detalle_ventas
-- -----------------------------------------------------------------------------
-- Líneas del ticket: cada producto vendido con su cantidad y precio en ese
-- momento (el precio se guarda copiado para que no cambie si el producto
-- se actualiza luego). ON DELETE CASCADE en venta_id: al borrar una venta
-- se borran sus líneas. RESTRICT en producto_id: no se puede borrar un
-- producto que haya sido vendido.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.detalle_ventas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    venta_id BIGINT NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
    producto_id BIGINT NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
    cantidad INT NOT NULL CONSTRAINT chk_cantidad_positiva CHECK (cantidad > 0),
    precio_unitario NUMERIC(12, 2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0)  -- precio_unitario * cantidad.
);

-- =============================================================================
-- 7. ÍNDICES DE RENDIMIENTO
-- -----------------------------------------------------------------------------
-- Aceleran las búsquedas que hace la aplicación:
--   - productos por código de barras (búsqueda exacta del lector).
--   - productos por nombre (índice GIN de texto español para ILIKE rápido).
--   - ventas por fecha (para los filtros del dashboard y el historial).
--   - ventas por usuario (cajero) y detalles por venta/producto.
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
-- -----------------------------------------------------------------------------
-- Actualiza la columna "actualizado_en" cada vez que se modifica una fila.
-- Se aplica mediante triggers en las tablas que tienen esa columna, así el
-- backend no tiene que gestionarlo manualmente.
-- =============================================================================
CREATE OR REPLACE FUNCTION actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();  -- Marcamos la fecha/hora de modificación.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sobre "productos" (BEFORE UPDATE: se dispara antes de guardar).
DROP TRIGGER IF EXISTS trg_actualizar_productos_timestamp ON public.productos;
CREATE TRIGGER trg_actualizar_productos_timestamp
BEFORE UPDATE ON public.productos
FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

-- Trigger sobre "perfiles".
DROP TRIGGER IF EXISTS trg_actualizar_perfiles_timestamp ON public.perfiles;
CREATE TRIGGER trg_actualizar_perfiles_timestamp
BEFORE UPDATE ON public.perfiles
FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

-- =============================================================================
-- 9. FUNCIÓN: descontar_stock_venta (trigger automático)
-- -----------------------------------------------------------------------------
-- Regla de negocio: al insertar una línea de detalle_ventas se descuenta
-- automáticamente esa cantidad del stock del producto. Además, si no hay
-- stock suficiente, se aborta la operación con un error (RAISE EXCEPTION),
-- lo que también revierte la venta completa (transacción).
-- =============================================================================
CREATE OR REPLACE FUNCTION descontar_stock_venta()
RETURNS TRIGGER AS $$
BEGIN
    -- Comprobamos el stock actual frente a la cantidad vendida.
    IF (SELECT stock_actual FROM public.productos WHERE id = NEW.producto_id) < NEW.cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para el producto ID %', NEW.producto_id;
    END IF;

    -- Restamos la cantidad vendida al stock.
    UPDATE public.productos
    SET stock_actual = stock_actual - NEW.cantidad
    WHERE id = NEW.producto_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- El trigger se dispara en cada fila antes de insertarla.
DROP TRIGGER IF EXISTS trg_descontar_stock_venta ON public.detalle_ventas;
CREATE TRIGGER trg_descontar_stock_venta
BEFORE INSERT ON public.detalle_ventas
FOR EACH ROW EXECUTE FUNCTION descontar_stock_venta();

-- =============================================================================
-- 10. ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------------------------
-- Capa de seguridad a nivel de fila: define QUÉ filas puede ver o modificar
-- cada usuario autenticado, incluso si tiene el token. Sin políticas, RLS
-- deniega TODO por defecto.
--
-- Habilitamos RLS y la forzamos (FORCE) para que tampoco el owner de las
-- tablas la salte: la única vía de acceso es a través de las políticas o
-- de funciones SECURITY DEFINER.
-- =============================================================================
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_ventas ENABLE ROW LEVEL SECURITY;

-- Función auxiliar para obtener el rol del usuario autenticado
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER: se ejecuta con los privilegios del creador, así puede
-- leer "perfiles" aunque la propia RLS se lo denegaría a un SELECT normal.
-- "set search_path = ''" evita ataques de búsqueda de esquemas maliciosos
-- (hace que todas las referencias deban estar calificadas con esquema).
-- Devuelve NULL si el usuario no tiene perfil.
-- ---------------------------------------------------------------------------
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

-- Índice para la columna usada en RLS policies (acelera obtener_mi_rol)
CREATE INDEX IF NOT EXISTS idx_perfiles_rol ON public.perfiles(rol);

-- Forzar RLS también para el owner de las tablas
ALTER TABLE public.perfiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.productos FORCE ROW LEVEL SECURITY;
ALTER TABLE public.categorias FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ventas FORCE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_ventas FORCE ROW LEVEL SECURITY;

-- NOTA: envolver (SELECT fn()) evita que la función se evalúe por cada fila
-- y se ejecute una sola vez por consulta, mejorando 5-10x el rendimiento.

-- Políticas: Productos (lectura para todos, escritura solo admins)
-- ---------------------------------------------------------------------------
-- Cualquier usuario autenticado puede LEER productos; solo los administradores
-- pueden crearlos, editarlos o desactivarlos.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Lectura productos para usuarios autenticados" ON public.productos;
CREATE POLICY "Lectura productos para usuarios autenticados"
ON public.productos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Escritura productos solo para Administradores" ON public.productos;
CREATE POLICY "Escritura productos solo para Administradores"
ON public.productos FOR ALL TO authenticated
USING ((SELECT public.obtener_mi_rol()) = 'administrador')   -- Filas afectadas.
WITH CHECK ((SELECT public.obtener_mi_rol()) = 'administrador');  -- Filas nuevas.

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
-- ---------------------------------------------------------------------------
-- Cualquier usuario autenticado (cajero o admin) puede INSERTAR y LEER
-- ventas. Solo los administradores pueden modificarlas (p.ej. anular).
-- ---------------------------------------------------------------------------
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
-- ---------------------------------------------------------------------------
-- Cada usuario ve su propio perfil (id = auth.uid()); los administradores
-- ven todos. Solo los administradores pueden editar perfiles (cambiar rol,
-- activar/desactivar).
-- ---------------------------------------------------------------------------
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
-- -----------------------------------------------------------------------------
-- Cuando Supabase Auth inserta un usuario (registro), este trigger crea su
-- fila en "perfiles" automáticamente:
--   - El nombre inicial sale de la parte local del email (antes de @).
--   - El rol se decide por orden de registro: el primer usuario del sistema
--     es administrador; todos los demás, cajero.
-- SECURITY DEFINER: necesario para insertar en "perfiles" con RLS activa.
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
    NEW.id,                                   -- El mismo UUID de auth.users.
    split_part(NEW.email, '@', 1),            -- Nombre provisional: parte del email.
    NEW.email,
    CASE WHEN (SELECT COUNT(*) FROM public.perfiles) = 0
         THEN 'administrador'::rol_usuario   -- Primer usuario -> administrador.
         ELSE 'cajero'::rol_usuario
    END
  );
  RETURN NEW;
END;
$$;

-- Se dispara después de cada alta en auth.users.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 12. DATOS INICIALES (Opcional - ejecutar después de crear usuarios)
-- -----------------------------------------------------------------------------
-- Insertar categorías de ejemplo (descomentar para usar)
-- INSERT INTO public.categorias (nombre, descripcion) VALUES
--     ('Bebidas', 'Refrescos, jugos y aguas'),
--     ('Alimentos', 'Snacks, botanas y comidas'),
--     ('Lácteos', 'Leche, yogurts y quesos'),
--     ('Limpieza', 'Productos de limpieza e higiene');
-- =============================================================================
