# 🎥 LOGOS - Plataforma de Conocimiento Audiovisual Corporativo

> **Prompt para Claude Code** | POC de 1 semana para demo a gerencia
> 
> Sistema 100% offline de transcripción automática de videos de capacitación bancaria con búsqueda semántica avanzada.

---

## 🎯 VISIÓN DEL PROYECTO

**LOGOS** *(palabra griega que significa "discurso", "razón", "conocimiento expresado en palabras")* es la herramienta complementaria a MNEMOS: mientras MNEMOS gestiona documentos escritos, **LOGOS extrae conocimiento del audio**.

Cuando un experto del banco da una capacitación grabada de 90 minutos, ese conocimiento **queda atrapado en el video**. Encontrar "qué se dijo sobre cuentas judiciales" requiere mirar el video entero. Eso es inviable.

LOGOS resuelve esto: transcribe automáticamente todos los videos de capacitación, los hace **buscables semánticamente**, y permite **saltar al segundo exacto** donde se menciona lo que estás buscando.

### La pregunta que LOGOS responde:

Sin LOGOS:
> *"Tengo 200 videos de capacitación. ¿En cuál de ellos hablaron sobre cierre de cuentas inactivas?"* → 400 horas de video para revisar

Con LOGOS:
> *Buscás "cierre cuentas inactivas" → 3 resultados con timestamps exactos → click → reproduce desde el minuto 47:23 del video correcto.*

---

## 🏦 CONTEXTO DEL PROYECTO

| Aspecto | Detalle |
|---------|---------|
| **Industria** | Banca / Argentina |
| **Usuarios** | Banco completo (50+ empleados concurrentes) |
| **Casos de uso** | Capacitación interna, onboarding, consulta de conocimiento |
| **Videos** | 50-500 videos, MP4 principal, 45-120 min duración |
| **Audio** | Español rioplatense, mayormente Zoom/Teams (calidad variable) |
| **Privacidad** | 100% offline / air-gapped (datos no salen de la red) |
| **Deadline** | POC en 1 semana para validar con gerencia |

---

## 💻 HARDWARE OBJETIVO (Crítico para decisiones técnicas)

```
Servidor: Windows Server
CPU: Intel i5 4ta-6ta generación (2014-2016)
RAM: 16 GB
GPU: NO (solo CPU)
Almacenamiento: SSD asumido
```

**Implicancias:**
- ❌ NO usar PyTorch GPU
- ❌ NO usar Whisper "estándar" de OpenAI (muy lento sin GPU)
- ✅ Usar `faster-whisper` (CTranslate2 + INT8) - 4x más rápido en CPU
- ✅ Modelo `medium` cuantizado int8 - balance calidad/velocidad ideal
- ✅ Procesamiento en background con cola de trabajos
- ✅ Solo 1 transcripción simultánea (no saturar CPU)

---

## ⚙️ DECISIONES TÉCNICAS YA TOMADAS

### Stack del Backend
```typescript
- Next.js 14 (App Router) + TypeScript
- Prisma ORM
- SQLite (POC) → PostgreSQL (producción)
- BullMQ + Redis para cola de transcripciones
- pgvector / sqlite-vss para búsqueda semántica
```

### Stack de IA (TODO LOCAL)
```python
- faster-whisper (medium model, int8 quantization) → transcripción
- Ollama + nomic-embed-text → embeddings para búsqueda semántica
- Sentence-transformers (all-MiniLM-L6-v2) como fallback
- FFmpeg → extracción de audio del video
```

### Stack del Frontend
```typescript
- React 18 + Next.js
- Tailwind CSS + shadcn/ui
- video.js o react-player → reproductor
- Vista dividida sincronizada (transcripción + video)
- Search UI con highlights
```

---

## 📋 REQUISITOS FUNCIONALES DEL POC

### ✅ ENTRA en el POC (1 semana):

**Gestión de videos:**
1. Subida manual por admins (drag & drop)
2. Carpeta "watch" para subida masiva automática
3. Validación de formato (solo MP4 en POC)
4. Vista previa con thumbnail
5. Metadata: título, instructor, fecha, tema/categoría

