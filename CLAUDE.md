# LOGOS POC - Contexto del Proyecto

> Plataforma 100% offline de transcripción automática de videos de capacitación bancaria con búsqueda semántica avanzada.
> 
> Demo a gerencia: en 1 semana
> Desarrollador: Alfredo

---

## 🎯 QUÉ ES ESTO

POC funcional de un sistema que transcribe videos de capacitación bancaria (Zoom/Teams) y los hace **buscables semánticamente** con timestamps precisos. Click en cualquier resultado → video reproduce desde el segundo exacto.

Forma parte del ecosistema de conocimiento corporativo junto con MNEMOS (documentos). LOGOS es el cerebro hablado, MNEMOS es el cerebro escrito.

**Es un POC, no producto final.** Priorizar funcionalidad demostrable sobre arquitectura perfecta. Deadline ajustado.

## 🛠️ STACK TÉCNICO

### Backend
- **Framework:** Next.js 14 (App Router) + TypeScript
- **DB:** SQLite + Prisma ORM (archivo dev.db local)
- **Búsqueda vectorial:** sqlite-vss (extensión de SQLite)
- **Cola de jobs:** BullMQ + Redis local
- **Comunicación con worker:** child_process (Node ↔ Python)

### IA y Procesamiento
- **Transcripción:** faster-whisper modelo `medium` con cuantización int8 (Python)
- **Embeddings:** Ollama + nomic-embed-text (vectores 768 dim)
- **Audio/Video:** FFmpeg (extracción de audio, thumbnails)

### Frontend
- **UI:** Tailwind CSS + shadcn/ui (componentes locales)
- **Video:** react-player o video.js
- **Estado:** Zustand para estado global, TanStack Query para server state

## ⚡ COMANDOS CLAVE

```bash
# Desarrollo
npm run dev                       # Servidor Next.js (puerto 3001)
npm run worker                    # Worker de transcripción (si usamos worker Node)
python workers/transcribe.py      # Worker Python directo

# Base de datos
npx prisma studio                 # GUI de la DB
npx prisma db push                # Actualizar schema en DB
npx prisma generate               # Regenerar cliente

# Servicios necesarios
ollama serve                      # Iniciar Ollama
ollama list                       # Ver modelos instalados
redis-server                      # Iniciar Redis (Windows: descargar separado)

# Verificaciones
ffmpeg -version                   # Verificar FFmpeg instalado
python --version                  # Verificar Python 3.10+
node --version                    # Verificar Node 18+
```

## 📁 ESTRUCTURA DEL PROYECTO

```
logos-poc/
├── app/                          # Next.js App Router
│   ├── (app)/
│   │   ├── layout.tsx           # Layout con sidebar
│   │   ├── page.tsx              # Dashboard
│   │   ├── videos/               # Gestión de videos
│   │   ├── search/               # Búsqueda
│   │   ├── queue/                # Cola de procesamiento
│   │   └── transcripts/          # Editor
│   └── api/
│       ├── videos/               # CRUD + upload + stream
│       ├── search/               # Endpoints de búsqueda
│       ├── transcripts/          # CRUD + export
│       ├── jobs/                 # Estado de cola
│       └── health/               # Verificación de servicios
├── components/                   # React components
│   ├── ui/                       # shadcn/ui
│   ├── video/                    # Player, upload, grid
│   ├── transcript/               # Viewer, editor, synced
│   ├── search/                   # SearchBar, results, filters
│   └── queue/                    # Estado y progreso
├── lib/                          # Lógica core
│   ├── whisper/                  # Wrapper del worker Python
│   ├── embeddings/               # Cliente Ollama
│   ├── search/                   # BM25, semantic, hybrid
│   ├── video/                    # FFmpeg helpers
│   ├── transcript/               # Parser, exporter
│   ├── jobs/                     # BullMQ setup
│   └── db/                       # Prisma client
├── workers/
│   ├── transcribe.py             # Worker faster-whisper
│   └── requirements.txt
├── prisma/
│   └── schema.prisma
├── storage/                      # gitignored
│   ├── videos/                   # MP4 originales
│   ├── audio/                    # WAV temporal (se borra)
│   ├── thumbnails/               # JPG generados
│   ├── transcripts/              # JSON con segmentos
│   └── watch/                    # Carpeta watched (inbox)
└── scripts/                      # Setup PowerShell
```

