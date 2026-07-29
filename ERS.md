# Especificación de Requerimientos de Software (ERS)

## Proyecto: Web Cash Register (Sistema POS Cloud Minimalista)

**Documento Versión:** 1.0

**Estándar de Referencia:** ISO/IEC/IEEE 29148:2018 / IEEE Std 830

**Estado:** Propuesta Final de Desarrollo

## 1. Introducción y Objetivos

### 1.1 Propósito del Documento

El presente documento especifica los requerimientos funcionales y no funcionales para el desarrollo del sistema web **Web Cash Register**, una solución moderna de Punto de Venta (POS) e inventarios. Sirve como contrato técnico formal entre los líderes de proyecto, arquitectos de software, desarrolladores y partes interesadas.

### 1.2 Alcance del Sistema

**Web Cash Register** es una aplicación web responsiva, ultrarrápida y minimalista diseñada para reemplazar aplicaciones de escritorio tradicionales (como _Cash Register Pro v2.0_). La plataforma permitirá:

- Operación en la nube ($24/7$) accesible desde cualquier dispositivo (desktop, tablet, smartphone).
    
- Autenticación unificada mediante Single Sign-On (SSO) OAuth 2.0 (Google y Microsoft) gestionado vía Supabase Auth.
    
- Control interactivo de inventario con alertas dinámicas.
    
- Procesamiento en tiempo real de transacciones de caja con emisión de tickets y descuento automático de stock.
    
- Diferenciación de vistas y permisos según el perfil del usuario (Administrador vs. Usuario de Uso/Cajero).
    

### 1.3 Objetivos del Sistema

- **Objetivo General:** Desarrollar una plataforma POS web minimalista que optimice los tiempos de atención en caja a menos de $3$ segundos por artículo e integre el control contable e inventario en la nube.
    
- **Objetivos Específicos:**
    
    1. Implementar autenticación OAuth segura y diferenciación de roles (Administrador y Cajero).
        
    2. Proveer una interfaz _Mobile-First_ y _Touch-Friendly_ orientada a pantallas táctiles y lectores de código de barras.
        
    3. Garantizar precisión financiera con soporte para estándar de precisión decimal de $2$ dígitos para moneda (ISO 4217).
        
    4. Reducir la latencia del carrito de compras en cliente a $< 50\text{ ms}$ utilizando React y estados reactivos.
        

### 1.4 Alineación con Estándares de la Industria

Para garantizar la calidad de software a nivel empresarial, se adoptan los siguientes estándares:

- **ISO/IEC/IEEE 29148:** Estructuración y trazabilidad de requerimientos.
    
- **OWASP Top 10:** Principios de seguridad web (Autenticación robusta, validación de inputs, RLS).
    
- **GS1 / UPC / EAN-13:** Estándar industrial para códigos de barras en catálogo de productos.
    
- **ISO 4217:** Estándar para el manejo de importes monetarios e impuestos.
    

## 2. Descripción General del Sistema

### 2.1 Perspectiva del Producto

El sistema opera bajo un modelo SaaS (Software as a Service) híbrido desacoplado:

```
[ Frontend: React SPA ] <--- (HTTP/REST / JWT) ---> [ Backend: Python FastAPI ] <--- (SDK / SQL) ---> [ Supabase: Postgres + OAuth ]
```

### 2.2 Perfiles y Roles de Usuario

|   |   |   |
|---|---|---|
|**Rol**|**Descripción**|**Permisos Principales**|
|**Administrador**|Propietario o Gerente del negocio.|- Acceso total al sistema.<br><br>  <br><br>- Gestión de usuarios y asignación de roles.<br><br>  <br><br>- Edición, creación y eliminación de catálogo de productos.<br><br>  <br><br>- Reportes analíticos de ventas y márgenes de ganancia.<br><br>  <br><br>- Configuración global de la tienda.|
|**Usuario de Uso (Cajero)**|Personal operativo de caja.|- Acceso exclusivo al Módulo POS (Caja Registradora).<br><br>  <br><br>- Búsqueda de productos y escaneo de códigos de barras.<br><br>  <br><br>- Procesamiento de cobro y emisión de recibos.<br><br>  <br><br>- Consulta de stock en modo lectura.<br><br>  <br><br>- _Sin acceso_ a costos de compra, reportes globales ni configuración.|

