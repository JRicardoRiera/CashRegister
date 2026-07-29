# Arquitectura del Sistema y Plan de Desarrollo por Fases

**Documento de Presentación Ejecutiva y Técnica**

**Proyecto:** Web Cash Register Cloud

## 1. Visión General de la Arquitectura

El sistema **Web Cash Register** está proyectado como una aplicación web de última generación caracterizada por su alta velocidad, diseño minimalista y desacoplamiento estructural.

### Esquema Arquitectónico General

```
 +-----------------------------------------------------------------------+
 |                         CAPA DE PRESENTACIÓN                          |
 |  Single Page Application (React.js + Tailwind CSS + Lucide Icons)     |
 |  - Renderizado en cliente (SPA) ultrarrápido                          |
 |  - Manejo de estado reactivo local para el carrito (Zustand / React Context) |
 +-----------------------------------------------------------------------+
                                   |
                                   | Peticiones HTTPS / JSON (JWT Auth)
                                   v
 +-----------------------------------------------------------------------+
 |                            CAPA DE NEGOCIO                            |
 |  Python / FastAPI (Backend REST API)                                  |
 |  - Validación estricta de payloads con Pydantic                       |
 |  - Orquestación de transacciones contables                            |
 |  - Middleware de Autorización basado en Roles (RBAC)                  |
 +-----------------------------------------------------------------------+
                                   |
                                   | Supabase Python Client (TLS Cifrado)
                                   v
 +-----------------------------------------------------------------------+
 |                      CAPA DE DATOS Y SERVICIOS                        |
 |  Supabase Cloud (PostgreSQL Engine + Auth Service)                    |
 |  - OAuth Provider integration (Google / Microsoft)                    |
 |  - Persistencia de Datos con Triggers y RLS                           |
 +-----------------------------------------------------------------------+
```

## 2. Flujo Integrado de Autenticación OAuth 2.0 (Google/Microsoft)

El flujo de inicio de sesión elimina el manejo manual de contraseñas, delegando la seguridad a proveedores globales de identidad mediante **Supabase Auth**:

```
[ Usuario ] ---> (Click "Iniciar sesión con Google/Microsoft")
    |
    v
[ React Frontend ] ---> Redirige a Supabase Auth OAuth Endpoint
    |
    v
[ Google / Microsoft IDP ] ---> El usuario autoriza su cuenta
    |
    v
[ Supabase Auth ] ---> Genera sesión JWT y retorna con Callback al Frontend
    |
    v
[ React Frontend ] ---> Captura el JWT y consulta datos del perfil
    |
    v
[ FastAPI Backend ] ---> Valida firma JWT y otorga permisos según el ROL (Admin/Cajero)
```

## 3. Plan de Desarrollo por Fases (Roadmap)

Para garantizar entregas incrementales funcionales, el proyecto se divide en **5 Fases secuenciales**:

```
FASE 1: Cimientos BD y Auth  ──────► FASE 2: API REST Core
                                           │
                                           ▼
FASE 4: Dashboard y Vistas ◄────── FASE 3: Frontend POS React
       │
       ▼
FASE 5: Testing y Despliegue Cloud
```

### Fase 1: Cimientos de Infraestructura, Base de Datos y Auth

**Duración Estimada:** 1.5 Semanas

**Objetivo:** Configurar el entorno en la nube, esquemas relacionales y proveedores OAuth.

- **Entregables:**
    
    1. Proyecto creado en Supabase Cloud.
        
    2. Ejecución del script DDL (Tablas, Índices, Triggers y Políticas RLS).
        
    3. Configuración de Google Cloud Console y Azure App Registrations para OAuth.
        
    4. Creación de usuarios iniciales de prueba (1 Admin, 1 Cajero).
        

### Fase 2: Backend REST API con Python y FastAPI

**Duración Estimada:** 2 Semanas

**Objetivo:** Construir la capa de servicios de negocio en Python para orquestar inventario y ventas.

- **Entregables:**
    
    1. Configuración de proyecto FastAPI con Pydantic v2.
        
    2. Middleware de verificación de Tokens JWT emitiendo error 401/403 en endpoints protegidos.
        
    3. Endpoints de **Productos** (`GET /api/v1/productos`, `POST`, `PUT`, `DELETE`).
        
    4. Endpoint transaccional de **Ventas** (`POST /api/v1/ventas`) que procesa la cabecera y el detalle en un bloque atómico.
        
    5. Documentación Swagger UI viva en `/docs`.
        

### Fase 3: Frontend POS React Minimalista y Módulo de Caja

**Duración Estimada:** 2.5 Semanas

**Objetivo:** Implementar la interfaz gráfica de la caja registradora, con enfoque minimalista y reactividad instantánea.

- **Entregables:**
    
    1. Setup de Vite + React + Tailwind CSS.
        
    2. Integración de Supabase Client JS para la pantalla de Login con botones OAuth.
        
    3. Componente **POS Layout**:
        
        - Panel izquierdo: Catálogo / Buscador de productos con soporte para barcode scanner.
            
        - Panel derecho: Carrito de compras dinámico (sumatoria inmediata, contador de ítems).
            
    4. Modal de Cobro: Selección de método de pago, ingreso de efectivo, cálculo de cambio.
        
    5. Componente de vista e impresión de Ticket de compra ($80\text{ mm}$).
        

### Fase 4: Vistas por Rol, Inventarios y Reportes

**Duración Estimada:** 2 Semanas

**Objetivo:** Completar el panel administrativo y las vistas diferenciadas para Administradores.

- **Entregables:**
    
    1. **Vista de Inventario (Admin/Cajero):** Grilla interactiva con badges semafóricos (Rojo/Amarillo/Verde) según el stock.
        
    2. **Vista de Gestión de Productos (Admin):** Formularios en modal para alta y edición de artículos.
        
    3. **Vista de Historial de Ventas (Admin/Cajero):** Tabla de transacciones pasadas con modal de desglose de ítems.
        
    4. **Dashboard Minimalista (Admin):** Tarjetas con kpis clave (Ventas del día, producto más vendido, alertas de stock).
        

### Fase 5: Estabilización, Pruebas y Despliegue

**Duración Estimada:** 1 Semana

**Objetivo:** Garantizar la calidad, seguridad y puesta en producción del sistema.

- **Entregables:**
    
    1. Pruebas de estrés de respuesta de carrito ($< 50\text{ ms}$).
        
    2. Auditoría de seguridad OWASP y verificación de permisos RLS en Supabase.
        
    3. Despliegue del Frontend en **Vercel / Netlify**.
        
    4. Despliegue del Backend FastAPI en **Render / Railway**.
        
    5. Entrega de documentación técnica y manuales de usuario.
        

## 4. Estrategia de Diseño UI/UX Minimalista y Responsivo

1. **Jerarquía Visual Clara:** Tipografía sans-serif legible (`Inter` o `System UI`), con números grandes de alto contraste para el total de la venta.
    
2. **Eficiencia en Puntos de Touch:** Botones de acción principal (ej: "Procesar Pago", "Agregar") con área de contacto amplia para dispositivos móviles o pantallas táctiles de $10''$.
    
3. **Optimización de Teclado:** Soporte para atajos de teclado (`F2` para buscar, `Enter` para cobro rápido, `Esc` para cancelar) reduciendo la dependencia del mouse en jornadas de venta intensa.