## 🎨 CONVENCIONES DE CÓDIGO

- **TypeScript estricto** pero pragmático (es POC)
- **Server Components** por defecto, Client Components solo cuando necesario
- **Naming:** camelCase variables, PascalCase componentes, kebab-case archivos
- **Imports:** alias @/ desde raíz
- **Tailwind** para todo el styling, evitar CSS custom
- **Error handling:** try/catch + mensajes amigables (NO stacktraces visibles al usuario)
- **Async/await** siempre, evitar callbacks anidados
- **Comentarios:** en español, solo donde la intención no sea obvia
- **Logs:** console.log temporal OK en POC, pero limpiar antes de demo

## 🔒 REGLAS NO NEGOCIABLES

1. **Air-gap real:** NUNCA dependencias que requieran internet en runtime
2. **No telemetría:** NEXT_TELEMETRY_DISABLED=1 siempre
3. **No CDNs:** todo bundled, fuentes self-hosted
4. **Datos locales:** SQLite + filesystem, nada cloud
5. **Ollama localhost:** OLLAMA_HOST=127.0.0.1:11434
6. **Sin servicios externos:** sin Sentry cloud, sin analytics, sin auto-update

## 💻 HARDWARE OBJETIVO (CRÍTICO)

```
CPU: Intel i5 4ta-6ta gen (2014-2016)
RAM: 16 GB
GPU: NO (solo CPU)
Sistema: Windows Server
```

**Implicancias técnicas no negociables:**
- ❌ NO usar PyTorch GPU
- ❌ NO usar Whisper "estándar" de OpenAI (demasiado lento)
- ❌ NO procesar 2+ videos en paralelo (satura CPU)
- ✅ faster-whisper modelo `medium` con compute_type=`int8`
- ✅ CPU threads = 4
- ✅ 1 video a la vez en cola
- ✅ vad_filter activado (saltea silencios = más rápido)

**Tiempos esperados realistas:**
- Video 60 min → ~25 min de transcripción
- Video 90 min → ~40 min
- Video 120 min → ~50 min

## 🎯 ALCANCE DEL POC

### ✅ SÍ implementar:

**Gestión:**
- Upload manual con drag & drop
- Carpeta /storage/watch monitoreada (chokidar)
- Solo MP4 en POC (validar formato)
- Metadata: título, instructor, fecha, categoría
- Thumbnail auto-generado con FFmpeg

**Procesamiento:**
- Extracción de audio con FFmpeg
- Transcripción con faster-whisper medium int8
- Optimizado para español rioplatense
- Initial prompt con vocabulario bancario
- Cola BullMQ con prioridades
- Progress tracking en tiempo real (SSE)

**Búsqueda (LA ESTRELLA):**
- Full-text con SQLite FTS5
- Semántica con embeddings (Ollama)
- Híbrida con Reciprocal Rank Fusion
- Filtros: instructor, categoría, fecha
- Highlights de palabras coincidentes
- Resultados: video + timestamp + fragmento

**Reproductor:**
- Vista dividida: transcripción + video
- Sync automático (highlight del segmento actual)
- Click en transcripción → salta en video
- Velocidad variable (1x, 1.25x, 1.5x, 2x)
- Auto-scroll del segmento activo

**Edición:**
- Editar transcripciones manualmente
- Auto-save
- Marcar términos técnicos

**Exportación:**
- PDF con timestamps
- DOCX
- SRT (subtítulos)

**UI/UX:**
- Dashboard con estadísticas
- Grid de videos con thumbnails
- Indicador "Modo Offline" prominente