**Transcripción automática:**
6. Extracción de audio con FFmpeg
7. Transcripción con faster-whisper (medium int8)
8. Optimizado para español rioplatense
9. Generación de segmentos con timestamps precisos
10. Cola de procesamiento en background (1 video a la vez)
11. Indicador de estado en tiempo real (cola, procesando, listo)
12. Estimación de tiempo restante

**Repositorio de transcripciones:**
13. Almacenamiento de transcripción completa + segmentada
14. Edición manual de transcripciones (corregir errores)
15. Marcado de términos técnicos bancarios
16. Exportación a PDF, Word (DOCX), SRT (subtítulos)

**Búsqueda inteligente (LA ESTRELLA):**
17. Búsqueda full-text básica (BM25)
18. **Búsqueda semántica** con embeddings (busca "devolución" → encuentra "reintegro", "reembolso")
19. Resultados combinados: video + timestamp + fragmento de contexto
20. Highlights de palabras coincidentes
21. Filtros: instructor, categoría/tema, rango de fechas
22. Ordenamiento por relevancia o fecha

**Reproductor sincronizado:**
23. Vista dividida: transcripción a la izquierda, video a la derecha
24. **Highlight automático** del párrafo actual mientras reproduce
25. Click en cualquier palabra → salta al segundo exacto
26. Velocidad de reproducción (1x, 1.25x, 1.5x, 2x)
27. Búsqueda dentro de la transcripción del video actual

**UI/UX:**
28. Dashboard con estadísticas (total videos, horas, transcritos, en cola)
29. Lista de videos con grid de thumbnails
30. Indicador "Modo Offline" visible siempre

### ❌ NO entra en el POC (para v2):

- Autenticación / multi-usuario (sin login en POC)
- Chat con IA sobre videos (eso es MNEMOS)
- Soporte multi-formato (solo MP4)
- OCR de slides dentro del video
- Reconocimiento de speakers (diarización)
- Resúmenes automáticos con LLM
- Integración con Active Directory
- Detección de idioma automática
- Procesamiento paralelo de múltiples videos

---

## 🏗️ ARQUITECTURA

```
┌─────────────────────────────────────────────────────┐
│  FRONTEND (Next.js)                                 │
│  ┌──────────┐ ┌──────────┐ ┌─────────────────────┐ │
│  │Dashboard │ │ Búsqueda │ │ Reproductor + Trans │ │
│  └──────────┘ └──────────┘ └─────────────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌─────────────────────┐ │
│  │  Upload  │ │  Videos  │ │   Cola de Procesos  │ │
│  └──────────┘ └──────────┘ └─────────────────────┘ │
└─────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│  API ROUTES (Next.js)                               │
│  /api/videos  /api/search  /api/transcripts         │
│  /api/jobs    /api/export  /api/stats               │
└─────────────────────────────────────────────────────┘
                       ↓
        ┌──────────────┴──────────────┐
        ↓                             ↓
┌───────────────┐            ┌────────────────────┐
│   SQLite +    │            │   Cola de Jobs     │
│   Prisma      │            │   (BullMQ)         │
│  (metadata,   │            │                    │
│   chunks)     │            └────────────────────┘
└───────────────┘                     ↓
        ↓                  ┌────────────────────────┐
┌───────────────┐          │  Worker Python         │
│  sqlite-vss   │          │  (proceso background)  │
│  (embeddings) │          │  - FFmpeg              │
└───────────────┘          │  - faster-whisper      │
                           │  - Embeddings          │
                           └────────────────────────┘
                                     ↓
                           ┌────────────────────────┐
                           │  Filesystem            │
                           │  - /videos             │
                           │  - /audio (temp)       │
                           │  - /transcripts        │
                           │  - /watch (inbox)      │
                           └────────────────────────┘
```

---

## 📁 ESTRUCTURA DEL PROYECTO

