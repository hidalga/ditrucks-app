# Manual de Usuario — Sistema Ditrucks

**Versión del documento:** 1.0 · Agosto 2026
**Aplica a:** todos los roles del sistema (interno y portal de clientes)

---

## Índice

1. [¿Qué es el sistema?](#1-qué-es-el-sistema)
2. [Acceso y roles](#2-acceso-y-roles)
3. [Guía para ADMINISTRADOR](#3-guía-para-administrador)
4. [Guía para TÉCNICO](#4-guía-para-técnico)
5. [Guía para CALIBRADOR](#5-guía-para-calibrador)
6. [Guía para COMERCIAL (Ventas)](#6-guía-para-comercial-ventas)
7. [Guía para CLIENTE (Portal)](#7-guía-para-cliente-portal)
8. [Flujos públicos (sin sesión)](#8-flujos-públicos-sin-sesión)
9. [Preguntas frecuentes](#9-preguntas-frecuentes)

---

## 1. ¿Qué es el sistema?

La plataforma Ditrucks digitaliza todo el ciclo de servicio de reprogramación y
diagnóstico de sistemas post-tratamiento diésel (DPF, EGR, SCR, DOC):

- **Órdenes de servicio** con flujo paso a paso, firmas electrónicas y evidencia fotográfica.
- **Diagnósticos** con score de salud automático (0–100) por sistema y proyección de deterioro.
- **Gestión de archivos ECU** (original/modificado) con respaldo en la nube (Cloudflare R2) y verificación de integridad.
- **Certificados de servicio** con verificación pública por QR.
- **Portal de clientes** para que las flotillas vean el estado de sus unidades en tiempo real.
- **Cotizador preventivo vs correctivo** con catálogo de 326 vehículos y piezas de post-tratamiento.
- **Analítica interna (BI)** para revisar el rendimiento mensual del negocio.

---

## 2. Acceso y roles

### Iniciar sesión
1. Abre el navegador y entra a la dirección del sistema.
2. Escribe tu **correo** y **contraseña** y pulsa **Entrar**.
3. Según tu rol, el sistema te lleva al **panel interno** (`/dashboard`) o al **portal de clientes** (`/client/dashboard`).

> Si olvidaste tu contraseña, contacta a un administrador para que te la restablezca desde **Usuarios**.

### Roles del sistema

| Rol | Área | Qué puede hacer |
|---|---|---|
| **Admin** | Interna | Todo: usuarios, empresas, órdenes, diagnósticos, cotizador, analítica |
| **Técnico** | Interna | Órdenes (recepción, firmas, evidencia, ECU), diagnósticos |
| **Calibrador** | Interna | Análisis y calibración de archivos ECU, avance de órdenes |
| **Comercial** | Interna | Cotizador, catálogos, pipeline de oportunidades, alta de empresas/cuentas cliente |
| **Cliente / Admin de flota** | Portal | Ver sus unidades, trabajos, certificados y (si está habilitado) cotizador |

Para cerrar sesión: botón de **salida** (ícono de puerta) en la barra lateral o el encabezado.

---

## 3. Guía para ADMINISTRADOR

### 3.1 Dashboard
Al entrar verás:
- **Contadores** de órdenes por etapa (recepción, leyendo ECU, análisis, listas, cerradas) y unidades en riesgo alto/crítico.
- **KPIs del mes**: órdenes cerradas y tiempo de ciclo promedio (recepción → entrega).
- **Órdenes sin movimiento (+3 días)**: cuellos de botella; cada fila muestra el técnico responsable y los días detenida. Haz clic para ir a la orden.
- **Pipeline comercial**: diagnósticos con oportunidad activa (Cotizar / Agendar / Seguimiento).

### 3.2 Usuarios
`Sidebar → Usuarios`
- **Crear usuario**: botón *Nuevo usuario* → nombre, correo, contraseña y rol.
- Para dar acceso al **portal de clientes**, crea el usuario con rol *Cliente* o *Admin de flota* y **vincúlalo a su empresa**.
- Para desactivar el acceso de alguien, edita el usuario y desactívalo.

### 3.3 Empresas y clientes
`Sidebar → Empresas` / `Sidebar → Clientes`
- Las **empresas** agrupan vehículos y usuarios del portal (tipo: flotilla, taller, transporte, agrícola, construcción, particular).
- El switch **"Cotizador habilitado"** de cada empresa controla si sus usuarios ven el cotizador en el portal.
- Los **clientes** (personas de contacto) pueden pertenecer a una empresa o ser particulares.

### 3.4 Vehículos
`Sidebar → Vehículos`
- Alta con marca, modelo, año, placas, VIN, número económico, tipo de unidad y combustible.
- En el detalle del vehículo puedes **vincularlo a su aplicación del cotizador** (buscador por marca/motor/año). Esto pre-llena la cotización de esa unidad en el portal del cliente.
- El detalle muestra el historial de órdenes y diagnósticos de la unidad.

### 3.5 Órdenes de servicio
Ver la guía del técnico (§4); el admin puede hacer todo lo del técnico y además **cancelar órdenes** (con motivo).

### 3.6 Cotizador y analítica
- Cotizador: ver guía comercial (§6).
- **Analítica** (`Sidebar → Analítica`): resumen mensual del negocio — órdenes, vehículos más trabajados, servicios más solicitados, diagnósticos y riesgos, lo más cotizado, y uso de los botones clave del sistema. Usa el selector de mes para comparar periodos.

---

## 4. Guía para TÉCNICO

### 4.1 Crear una orden de servicio
1. `Sidebar → Órdenes → Nueva orden`.
2. Selecciona **empresa/cliente** y **vehículo** (o créalos al momento).
3. Marca los **tipos de servicio** (Diagnóstico, DPF, EGR, SCR/AdBlue, DTC, Stage 1, Límite de velocidad, Revisión de archivo…).
4. Guarda. La orden nace en estado **Borrador** con su folio único.

### 4.2 Recepción de la unidad
En el detalle de la orden:
1. Pulsa **Iniciar recepción**.
2. Captura: kilometraje, horas motor, nivel de combustible, testigos encendidos, fallas activas y las fallas que reporta el cliente.
3. Sube **evidencia fotográfica** de recepción (identificación VIN/placas, daños físicos, tablero). Cada foto lleva su categoría.

### 4.3 Firma del cliente (recepción)
Dos opciones:
- **Presencial**: el cliente firma en pantalla (pad de firma).
- **Remota**: pulsa *Enviar enlace de firma*; el sistema genera un link único que puedes mandar por WhatsApp/correo. El estado cambia a *Enlace enviado* y luego a *Firmada* cuando el cliente firma desde su teléfono.

> La orden no puede avanzar a diagnóstico sin la firma de autorización.

### 4.4 Diagnóstico post-tratamiento
1. Desde la orden pulsa **Nuevo diagnóstico** (o `Sidebar → Diagnósticos → Nuevo`).
2. Marca qué sistemas tiene la unidad (**DPF / SCR / EGR**) y captura los valores del escáner:
   - **DPF**: hollín %, ceniza %, presión diferencial, regeneraciones fallidas…
   - **SCR**: nivel y calidad de DEF, presión de bomba, NOx entrada/salida, eficiencia, derate…
   - **EGR**: posición comandada vs real, desviación, notas de flujo…
3. Indica el **tipo de uso** (ciudad, carretera, carga pesada…) — afecta el score y la proyección.
4. Al guardar, el sistema calcula automáticamente el **score 0–100 por sistema**, el **score general** y el **nivel de riesgo** (Excelente → Crítico), con el detalle de penalizaciones.
5. Escribe la **recomendación técnica** y, si aplica, la fecha de **próxima revisión**.

### 4.5 Archivos ECU
En la orden, sección de archivos:
1. **Leer ECU** → registra herramienta (Kess, Trasdata, Autotuner, Flex…), método (OBD, Bench, Boot…) y sube el **archivo original**. El sistema guarda el checksum y lo respalda en la nube.
2. El calibrador prepara el **archivo modificado** (ver §5).
3. Cuando esté listo, **instala** el archivo y marca el avance.
4. Todos los archivos quedan versionados y descargables desde la orden.

### 4.6 Prueba, entrega y cierre
1. Tras instalar: **Prueba posterior** (ruta/dinamómetro) con evidencia.
2. **Completada técnicamente** → genera el **certificado** de servicio.
3. Firma de **entrega** del cliente (presencial o remota).
4. **Entregada** → **Cerrada**.

La barra de progreso de la orden muestra el % de avance y la siguiente acción en cada paso.

---

## 5. Guía para CALIBRADOR

1. En el dashboard revisa las órdenes en estado **Archivo original subido** o **En análisis**.
2. Abre la orden → descarga el **archivo original**.
3. Trabaja la calibración y sube el **archivo modificado** (el sistema calcula checksum y lo respalda en R2).
4. Marca la orden como **Archivo listo** para que el técnico instale.
5. Si necesitas más datos (lectura incompleta, notas del diagnóstico), están en la misma orden.

---

## 6. Guía para COMERCIAL (Ventas)

### 6.1 Cotizador preventivo vs correctivo
`Sidebar → Cotizador`

El cotizador demuestra al cliente cuánto **ahorra** haciendo el servicio preventivo con Ditrucks HOY versus seguir pagando el sistema original hasta la falla (correctivo).

**Pasos:**
1. **Vehículo**: escribe en el buscador marca, motor, año o potencia (ej. *"kenworth x15"*, *"ford 6.7"*). El catálogo trae 326 aplicaciones precargadas. Al elegir, los sistemas del vehículo (DPF/EGR/SCR/DOC) se marcan solos.
2. **Flota y servicio**: número de camionetas y camiones, y cuántos sistemas se desactivan (1–4).
3. **Costos del correctivo** (todo editable):
   - **Proyección**: 12/24/36/48 meses — el consumo de DEF se multiplica por este horizonte.
   - **DEF/AdBlue**: litros por mes por tipo de unidad y precio por litro.
   - **Inoperatividad**: horas de paro por unidad × tarifa por hora.
   - **Piezas de reemplazo**: las marcadas como *esenciales* (●) vienen preseleccionadas con una por unidad; ajusta cantidades o agrega las demás.
4. El **panel derecho** muestra en vivo: ahorro total y %, comparativo de barras y desglose del correctivo.
5. **Exportar cotización PDF** para enviar al cliente.

### 6.2 Catálogos del cotizador
- **Tab Catálogo**: busca/edita/agrega aplicaciones de vehículos con sus precios preventivo/correctivo por número de desactivaciones.
- **Tab Piezas**: precios de piezas por sistema (camioneta/camión), si son esenciales, piezas por unidad y notas. *Los precios precargados son estimados de mercado: ajústalos a tus costos reales.*

### 6.3 Pipeline de oportunidades
Cada diagnóstico técnico puede convertirse en venta:
1. `Sidebar → Diagnósticos`: las tarjetas muestran el riesgo y la etiqueta de oportunidad.
2. Abre un diagnóstico → selector **Oportunidad**: Sin oportunidad → Seguimiento → Cotizar → Agendar → **Vendido** / Perdido.
3. El **Dashboard** muestra el pipeline activo (cuántos hay en cada etapa) para tu seguimiento diario.

### 6.4 Cuentas del portal para clientes
1. Verifica que la **empresa** exista y tenga sus **vehículos** dados de alta.
2. (Opcional) Activa **"Cotizador habilitado"** en la empresa.
3. Pide al admin crear el **usuario** del cliente (rol *Admin de flota*) vinculado a la empresa.
4. Vincula cada vehículo del cliente a su **aplicación del cotizador** para que el portal muestre cotizaciones pre-llenadas.

---

## 7. Guía para CLIENTE (Portal)

### 7.1 Estado de flota (inicio)
El semáforo de tu flota, ordenado por urgencia:
- 🔴 **Crítico** / 🟠 **Urgente**: requieren atención; usa los botones **"Agendar con mi asesor"** o **"Ver ahorro preventivo vs correctivo"**.
- 🟡 **Agendar** / 🔵 **Monitorear** / 🟢 **Bien**.

Cada unidad muestra su **score de salud** (general y por sistema DPF/SCR/EGR) y la **recomendación** con fecha sugerida de acción. El score proviene del último diagnóstico técnico de Ditrucks; la proyección estima su deterioro según el tipo de uso de la unidad.

**Reporte PDF**: botón arriba a la derecha para descargar el reporte de salud de toda tu flota.

### 7.2 Vehículos
Lista y detalle de cada unidad: datos, historial de trabajos y diagnósticos con su evolución.

### 7.3 Trabajos
Tus órdenes de servicio con barra de progreso en tiempo real: desde recepción hasta entrega, incluyendo el estado de tus firmas.

### 7.4 Certificados
Certificados de los servicios realizados, descargables en PDF con código QR de verificación pública.

### 7.5 Cotizador (si está habilitado)
Cotizaciones pre-llenadas por grupo de unidades de tu flota: elige cuántos sistemas desactivar y el horizonte de proyección, y ve el comparativo **correctivo vs preventivo** con el ahorro. Descarga el PDF o contacta a tu asesor.

---

## 8. Flujos públicos (sin sesión)

- **Firma remota** (`/sign/<token>`): el cliente abre el enlace desde su teléfono, revisa los términos de autorización y firma con el dedo. El enlace es de un solo uso y expira.
- **Verificación de certificado** (`/verify/<token>`): cualquier persona que escanee el QR de un certificado ve su validez y puede descargar el PDF oficial. Sirve para acreditar el servicio ante terceros.

---

## 9. Preguntas frecuentes

**No veo el módulo de Cotizador.**
Tu rol no lo incluye (solo admin y comercial en interno) o, en el portal, tu empresa no lo tiene habilitado.

**El cliente no recibió el enlace de firma.**
El enlace se comparte manualmente (WhatsApp/correo) desde la orden. Genera uno nuevo si expiró.

**¿Por qué bajó el score de una unidad?**
Abre el diagnóstico: la sección *Detalle de penalizaciones* explica exactamente qué parámetro restó puntos y cuántos.

**Subí un archivo ECU equivocado.**
Sube la versión correcta como nuevo archivo; todas las versiones quedan en la orden con fecha y checksum. No se sobreescriben.

**¿Los precios del cotizador son finales?**
Los precios de servicio provienen del catálogo oficial; los de piezas y DEF son estimados de mercado editables. El PDF lo indica.

**Una orden lleva días sin moverse.**
Aparecerá en el bloque *Órdenes sin movimiento* del dashboard con su responsable. Ábrela y ejecuta la "siguiente acción" que indica la barra de progreso.