### ❌ NO implementar (para v2):
- Autenticación / multi-usuario
- Chat con IA sobre videos (eso es MNEMOS)
- Multi-formato (solo MP4)
- OCR de slides
- Diarización (quién habla)
- Resúmenes con LLM
- Active Directory
- Detección de idioma
- Procesamiento paralelo

## 🚀 SPRINTS DEFINIDOS (7 días)

- **Día 1:** Foundation + Infra (Next.js, Prisma, schema, BullMQ, Layout)
- **Día 2:** Pipeline procesamiento (worker Python, FFmpeg, test E2E)
- **Día 3:** Upload + Cola (UI, watch folder, jobs, progress SSE)
- **Día 4:** Búsqueda + Embeddings (sqlite-vss, FTS5, híbrida)
- **Día 5:** Vista dividida + Reproductor (player, sync, auto-scroll)
- **Día 6:** Editor + Exportaciones (auto-save, PDF, DOCX, SRT)
- **Día 7:** Polish + Demo prep (videos reales, ensayar 3x)

## 📊 ESTADO ACTUAL

**Sprint actual:** Día 7 - Demo prep
**Última sesión:** 2026-06-06 — Días 4, 5 y 6 completados
**Próximo paso:** Pre-procesar videos reales del banco, ensayar búsquedas para la demo
**Bloqueos:** ninguno

### ✅ Día 1 completado (2026-06-05)

**Infraestructura:**
- Next.js 14.2.35 + TypeScript + Tailwind, servidor en puerto 3001
- Air-gap: `NEXT_TELEMETRY_DISABLED=1`, CSP sin CDNs, fuentes del sistema (sin Google Fonts)
- `.env` para Prisma CLI + `.env.local` para Next.js runtime (separados porque Prisma no lee `.env.local`)

**Base de datos:**
- Prisma + SQLite (`prisma/dev.db`) con schema completo
- Modelos: Video, Transcript, Segment, Job, VectorEmbedding, SearchHistory
- Enums convertidos a `String` con constantes tipadas en `lib/types.ts` (SQLite no soporta enums en Prisma)

**Cola de jobs:**
- `p-queue` con concurrencia 1 (sin Redis/Memurai — decisión definitiva para POC Windows)
- Estado de jobs persistido en SQLite vía modelo `Job`

**UI:**
- Sidebar oscuro + header con badge verde "Modo Privado · Sin Internet" (siempre visible)
- Dashboard con 4 StatsCards consultando DB en tiempo real
- Páginas placeholder para Videos, Búsqueda, Cola, Transcripciones (sin 404s)

**API:**
- `GET /api/health` → verifica DB + Ollama (`nomic-embed-text` confirmado instalado)

**Archivos clave creados:**
- `app/(app)/layout.tsx` — layout con sidebar
- `app/(app)/page.tsx` — dashboard
- `app/api/health/route.ts` — health check
- `components/layout/Sidebar.tsx`, `Header.tsx`
- `components/dashboard/StatsCards.tsx`
- `components/ui/button.tsx`, `card.tsx`, `badge.tsx`
- `lib/db/prisma.ts` — singleton Prisma
- `lib/jobs/queue.ts` — p-queue concurrencia:1
- `lib/types.ts` — constantes de enums
- `lib/utils.ts` — cn(), formatDuration(), formatTimestamp()
- `prisma/schema.prisma` — schema completo
- `next.config.mjs`, `tailwind.config.ts`, `tsconfig.json`
- `storage/` — directorios videos/, audio/, thumbnails/, transcripts/, watch/

### ✅ Día 2 completado (código) — pendiente test E2E

