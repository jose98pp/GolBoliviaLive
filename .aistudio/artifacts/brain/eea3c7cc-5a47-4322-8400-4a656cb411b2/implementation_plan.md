# Pestaña de Canales IPTV Deportivos y Respaldo con Google Cast

Plan integral para integrar un catálogo completo de canales deportivos IPTV (`iptv-org`), navegación por países/categorías, selector directo en el reproductor principal `UniversalStreamPlayer`, respaldo automático cuando las 3 señales oficiales no estén transmitiendo, y transmisión fluida mediante el Google Cast SDK y controles nativos.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Decisiones confirmadas por el usuario:**
> 1. **Acceso Dual**: Pestaña dedicada "Canales IPTV" en la navegación principal + pantalla de respaldo directo en el reproductor cuando las 3 señales no estén en vivo.
> 2. **Fuente de Canales**: Lista deportiva global de `iptv-org` (`sports.m3u`) con buscador en tiempo real, filtros por país/región (Bolivia, Argentina, Colombia, México, España, Internacional) y logotipos oficiales de los canales.
> 3. **Transmisión Google Cast**: Botón Cast integrado de alta visibilidad en la barra de controles del reproductor, utilizando el Google Cast Web SDK con fallback automático a W3C Remote Playback y AirPlay.

## 1. Overview & Core Concept

- **Qué hace**: Permite a los usuarios de GolBolivia acceder a una grilla completa de canales deportivos en vivo (fútbol, polideportivo, señales internacionales) tanto desde una nueva pestaña interactiva ("Canales IPTV") como desde el reproductor cuando no hay partido boliviano transmitiéndose. Al seleccionar cualquier canal, se carga al instante en el reproductor oficial con HLS adaptativo, controles de volumen, pantalla completa y transmisión a Smart TV con Google Cast.
- **Público objetivo**: Aficionados al fútbol y deportes en Bolivia y Latinoamérica que desean ver transmisiones deportivas continuas entre partidos o enviar la señal a su televisor inteligente.
- **Valor diferencial**: Cero pantallas negras ni tiempos muertos cuando concluye la fecha de la liga boliviana; la plataforma se convierte en un centro deportivo 24/7 sin salir de la misma aplicación ni perder las funciones del reproductor.

## 2. User Experience & Visual Design

### Navegación y Vistas
- **Pestaña Principal "Canales IPTV"**:
  - Incorporada en la barra de navegación pública (`Partidos en Vivo` | `Canales IPTV` | `Clasificación` | etc.).
  - Barra de búsqueda instantánea por nombre de canal (ej. ESPN, TyC, Fox, Red Bull, Tigo, Claro).
  - Selector horizontal de países/regiones con deslizamiento táctil ergonómico (`Todos`, `Bolivia`, `Argentina`, `Colombia`, `México`, `España`, `Internacional`).
  - Grilla responsiva de tarjetas de canales con logotipo oficial, país, calidad de emisión y botón de reproducción directa.
  - Indicador de canal activo cuando se está reproduciendo actualmente.

### Experiencia en el Reproductor
- **Modo Respaldo Automático (Cuando las 3 señales están en pausa)**:
  - Si el partido oficial no tiene señal activa o está fuera de horario, el reproductor no muestra un error genérico: despliega una interfaz elegante "Transmisión en Espera / Canales Deportivos Disponibles" con acceso directo al catálogo de canales IPTV.
- **Botón Google Cast Mejorado**:
  - Icono de Cast en la barra de controles de `StreamPlayer` con animación de estado (disponible, conectando, transmitiendo).
  - Menú modal táctil optimizado para móviles y Smart TVs para seleccionar dispositivo destino.