```
logos-poc/
├── app/                              # Next.js App Router
│   ├── (app)/
│   │   ├── layout.tsx               # Layout con sidebar
│   │   ├── page.tsx                  # Dashboard
│   │   ├── videos/
│   │   │   ├── page.tsx              # Grid de videos
│   │   │   ├── [id]/page.tsx         # Vista dividida video+transcripción
│   │   │   └── upload/page.tsx       # Upload UI
│   │   ├── search/page.tsx           # Búsqueda con filtros
│   │   ├── queue/page.tsx            # Cola de procesamiento
│   │   └── transcripts/
│   │       └── [id]/edit/page.tsx    # Editor de transcripción
│   ├── api/
│   │   ├── videos/
│   │   │   ├── route.ts              # GET, POST
│   │   │   ├── [id]/route.ts
│   │   │   ├── upload/route.ts
│   │   │   └── stream/[id]/route.ts  # Streaming de video
│   │   ├── search/
│   │   │   ├── fulltext/route.ts     # BM25
│   │   │   ├── semantic/route.ts     # Embeddings
│   │   │   └── hybrid/route.ts       # Combinado
│   │   ├── transcripts/
│   │   │   ├── [id]/route.ts
│   │   │   ├── [id]/export/route.ts  # PDF, DOCX, SRT
│   │   │   └── segments/route.ts
│   │   ├── jobs/
│   │   │   ├── route.ts              # Estado de cola
│   │   │   └── [id]/route.ts
│   │   └── health/route.ts
│   └── layout.tsx
├── components/
│   ├── ui/                           # shadcn/ui
│   ├── video/
│   │   ├── VideoPlayer.tsx
│   │   ├── VideoCard.tsx
│   │   ├── VideoGrid.tsx
│   │   └── VideoUpload.tsx
│   ├── transcript/
│   │   ├── TranscriptViewer.tsx     # Lista de segmentos
│   │   ├── TranscriptEditor.tsx     # Editor con auto-save
│   │   ├── SyncedTranscript.tsx     # Sync con video
│   │   └── TimestampJump.tsx
│   ├── search/
│   │   ├── SearchBar.tsx
│   │   ├── SearchResults.tsx
│   │   ├── ResultCard.tsx           # Card con video + segmento
│   │   └── SearchFilters.tsx
│   ├── queue/
│   │   ├── QueueStatus.tsx
│   │   └── JobProgress.tsx
│   └── layout/
│       └── Sidebar.tsx
├── lib/
│   ├── whisper/
│   │   ├── client.ts                # Wrapper del worker Python
│   │   └── types.ts
│   ├── embeddings/
│   │   ├── ollama.ts
│   │   └── index.ts
│   ├── search/
│   │   ├── fulltext.ts              # BM25 / SQLite FTS5
│   │   ├── semantic.ts              # Vector search
│   │   └── hybrid.ts                # RRF combinación
│   ├── video/
│   │   ├── thumbnail.ts             # Genera thumbnail con FFmpeg
│   │   ├── duration.ts
│   │   └── metadata.ts
│   ├── transcript/
│   │   ├── parser.ts                # Parse output de Whisper
│   │   ├── chunker.ts               # Split inteligente
│   │   ├── exporter.ts              # A PDF, DOCX, SRT
│   │   └── srt.ts
│   ├── jobs/
│   │   ├── queue.ts                 # BullMQ setup
│   │   ├── transcription-job.ts
│   │   └── embedding-job.ts
│   ├── db/
│   │   └── prisma.ts
│   └── utils/
│       ├── ffmpeg.ts
│       └── format.ts
├── workers/
│   ├── transcribe.py                # Worker Python con faster-whisper
│   ├── requirements.txt
│   └── watch-folder.ts              # Monitorea carpeta /watch
├── prisma/
│   └── schema.prisma
├── storage/
│   ├── videos/                       # Videos originales
│   ├── audio/                        # Audio extraído (temporal)
│   ├── thumbnails/                   # Thumbnails generados
│   ├── transcripts/                  # JSON con segmentos
│   └── watch/                        # Carpeta watched (inbox)
├── public/
├── scripts/
│   ├── setup.ps1                     # Setup inicial Windows
│   ├── install-ffmpeg.ps1
│   └── install-whisper.ps1
├── .env.local
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🗄️ SCHEMA DE BASE DE DATOS (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model Video {
  id              String        @id @default(cuid())
  
  // Metadata básica
  title           String
  description     String?
  filename        String
  filepath        String
  fileSize        BigInt
  duration        Int           // segundos
  mimeType        String
  
  // Metadata de capacitación
  instructor      String?
  category        String?       // "Cuentas", "Tarjetas", "Compliance", etc.
  topic           String?
  recordedAt      DateTime?     // Cuándo se grabó originalmente
  
  // Procesamiento
  status          VideoStatus   @default(UPLOADED)
  processingError String?
  
  // Thumbnail
  thumbnailPath   String?
  
  // Relaciones
  transcript      Transcript?
  segments        Segment[]
  jobs            Job[]
  
  uploadedAt      DateTime      @default(now())
  processedAt     DateTime?
  
  @@index([status])
  @@index([category])
  @@index([instructor])
  @@index([recordedAt])
}

enum VideoStatus {
  UPLOADED              // Subido, esperando procesamiento
  EXTRACTING_AUDIO      // FFmpeg trabajando
  TRANSCRIBING          // Whisper trabajando  
  GENERATING_EMBEDDINGS // Creando vectores
  READY                 // Todo listo
  ERROR                 // Falló
}

model Transcript {
  id              String   @id @default(cuid())
  videoId         String   @unique
  video           Video    @relation(fields: [videoId], references: [id], onDelete: Cascade)
  
  // Texto completo
  fullText        String
  language        String   @default("es")
  
  // Métricas
  wordCount       Int
  characterCount  Int
  avgConfidence   Float?
  
  // Edición manual
  isEdited        Boolean  @default(false)
  editedAt        DateTime?
  editedBy        String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Segment {
  id              String   @id @default(cuid())
  videoId         String
  video           Video    @relation(fields: [videoId], references: [id], onDelete: Cascade)
  
  // Posición en el video
  startTime       Float    // segundos
  endTime         Float    // segundos
  segmentIndex    Int
  
  // Texto
  text            String
  
  // Calidad de transcripción
  confidence      Float?
  
  // Edición manual
  originalText    String?  // Si fue editado, mantener original
  isEdited        Boolean  @default(false)
  
  // Embedding (vector) - se guarda en sqlite-vss separadamente
  embeddingId     String?  @unique
  
  createdAt       DateTime @default(now())
  
  @@index([videoId])
  @@index([videoId, segmentIndex])
  @@index([videoId, startTime])
}

model Job {
  id              String      @id @default(cuid())
  videoId         String
  video           Video       @relation(fields: [videoId], references: [id], onDelete: Cascade)
  
  type            JobType
  status          JobStatus   @default(PENDING)
  priority        Int         @default(0)
  
  progress        Int         @default(0)  // 0-100
  estimatedTimeRemaining Int? // segundos
  
  startedAt       DateTime?
  completedAt     DateTime?
  
  error           String?
  attempts        Int         @default(0)
  
  createdAt       DateTime    @default(now())
  
  @@index([status])
  @@index([videoId])
}

enum JobType {
  EXTRACT_AUDIO
  TRANSCRIBE
  GENERATE_EMBEDDINGS
  GENERATE_THUMBNAIL
}

enum JobStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}

model SearchHistory {
  id            String   @id @default(cuid())
  query         String
  resultCount   Int
  searchType    String   // "fulltext" | "semantic" | "hybrid"
  createdAt     DateTime @default(now())
  
  @@index([createdAt])
}
```