**Archivos creados:**
- `workers/transcribe.py` — faster-whisper medium int8, progreso vía stderr (`PROGRESS:N`)
- `workers/requirements.txt` — `faster-whisper==1.0.3`
- `workers/download_model.py` — descarga modelo a `storage/models/` para air-gap
- `lib/video/types.ts` + `lib/video/ffmpeg.ts` — extractAudio, generateThumbnail, getVideoMetadata, checkFFmpeg
- `lib/whisper/types.ts` + `lib/whisper/client.ts` — runTranscription via spawn, checkPython
- `lib/jobs/transcription-job.ts` — pipeline completo con reintentos y progreso en DB
- `scripts/test-pipeline.ts` — test E2E standalone (sin Next.js)
- `app/api/health/route.ts` — actualizado: verifica DB + Ollama + FFmpeg + Python

**⚠️ Para correr el test E2E (hacer antes del Día 3):**
```powershell
# 1. Instalar FFmpeg
winget install Gyan.FFmpeg
# Reiniciar PowerShell, verificar:
ffmpeg -version

# 2. Instalar faster-whisper
pip install faster-whisper==1.0.3
python -c "from faster_whisper import WhisperModel; print('OK')"

# 3. Verificar health (debe mostrar ffmpeg:true, python:true)
curl http://localhost:3001/api/health

# 4. Correr test E2E con un video corto
npm run test:pipeline -- --video ./storage/watch/tu-video.mp4
# (la primera corrida descarga el modelo medium ~1.5GB)
```

### ✅ Día 3 completado (2026-06-06)

- `POST /api/videos/upload` — valida MP4, guarda en storage/videos/, encola pipeline
- `GET /api/videos` — lista todos los videos con estado y job más reciente
- `GET /api/jobs` + `GET /api/jobs/sse` — cola y progreso SSE en tiempo real
- `VideoUpload` — drag & drop con form de metadata (título, instructor, categoría)
- `VideoCard` — thumbnail, status badge, barra de progreso si está procesando
- `JobProgress` — componente client con EventSource que actualiza barra en tiempo real
- Página `/videos` — grid de VideoCards
- Página `/queue` — jobs activos con SSE + historial reciente
- `workers/watch-folder.ts` — monitorea storage/watch/ con chokidar (`npm run watch`)
- `components/ui/progress.tsx` — barra de progreso reutilizable

### ✅ Día 4 completado (2026-06-06)