### 2.3 Stack Tecnológico Confirmado

- **Frontend:** React.js (Vite framework), Tailwind CSS (Estilo minimalista), Lucide Icons / Heroicons.
    
- **Backend:** Python 3.11+, FastAPI (REST API asíncrona), Pydantic v2 (Validación de esquemas).
    
- **Base de Datos & Servicios Core:** Supabase (PostgreSQL 15+), Supabase Auth (OAuth Google/Microsoft), Row Level Security (RLS).
    

## 3. Clasificación de Características (Principales y Secundarias)

### 3.1 Características Principales (Core)

1. **Módulo POS / Caja Registradora:**
    
    - Escaneo directo mediante lector USB/Bluetooth o entrada manual.
        
    - Carrito dinámico reactivo en memoria client-side.
        
    - Cálculo automático de totales, impuestos ($IVA = \text{Subtotal} \times 0.16$) y cambio.
        
    - Impresión/Vista previa de ticket en formato térmico $80\text{ mm}$.
        
2. **Gestión de Inventario en Tiempo Real:**
    
    - Alta, baja y modificación de productos.
        
    - Alertas de stock bajo basadas en semaforización gráfica ($Stock \le Stock_{mínimo}$).
        
    - Descuento atómico de stock mediante triggers o transacciones PostgreSQL.
        
3. **Autenticación e Identidad OAuth:**
    
    - Inicio de sesión con Google Workspace y Microsoft Entra ID.
        
    - Control de sesiones mediante JSON Web Tokens (JWT).
        

### 3.2 Características Secundarias (Soporte)

1. **Historial y Desglose de Ventas:**
    
    - Búsqueda por rango de fechas e identificador de transacción.
        
    - Re-impresión de tickets pasados.
        
2. **Analítica Básica de Negocio (Dashboard Admin):**
    
    - Gráficos minimalistas de ventas diarias/mensuales.
        
    - Top 5 de productos más vendidos.
        
3. **Exportación de Datos:**
    
    - Exportación de catálogo y reportes de ventas en formatos CSV/Excel.
        

## 4. Requerimientos Funcionales (RF)

### 4.1 Módulo de Autenticación y Control de Acceso (AUTH)

- **RF-AUTH-01 (OAuth 2.0 Login):** El sistema debe permitir el inicio de sesión a través de Google y Microsoft utilizando la infraestructura de Supabase Auth.
    
- **RF-AUTH-02 (Asignación de Rol):** Al registrarse por primera vez mediante OAuth, el usuario quedará en estado `Pendiente` o asignado automáticamente como `Cajero`, hasta que un `Administrador` modifique su perfil.
    
- **RF-AUTH-03 (Protección de Rutas):** El Frontend (React) y Backend (FastAPI) deben denegar el acceso a rutas administrativas si el token JWT no contiene la declaración (_claim_) correspondiente al rol `Administrador`.
    

### 4.2 Módulo de Punto de Venta (POS)

- **RF-POS-01 (Búsqueda Ágil):** El sistema debe permitir la localización de productos en $< 100\text{ ms}$ al escanear un código de barras o ingresar al menos 2 caracteres del nombre.
    
- **RF-POS-02 (Carrito de Compras):** Permitir incrementar, decrementar o eliminar ítems del carrito mediante atajos de teclado o clicks/touches intuitivos.
    
- **RF-POS-03 (Validación de Existencias):** El sistema no debe permitir agregar unidades al carrito si $Cantidad_{solicitada} > Stock_{actual}$, mostrando una alerta inmediata.
    