---

## 🐍 WORKER DE TRANSCRIPCIÓN (Python)

```python
# workers/transcribe.py
# Worker independiente que procesa videos con faster-whisper

import sys
import json
import argparse
from pathlib import Path
from faster_whisper import WhisperModel

def transcribe_video(audio_path: str, output_path: str, model_size: str = "medium"):
    """
    Transcribe audio usando faster-whisper optimizado para CPU.
    
    Configuración óptima para i5 + 16GB RAM + sin GPU:
    - Modelo: medium (calidad muy buena en español)
    - Compute type: int8 (4x más rápido, mínima pérdida de calidad)
    - CPU threads: 4 (la mayoría de i5 tienen 4 cores)
    - Beam size: 5 (balance entre calidad y velocidad)
    """
    
    print(f"Cargando modelo {model_size} en CPU con cuantización int8...", file=sys.stderr)
    
    model = WhisperModel(
        model_size,
        device="cpu",
        compute_type="int8",  # CRUCIAL para velocidad en CPU
        cpu_threads=4,
        num_workers=1
    )
    
    print(f"Transcribiendo {audio_path}...", file=sys.stderr)
    
    segments, info = model.transcribe(
        audio_path,
        language="es",  # Español forzado, no detectar
        beam_size=5,
        vad_filter=True,  # Voice Activity Detection (saltea silencios)
        vad_parameters=dict(min_silence_duration_ms=500),
        word_timestamps=False,  # No necesario, segmentos suficientes
        initial_prompt="Capacitación bancaria en español argentino. Términos: BCRA, CBU, CVU, cuenta corriente, caja de ahorro, plazo fijo, tarjeta de crédito.",
        condition_on_previous_text=True,
        temperature=0.0,  # Determinístico
    )
    
    # Convertir generator a lista
    result = {
        "language": info.language,
        "duration": info.duration,
        "segments": [
            {
                "index": i,
                "start": segment.start,
                "end": segment.end,
                "text": segment.text.strip(),
                "confidence": segment.avg_logprob,
            }
            for i, segment in enumerate(segments)
        ]
    }
    
    # Texto completo
    result["full_text"] = " ".join(s["text"] for s in result["segments"])
    
    # Guardar
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Transcripción completa: {len(result['segments'])} segmentos", file=sys.stderr)
    return result

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True, help="Path al archivo de audio")
    parser.add_argument("--output", required=True, help="Path donde guardar JSON")
    parser.add_argument("--model", default="medium", help="Tamaño del modelo")
    args = parser.parse_args()
    
    transcribe_video(args.audio, args.output, args.model)
```