### Estilo Visual y Paleta (Tailwind)
- Fondo general: `#090d16` (Slate 950 profundo con matiz nocturno).
- Tarjetas de canales: Superficies sobrias `bg-slate-900/80 border border-slate-800/80 hover:border-amber-500/50`.
- Acentos: Ámbar deportivo (`#f59e0b`) y verde esmeralda (`#10b981`) para transmisiones activas.
- Tipografía: Sin cajas de píldoras estáticas repetitivas; metadatos limpios con separadores tipográficos (`·`).

## 3. Key Product Decisions & Trade-Offs

- **Parser M3U híbrido (Backend Proxy con Caché + Fallback Offline)**:
  - *Decisión*: Se implementará un endpoint proxy `/api/iptv/sports` con caché en memoria (12 horas) para evitar bloqueos CORS del navegador y garantizar tiempos de respuesta ultra-rápidos (<30ms).
  - *Resiliencia*: Si la red externa de GitHub/iptv-org falla, el servidor cuenta con un catálogo curado pre-empaquetado de más de 40 canales deportivos latinoamericanos e internacionales con URLs estables.
- **Reutilización Total de `UniversalStreamPlayer`**:
  - *Decisión*: No se creará un reproductor separado. Los canales IPTV se inyectan en el reproductor principal para que el usuario disfrute de todas las funciones ya creadas: Google Cast, selector de calidad, audio, Picture-in-Picture y modo teatro.

## 4. Technical Architecture & Data Strategy

### Diagrama del Sistema y Flujo de Datos

```
┌────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                  │
│                                                                        │
│  ┌───────────────────────┐             ┌────────────────────────────┐  │
│  │   Navigation Tabs     │             │    UniversalStreamPlayer   │  │
│  │ [Partidos] [IPTV] ... │             │  - HLS.js video engine     │  │
│  └───────────┬───────────┘             │  - Google Cast Web SDK     │  │
│              │                         │  - AirPlay & RemotePlay    │  │
│              ▼                         └─────────────▲──────────────┘  │
│  ┌───────────────────────┐                           │                 │
│  │   IptvChannelGrid     │──── Seleccionar Canal ────┘                 │
│  │ - Buscador en vivo    │                                             │
│  │ - Filtro por países   │                                             │
│  │ - Tarjetas con logo   │                                             │
│  └───────────┬───────────┘                                             │
└──────────────┼─────────────────────────────────────────────────────────┘
               │ fetch('/api/iptv/sports')
               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                   │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Express Endpoint: GET /api/iptv/sports                            │  │
│  │ - Descarga https://iptv-org.github.io/iptv/categories/sports.m3u │  │
│  │ - Parser M3U / ExtInf (nombre, logo, país, stream URL)           │  │
│  │ - Caché en memoria (12h) + Catálogo curado de emergencia         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Plan de Componentes y Archivos a Implementar

1. **Servicio Backend (`serverApp.ts` o módulo dedicado `server/iptvService.ts`)**:
   - Endpoint `GET /api/iptv/sports` que descarga, parsea y estructura la lista M3U.
   - Normalizador de canales por país (Bolivia, Argentina, Colombia, México, España, Internacional).
2. **Cliente Frontend y Tipos (`src/types/iptv.ts` & `src/services/iptvService.ts`)**:
   - Interfaces `IptvChannel`, `IptvCategory`.
   - Cliente con almacenamiento local de canales favoritos o último canal reproducido.
3. **Componente de Navegación y Grilla (`src/components/IptvChannelsView.tsx`)**:
   - Buscador instantáneo, selector por países, cards con imagen optimizada y estado activo.
4. **Integración en `src/App.tsx`**:
   - Estado para la pestaña activa (`activeTab: 'matches' | 'iptv' | ...`).
   - Sincronización con `UniversalStreamPlayer` para reproducir el canal seleccionado.
   - Detección de ausencia de transmisión en las 3 señales para sugerir canales IPTV automáticamente.
5. **Mejora del Botón Google Cast en `StreamPlayer.tsx`**:
   - Botón directo en la barra inferior de controles con indicador visual activo.
