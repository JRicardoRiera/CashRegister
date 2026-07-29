# Especificación y Diseño de Base de Datos

**Motor de Base de Datos:** PostgreSQL 15+ (Hosted via Supabase)

**Estrategia de Nomenclatura:** `snake_case` estricto en minúsculas para tablas, columnas, funciones e índices. Nombres en plural para tablas.

## 1. Convenciones y Normas de Diseño

1. **Claves Primarias (PK):** Todas las tablas de negocio principales contarán con un identificador único `id` de tipo `UUID` o `BIGINT GENERATED ALWAYS AS IDENTITY`.
    
2. **Claves Foráneas (FK):** Sufijo `_id` haciendo referencia al nombre en singular de la tabla referenciada (ej. `producto_id`, `venta_id`).
    
3. **Auditoría Estándar:** Todas las tablas principales de entidad deben incluir las columnas `creado_en` y `actualizado_en` con zona horaria (`TIMESTAMPTZ`).
    
4. **Moneda y Decimales:** Todos los valores monetarios utilizan el tipo `NUMERIC(12, 2)` para evitar errores de redondeo de punto flotante.
    

## 2. Diagrama Entidad-Relación (Estructura Relacional)

```
 [ auth.users (Supabase) ]
          |
          | 1:1
          v
    +-----------+          +-----------------+
    |  perfiles |          |   categorias    |
    +-----------+          +-----------------+
          |                         |
          | 1:N                     | 1:N
          v                         v
    +-----------+          +-----------------+
    |  ventas   |          |    productos    |
    +-----------+          +-----------------+
          |                         |
          | 1:N                     | 1:N
          +----> +----------------+ <+
                 | detalle_ventas |
                 +----------------+
```

## 3. Esquema DDL (SQL Script para Supabase)

```
-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. TABLA: perfiles (Extensión de auth.users de Supabase)
-- =============================================================================
CREATE TYPE rol_usuario AS ENUM ('administrador', 'cajero');

CREATE TABLE public.perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre_completo TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    rol rol_usuario NOT NULL DEFAULT 'cajero',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 2. TABLA: categorias
-- =============================================================================
CREATE TABLE public.categorias (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 3. TABLA: productos
-- =============================================================================
CREATE TABLE public.productos (
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
-- 4. TABLA: ventas
-- =============================================================================
CREATE TYPE metodo_pago_enum AS ENUM ('efectivo', 'tarjeta', 'transferencia');

CREATE TABLE public.ventas (
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
-- 5. TABLA: detalle_ventas
-- =============================================================================
CREATE TABLE public.detalle_ventas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    venta_id BIGINT NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
    producto_id BIGINT NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
    cantidad INT NOT NULL CONSTRAINT chk_cantidad_positiva CHECK (cantidad > 0),
    precio_unitario NUMERIC(12, 2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0)
);

-- =============================================================================
-- ÍNDICES DE RENDIMIENTO
-- =============================================================================
CREATE INDEX idx_productos_codigo_barras ON public.productos(codigo_barras);
CREATE INDEX idx_productos_nombre ON public.productos USING gin (to_tsvector('spanish', nombre));
CREATE INDEX idx_ventas_fecha ON public.ventas(fecha_hora DESC);
CREATE INDEX idx_ventas_usuario ON public.ventas(usuario_id);
CREATE INDEX idx_detalle_ventas_venta ON public.detalle_ventas(venta_id);
CREATE INDEX idx_detalle_ventas_producto ON public.detalle_ventas(producto_id);
```

## 4. Triggers y Lógica Automatizada en Base de Datos

### 4.1 Actualización Automática de Timestamp (`actualizado_en`)

```
CREATE OR REPLACE FUNCTION actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_productos_timestamp
BEFORE UPDATE ON public.productos
FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

CREATE TRIGGER trg_actualizar_perfiles_timestamp
BEFORE UPDATE ON public.perfiles
FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();
```

### 4.2 Descuento Automático de Stock al Insertar Detalle de Venta

```
CREATE OR REPLACE FUNCTION descontar_stock_venta()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar stock suficiente
    IF (SELECT stock_actual FROM public.productos WHERE id = NEW.producto_id) < NEW.cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para el producto ID %', NEW.producto_id;
    END IF;

    -- Descontar inventario
    UPDATE public.productos
    SET stock_actual = stock_actual - NEW.cantidad
    WHERE id = NEW.producto_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_descontar_stock_venta
BEFORE INSERT ON public.detalle_ventas
FOR EACH ROW EXECUTE FUNCTION descontar_stock_venta();
```

## 5. Políticas de Seguridad de Nivel de Fila (Row Level Security - RLS)

```
-- Habilitar RLS en todas las tablas
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_ventas ENABLE ROW LEVEL SECURITY;

-- Función auxilar para obtener el rol del usuario autenticado
CREATE OR REPLACE FUNCTION public.obtener_mi_rol()
RETURNS rol_usuario AS $$
  SELECT rol FROM public.perfiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- POLÍTICAS: Productos y Categorías (Lectura para todos autenticados, Escritura solo Admins)
CREATE POLICY "Lectura productos para usuarios autenticados" 
ON public.productos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Escritura productos solo para Administradores" 
ON public.productos FOR ALL TO authenticated 
USING (public.obtener_mi_rol() = 'administrador');

-- POLÍTICAS: Ventas (Cajeros y Admins pueden crear y ver ventas)
CREATE POLICY "Usuarios autenticados pueden crear ventas" 
ON public.ventas FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden ver ventas" 
ON public.ventas FOR SELECT TO authenticated USING (true);
```