**Búsqueda semántica + embeddings:**
- `lib/embeddings/ollama.ts` — `getEmbedding()` llama a `POST /api/embeddings`, `generateEmbeddingsForVideo()` itera segmentos
- `lib/search/types.ts` — interfaces `SearchResult`, `SearchFilters`, `SearchOptions`
- `lib/search/fulltext.ts` — búsqueda por LIKE con scoring por términos encontrados
- `lib/search/semantic.ts` — cosine similarity en memoria sobre tabla `VectorEmbedding`
- `lib/search/hybrid.ts` — Reciprocal Rank Fusion (RRF k=60) combinando FT + sem
- `lib/search/highlight.ts` — marca `<mark>` en texto resultados
- `app/api/search/route.ts` — `GET /api/search?q=&type=&category=&instructor=` + `POST` para filtros
- `app/api/videos/[id]/thumbnail/route.ts` — sirve JPG desde filesystem
- `app/api/videos/[id]/stream/route.ts` — streaming MP4 con soporte de Range headers
- `components/search/SearchBar.tsx` — input debounced 400ms
- `components/search/SearchFilters.tsx` — selector tipo búsqueda + instructor + categoría
- `components/search/ResultCard.tsx` — card con thumbnail, timestamp, snippet con \`<mark>\`
- `app/(app)/search/page.tsx` — página completa client-side con URL params sincronizados
- `components/video/VideoPlayer.tsx` — player split-view con transcript sync (adelanto Día 5)
- `app/(app)/videos/[id]/page.tsx` — página de detalle de video con `?t=` param
- `lib/jobs/transcription-job.ts` — embeddings agregados al pipeline (step 4b, no crítico si Ollama no está)

**Pipeline actualizado:**
- Embeddings se generan automáticamente después de transcribir
- Si Ollama no está disponible, el video queda READY igual (embeddings = degraded gracefully)

### ✅ Día 5 completado (2026-06-06)

**VideoPlayer mejorado:**
- Velocidad variable (0.75×, 1×, 1.25×, 1.5×, 2×)
- Atajos de teclado: espacio = play/pause, ←→ = ±5s, Shift+←→ = ±15s
- Auto-scroll preciso: solo scrollea cuando el segmento activo sale del área visible
- Thumbnail real en VideoCard (via `/api/videos/[id]/thumbnail`)

**Editor de transcripciones:**
- `app/(app)/transcripts/page.tsx` — lista todos los videos READY
- `app/(app)/transcripts/[videoId]/page.tsx` — editor por video
- `components/transcript/TranscriptEditor.tsx` — click para editar segmento, auto-save tras 1s
- Indicador de estado: Guardando… / Guardado / Error

**Exportaciones:**
- `GET /api/transcripts/[videoId]/export?format=srt` — descarga .srt con timecodes
- `GET /api/transcripts/[videoId]/export?format=txt` — descarga texto plano

**APIs nuevas:**
- `GET/PATCH /api/transcripts/[videoId]` — leer o actualizar transcripción completa
- `PATCH /api/segments/[segmentId]` — editar segmento individual + recalcula wordCount

### ✅ Día 6 completado (2026-06-06)

**Dashboard mejorado:**
- `StatsCards` — 4 métricas: Videos, Horas de contenido, Palabras indexadas (con sufijo K/M), Transcritos listos
- `RecentVideos` — grid de los últimos 6 videos transcriptos con thumbnail, duración, instructor, tiempo relativo
- Accesos rápidos muestran contador de búsquedas realizadas

**UI polish:**
- `components/layout/ServiceStatus.tsx` — indicador de estado en sidebar, polling cada 30s a `/api/health`. Muestra estado general (verde/amarillo/rojo) + detalle por servicio (DB, Ollama, FFmpeg, Python)
- `app/not-found.tsx` — página 404 amigable con link al dashboard
- `app/(app)/error.tsx` — error boundary con botón "Reintentar"
- `VideoCard` — ahora muestra thumbnail real via `/api/videos/[id]/thumbnail`

### 🎯 Día 7 — Demo prep

**Antes de la demo:**
1. Correr `npm run dev` y verificar que todo carga sin errores
2. Verificar `/api/health` → todos los checks en verde
3. Subir 5-10 videos reales del banco via drag & drop o `storage/watch/`
4. Esperar a que terminen de transcribirse (o usar `npm run watch`)
5. Probar búsquedas semánticas con vocabulario bancario
6. Anotar 5 búsquedas que funcionen bien en la sección "Para la Demo" abajo
- UI de búsqueda con highlights y filtros
- Guardar historial en `SearchHistory`

## 📝 DECISIONES TOMADAS

**IA y procesamiento:**
- `faster-whisper` en vez de `openai-whisper` → 4x más rápido en CPU
- Cuantización `int8`, modelo `medium` → balance calidad/velocidad para español rioplatense con 16GB RAM
- Worker en Python (no Node) → faster-whisper solo existe en Python
- Progreso vía stderr con prefijo `PROGRESS:N` → Node parsea línea a línea con `spawn` (no `exec`)
- `spawn` en vez de `exec` para child_process → exec tiene límite de buffer, spawn permite streaming
- Reintentos automáticos x2 → fallos transitorios de Whisper (OOM momentáneo, etc.)
- Audio temporal borrado después de transcribir → no acumular WAVs en disco
- Sin auth en POC → todos los esfuerzos al motor de transcripción y búsqueda

**Base de datos:**
- SQLite + VectorEmbedding JSON en vez de PostgreSQL + pgvector → simplicidad para POC, migrar en v2
- Enums como `String` en Prisma+SQLite → SQLite no soporta enums; valores tipados en `lib/types.ts`
- Dos archivos de env: `.env` (Prisma CLI) + `.env.local` (Next.js) → Prisma CLI no lee `.env.local`

**Cola de jobs:**
- `p-queue` (concurrencia:1) en vez de BullMQ+Redis → Redis no es nativo en Windows; estado persistido en SQLite vía modelo `Job`; suficiente para POC con 1 worker
- 1 video a la vez → CPU limitada (i5 viejo), serializar es la única opción viable

**Frontend/Infra:**
- `next.config.mjs` en vez de `.ts` → Next.js 14 no soporta config TypeScript (solo Next.js 15+)
- Componentes shadcn/ui creados manualmente → sin CLI que requiera conexión a internet en build
- Fuentes del sistema (sin Google Fonts) → requisito air-gap estricto

## ⚠️ COSAS A EVITAR

- NO instalar dependencias innecesarias
- NO usar fetch a APIs externas
- NO procesar videos en paralelo (saturaría CPU del servidor)
- NO mostrar errores técnicos al usuario (siempre traducir a mensajes amigables)
- NO usar modelos Whisper más grandes que `medium` (RAM insuficiente con concurrencia)
- NO refactorizar prematuramente
- NO crear features fuera del scope listado arriba

## 🎬 PARA LA DEMO

**Pre-procesar TODO antes de la demo:**
- Tener 10-15 videos reales del banco YA transcritos
- NO procesar en vivo durante la demo (tarda mucho)
- Sí mostrar el flow de upload con un video corto que termine de procesarse durante el café

**Búsquedas pre-probadas que SIEMPRE funcionan:**
- [Anotar acá las 5 búsquedas que vas a hacer en la demo]
- [Verificar 3 veces que funcionan bien]

**Búsqueda semántica obligatoria (LA ESTRELLA):**
- Buscar palabra que NO aparece literal en ningún video
- Mostrar que encuentra sinónimos
- "Esto no es búsqueda por palabras, es búsqueda por significado"

**Demostrar Modo Offline:**
- Ejecutar `netstat -an | findstr ESTABLISHED` antes de empezar
- Mostrar que no hay conexiones a internet
- Indicador "Modo Privado" siempre visible en la UI

## 📚 ARCHIVOS DE REFERENCIA

- `@README.md` - Setup y comandos
- `@prisma/schema.prisma` - Schema de base de datos
- `@workers/transcribe.py` - Worker de Whisper
- `@docs/plan-7-dias.md` - Plan detallado de sprints
- `@docs/demo-script.md` - Guión de la demo

## 🐛 TROUBLESHOOTING COMÚN

**"Whisper tarda demasiado"**
→ Verificar compute_type="int8" en transcribe.py
→ Verificar cpu_threads=4
→ Verificar vad_filter=True
→ Considerar modelo `small` para POC si es crítico

**"Embeddings dan resultados raros"**
→ Verificar que Ollama esté corriendo
→ Verificar modelo: `ollama list` debe mostrar `nomic-embed-text`
→ Re-generar embeddings de todos los segmentos

**"FFmpeg no encontrado"**
→ Verificar PATH del sistema
→ En Windows: ffmpeg.exe debe estar en C:\Windows\System32 o similar

**"Redis no responde"**
→ En Windows usar Memurai o Redis para Windows (no es nativo)
→ Alternativa: usar `better-queue` (en memoria, sin Redis)

**"sqlite-vss falla al cargar"**
→ Verificar versión de SQLite (necesita 3.41+)
→ En Windows requiere VC++ Redistributable

## 🔗 RECURSOS

- **faster-whisper:** https://github.com/SYSTRAN/faster-whisper
- **sqlite-vss:** https://github.com/asg017/sqlite-vss
- **BullMQ:** https://docs.bullmq.io/
- **Ollama:** https://ollama.com/
- **video.js:** https://videojs.com/

---

> **Para Claude Code:** Este es un POC con deadline de 7 días. Priorizar velocidad de implementación y feedback visual sobre arquitectura perfecta. La búsqueda semántica es LA estrella - debe funcionar impecable. Al terminar cada día, actualizá la sección "Estado actual" arriba.