```txt
# workers/requirements.txt
faster-whisper==1.0.3
```

**Decisión técnica clave:** Usamos `faster-whisper` con **cuantización int8** porque:

1. **4x más rápido** que Whisper original en CPU
2. **30% menos memoria** que float16
3. **Mínima pérdida de calidad** (<2% WER en español)
4. **Sin dependencias de GPU** (CUDA opcional pero no requerido)

---

## 🔍 BÚSQUEDA HÍBRIDA (Implementación)

```typescript
// lib/search/hybrid.ts

interface SearchResult {
  segmentId: string;
  videoId: string;
  videoTitle: string;
  text: string;
  startTime: number;
  endTime: number;
  thumbnail: string;
  
  // Scores
  fulltextScore: number;
  semanticScore: number;
  combinedScore: number;
  
  // Highlights
  highlights: string[];
}

export async function hybridSearch(
  query: string,
  filters: SearchFilters,
  limit: number = 20
): Promise<SearchResult[]> {
  
  // 1. Ejecutar búsquedas en paralelo
  const [fulltextResults, semanticResults] = await Promise.all([
    fulltextSearch(query, filters, limit * 2),    // BM25 con SQLite FTS5
    semanticSearch(query, filters, limit * 2),     // Vectores
  ]);
  
  // 2. Reciprocal Rank Fusion (combinar rankings)
  const fusedResults = reciprocalRankFusion(
    [fulltextResults, semanticResults],
    { k: 60 }
  );
  
  // 3. Re-ranking final por relevancia + recencia
  const reranked = fusedResults.sort((a, b) => {
    // Combinar score con boost por video reciente
    const recencyBoostA = recencyBoost(a.videoUploadedAt);
    const recencyBoostB = recencyBoost(b.videoUploadedAt);
    return (b.combinedScore + recencyBoostB) - (a.combinedScore + recencyBoostA);
  });
  
  return reranked.slice(0, limit);
}

// Genera highlights con palabras de la query
function generateHighlights(text: string, query: string): string[] {
  const queryWords = query.toLowerCase().split(/\s+/);
  const sentences = text.split(/[.!?]+/);
  
  return sentences
    .filter(s => queryWords.some(w => s.toLowerCase().includes(w)))
    .map(s => highlightWords(s, queryWords))
    .slice(0, 3);
}
```