- **RF-POS-04 (Múltiples Métodos de Pago):** Soportar cobro con Efectivo, Tarjeta de Débito/Crédito y Transferencia Electrónica.
    
- **RF-POS-05 (Cálculo de Cambio):** En pagos con efectivo, el sistema debe calcular el cambio exacto:
    
      
    
    $$\text{Cambio} = \text{Monto Recibido} - \text{Total Venta}$$
    
    Impidiendo cerrar la venta si $\text{Monto Recibido} < \text{Total Venta}$.
    
- **RF-POS-06 (Generación de Ticket):** Generar una vista limpia e imprimible optimizada para impresoras térmicas de tickets ($80\text{ mm}$ o $58\text{ mm}$).
    

### 4.3 Módulo de Inventario (INV)

- **RF-INV-01 (Registro de Producto):** El Administrador podrá registrar un producto indicando: Código de barras (único), Nombre, Descripción, Precio de Compra, Precio de Venta, Stock Inicial y Stock Mínimo.
    
- **RF-INV-02 (Alertas Semafóricas):** El listado de inventario debe resaltar visualmente:
    
    - **Rojo:** $Stock = 0$ (Agotado)
        
    - **Amarillo:** $0 < Stock \le Stock_{mínimo}$ (Alerta de reabastecimiento)
        
    - **Verde:** $Stock > Stock_{mínimo}$ (Stock saludable)
        
- **RF-INV-03 (Ajuste de Inventario):** Permitir ajustes manuales de stock justificados (pérdida, merma, entrada de proveedor).
    

### 4.4 Módulo de Historial y Reportes (REP)

- **RF-REP-01 (Consulta de Historial):** El Administrador y Cajero podrán ver las ventas del día. Solo el Administrador podrá ver el historial histórico sin límite de fechas.
    
- **RF-REP-02 (Detalle de Venta):** Al seleccionar una venta, el sistema desplegará los productos vendidos, precios unitarios al momento de la venta y datos del cajero que procesó.
    

## 5. Requerimientos No Funcionales (RNF)

### 5.1 Rendimiento (RNF-PERF)

- **RNF-PERF-01:** La interfaz gráfica (React) debe responder a las interacciones del carrito en menos de $50\text{ ms}$.
    
- **RNF-PERF-02:** Los endpoints REST en FastAPI deben procesar las ventas y retornar respuesta HTTP 200/201 en un tiempo menor a $300\text{ ms}$ en condiciones normales de red.
    

### 5.2 Usabilidad y Diseño (RNF-USA)

- **RNF-USA-01 (Diseño Minimalista):** Interfaz limpia, sin saturación visual, basada en una paleta de colores neutrales (grises oscuros/claros con acentos en azul/verde) enfocada en maximizar el área de trabajo de la caja.
    
- **RNF-USA-02 (Responsividad Total):** Adaptable fluidamente a pantallas Desktop ($1920 \times 1080$), Tablets ($1024 \times 768$) y Mobiles ($375 \times 667$).
    

### 5.3 Seguridad (RNF-SEC)

- **RNF-SEC-01:** Toda comunicación entre cliente y servidor debe viajar bajo cifrado HTTPS / TLS 1.3.
    
- **RNF-SEC-02:** Uso estricto de **Row Level Security (RLS)** en Supabase PostgreSQL para asegurar que los usuarios no puedan leer ni modificar datos fuera de su ámbito autorizado.
    
- **RNF-SEC-03:** Las contraseñas o tokens OAuth jamás deben almacenarse en texto plano en el cliente ni en los logs.
    

### 5.4 Mantenibilidad y Escalabilidad (RNF-MAIN)

- **RNF-MAIN-01:** Código estructurado en arquitectura limpia con separación clara entre UI, lógica de API y persistencia de datos.
    
- **RNF-MAIN-02:** Documentación automática de OpenAPI/Swagger generada por FastAPI accesible para desarrolladores.