---

## 🎨 VISTA DIVIDIDA: TRANSCRIPCIÓN + VIDEO

```typescript
// components/transcript/SyncedTranscript.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Segment } from "@prisma/client";

interface Props {
  segments: Segment[];
  currentTime: number;
  onSegmentClick: (startTime: number) => void;
  searchQuery?: string;
}

export function SyncedTranscript({ 
  segments, 
  currentTime, 
  onSegmentClick,
  searchQuery 
}: Props) {
  const activeSegmentRef = useRef<HTMLDivElement>(null);
  
  // Encontrar segmento activo según currentTime del video
  const activeSegmentIndex = segments.findIndex(
    s => currentTime >= s.startTime && currentTime <= s.endTime
  );
  
  // Auto-scroll al segmento activo
  useEffect(() => {
    if (activeSegmentRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }
  }, [activeSegmentIndex]);
  
  return (
    <div className="h-full overflow-y-auto px-4 py-2">
      {segments.map((segment, index) => {
        const isActive = index === activeSegmentIndex;
        const text = searchQuery 
          ? highlightQueryInText(segment.text, searchQuery)
          : segment.text;
        
        return (
          <div
            key={segment.id}
            ref={isActive ? activeSegmentRef : null}
            onClick={() => onSegmentClick(segment.startTime)}
            className={`
              p-3 rounded-lg cursor-pointer transition-all mb-2
              ${isActive 
                ? "bg-blue-100 border-l-4 border-blue-500 shadow-sm" 
                : "hover:bg-gray-50"
              }
            `}
          >
            <div className="text-xs text-gray-500 mb-1 font-mono">
              {formatTimestamp(segment.startTime)}
            </div>
            <div 
              className="text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: text }}
            />
          </div>
        );
      })}
    </div>
  );
}
```

---

## 🚀 PLAN DE 7 DÍAS (1 SEMANA)

### **Día 1: Foundation + Infraestructura**
- [ ] Verificar pre-requisitos (Node, Python, FFmpeg)
- [ ] Setup Next.js 14 + TypeScript + Tailwind + shadcn
- [ ] Configurar air-gap (sin telemetría, CSP, fuentes locales)
- [ ] Prisma + SQLite + schema completo
- [ ] Setup BullMQ + Redis local
- [ ] Layout base con sidebar y dashboard

### **Día 2: Pipeline de Procesamiento**
- [ ] Instalar Python + faster-whisper + dependencias
- [ ] Worker Python (`transcribe.py`)
- [ ] Test manual: transcribir 1 video corto end-to-end
- [ ] Integración Node ↔ Python (child_process)
- [ ] FFmpeg para extracción de audio y thumbnails
- [ ] Validación de tiempos reales en hardware objetivo

### **Día 3: Upload + Cola de Procesamiento**
- [ ] UI de upload (drag & drop)
- [ ] Endpoint POST `/api/videos/upload`
- [ ] Watch folder con chokidar
- [ ] Cola BullMQ: extract audio → transcribe → embeddings → ready
- [ ] UI de cola con progreso en tiempo real (SSE)
- [ ] Manejo de errores y reintentos

### **Día 4: Búsqueda y Embeddings**
- [ ] Setup sqlite-vss
- [ ] Generación de embeddings con Ollama (nomic-embed-text)
- [ ] Búsqueda full-text con SQLite FTS5
- [ ] Búsqueda semántica
- [ ] Búsqueda híbrida con RRF
- [ ] UI de búsqueda con filtros y highlights

### **Día 5: Vista Dividida + Reproductor**
- [ ] Reproductor de video (video.js o react-player)
- [ ] Streaming de video desde el servidor
- [ ] Componente SyncedTranscript
- [ ] Click en transcripción → salta en video
- [ ] Auto-scroll del segmento activo
- [ ] Control de velocidad de reproducción

### **Día 6: Editor + Exportaciones**
- [ ] Editor de transcripción con auto-save
- [ ] Marcar términos técnicos
- [ ] Export a PDF (con timestamps)
- [ ] Export a DOCX
- [ ] Export a SRT (subtítulos)

### **Día 7: Polish + Demo**
- [ ] Indicador "Modo Offline" prominente
- [ ] Cargar 5-10 videos reales del banco
- [ ] Esperar transcripciones completas
- [ ] Probar búsquedas reales que vas a hacer en demo
- [ ] Ensayar demo de 10 minutos 2-3 veces
- [ ] README con instrucciones de instalación

---

## 🎬 STORYBOARD DE LA DEMO (10 minutos)

### Minuto 0-1: El problema
> "Tenemos cientos de horas de capacitaciones grabadas. Cuando alguien necesita una respuesta específica, ¿cómo la encuentra? Tiene que ver el video entero o adivinar el minuto. Hoy lo perdemos."

### Minuto 1-2: La solución
> "LOGOS transcribe automáticamente todos nuestros videos y los hace buscables al nivel de palabras. Y todo corre acá, en nuestra red, sin internet."
> 
> [Mostrar netstat: cero conexiones externas]

### Minuto 2-4: Subir un video
> [Drag & drop de un MP4]
> [Mostrar cola: "Extrayendo audio... Transcribiendo (45min restantes)... Listo"]
> "Mientras se procesa, sigamos con uno ya transcrito"

### Minuto 4-7: 🌟 LA BÚSQUEDA SEMÁNTICA
> Búsqueda 1: "cierre de cuentas" → resultados con timestamps
> 
> Búsqueda 2: "devolución de dinero" → encuentra videos que dicen "reintegro", "reembolso", "restitución" (¡SIN tener esas palabras exactas!)
> 
> "Esto NO es búsqueda por palabras. Es búsqueda por significado."

### Minuto 7-9: Vista dividida
> [Click en un resultado]
> [Vista: video a la derecha, transcripción a la izquierda]
> [Reproducir → la transcripción sigue al video, se highlightea]
> [Click en una palabra de la transcripción → video salta]

### Minuto 9-10: Visión
> "Este POC tiene 10 videos. Imaginen el sistema completo con 500 horas de capacitación. Cada empleado nuevo puede encontrar respuestas en segundos. Lo que antes era conocimiento perdido en videos, ahora es nuestra biblioteca consultable."

---

## ⚠️ RIESGOS CONOCIDOS Y MITIGACIONES

| Riesgo | Probabilidad | Mitigación |
|--------|--------------|------------|
| Whisper lento en demo | Alta | Pre-procesar videos antes de la demo |
| CPU saturada con varios usuarios | Media | Cola serializa; mostrar "1 transcripción a la vez" como feature |
| Audio mala calidad (Zoom) | Alta | `vad_filter=true` + prompt en español + edición manual |
| Términos bancarios mal transcritos | Alta | `initial_prompt` con vocabulario + edición manual |
| Video MP4 con codec raro | Baja | FFmpeg maneja todo; validar antes de subir |
| RAM insuficiente | Baja con 16GB | Limitar a 1 worker; modelo `medium` usa 5GB |

---

## ✅ CRITERIOS DE ÉXITO

El POC será exitoso cuando:

1. ✅ Subir un MP4 y obtener transcripción completa en < 2x duración del video
2. ✅ Búsqueda "reintegro" devuelve segmentos que dicen "devolución" o "reembolso"
3. ✅ Click en resultado → video reproduce desde el segundo exacto
4. ✅ Transcripción sincronizada con video (highlight automático)
5. ✅ Términos bancarios argentinos correctamente transcritos (BCRA, CBU, etc.)
6. ✅ Cero conexiones a internet durante uso
7. ✅ Gerencia entiende el valor en 10 minutos de demo

---

## 🎬 COMANDO INICIAL PARA CLAUDE CODE

```
Vamos a construir LOGOS POC: plataforma 100% offline de transcripción 
automática de videos de capacitación bancaria con búsqueda semántica avanzada.

📂 CONTEXTO COMPLETO:
Leé este archivo de prompt completo - tiene todo: visión, stack, schema, 
arquitectura, plan de 7 días.

🎯 OBJETIVO HOY:
Implementar DÍA 1: Foundation + Infraestructura

📋 ANTES DE CODEAR:

1. VERIFICACIÓN DE ENTORNO:
   - Node.js 20+ presente?
   - Python 3.10+ presente?
   - FFmpeg instalado?
   - Redis local o necesitamos instalarlo?
   - Ollama corriendo? (con nomic-embed-text descargado)

2. PROPONÉ EL PLAN DETALLADO del Día 1:
   - Archivos a crear (con paths exactos)
   - Dependencias npm a instalar (justificá cada una)
   - Estructura inicial de carpetas
   - Configuración air-gap específica
   - Cualquier decisión que requiera mi input

3. ALERTAS TEMPRANAS:
   Si detectás algún problema potencial con el hardware objetivo 
   (i5 viejo, 16GB, sin GPU) decímelo ANTES de codear.

4. ESPERÁ MI CONFIRMACIÓN antes de tocar código.

🔧 ALCANCE DEL DÍA 1 (solo esto):
✅ Next.js 14 + TypeScript + Tailwind + shadcn/ui
✅ Configuración air-gap completa
✅ Prisma + SQLite con schema completo (Video, Transcript, Segment, Job)
✅ Setup BullMQ + Redis (o alternativa si Redis es problema)
✅ Layout base con sidebar
✅ Dashboard con cards de estadísticas (vacías por ahora)
✅ Indicador "Modo Offline" en header
✅ Endpoint /api/health

❌ NO en Día 1:
- Upload de videos (es Día 3)
- Worker Python (es Día 2)
- Búsqueda (es Día 4)
- Reproductor (es Día 5)

⚠️ REGLAS:
- Plan Mode (Shift+Tab) antes de tareas grandes
- Pedime confirmación antes de instalar dependencias nuevas
- TypeScript estricto pero pragmático (POC, no enterprise)
- Documentar decisiones en CLAUDE.md
- Mantenete dentro del scope del Día 1

Al terminar Día 1:
- Actualizá CLAUDE.md sección "Estado actual"
- Decime cómo verificar que todo funciona
- Sugerí commit message

Empezá ahora: verificá entorno y presentame el plan.
```

---

## 📚 RECURSOS Y DOCUMENTACIÓN

- **faster-whisper:** https://github.com/SYSTRAN/faster-whisper
- **Whisper modelos:** https://github.com/openai/whisper#available-models-and-languages
- **FFmpeg:** https://ffmpeg.org/
- **sqlite-vss:** https://github.com/asg017/sqlite-vss
- **BullMQ:** https://docs.bullmq.io/
- **Ollama:** https://ollama.com/
- **video.js:** https://videojs.com/

---

## 💡 EVOLUCIÓN POST-POC

Si la gerencia aprueba, en v2 agregar:

1. **Autenticación** con Active Directory del banco
2. **Roles** (admin, capacitador, visualizador)
3. **Diarización** (identificar quién habla en cada momento)
4. **Resúmenes automáticos** con LLM local
5. **Más formatos** (AVI, MKV, MOV)
6. **OCR de slides** dentro del video
7. **Chapters automáticos** (capítulos detectados por IA)
8. **Quizzes auto-generados** desde la transcripción
9. **Integración con MNEMOS** (videos + documentos en una sola búsqueda)
10. **Migración a PostgreSQL** + pgvector para escala
11. **Procesamiento paralelo** si se consigue hardware con GPU
12. **Análitica de uso** (qué videos se ven más, qué se busca)

---

> **Mantra del proyecto:** *"Si está en un video, debe ser tan buscable como si estuviera en un documento. Si está en nuestra red, no sale de nuestra red. Si lo dijo un experto, no se pierde."*
