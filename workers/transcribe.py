#!/usr/bin/env python3
"""
Worker de transcripción con faster-whisper.
Invocado por Node.js via child_process.spawn().

Protocolo de comunicación con Node:
  - Args:   --audio <path> --output <path> [--model <medium|small|...>]
  - stdout: silencio (todo va a stderr para no mezclar con el JSON)
  - stderr: líneas con prefijos:
      PROGRESS:{0-100}   → porcentaje de avance (léido por Node)
      INFO:{mensaje}     → logs informativos
      ERROR:{mensaje}    → error fatal (previo a sys.exit(1))
  - exit 0: éxito, JSON guardado en --output
  - exit 1: fallo
"""

import sys
import json
import argparse
from pathlib import Path


def log(msg: str) -> None:
    print(f"INFO:{msg}", file=sys.stderr, flush=True)


def progress(pct: int) -> None:
    print(f"PROGRESS:{pct}", file=sys.stderr, flush=True)


def transcribe(audio_path: str, output_path: str, model_path: str) -> dict:
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("ERROR:faster-whisper no instalado. Ejecutar: pip install faster-whisper==1.0.3", file=sys.stderr, flush=True)
        sys.exit(1)

    log(f"Cargando modelo '{model_path}' (CPU, int8)...")
    progress(2)

    model = WhisperModel(
        model_path,
        device="cpu",
        compute_type="int8",
        cpu_threads=4,
        num_workers=1,
        # large-v3: mejor calidad en español, procesa más lento (OK para overnight)
        # Para volver a medium: cambiar WHISPER_MODEL_PATH=medium en .env.local
    )

    log(f"Transcribiendo {Path(audio_path).name}...")
    progress(5)

    segments_gen, info = model.transcribe(
        audio_path,
        language="es",           # Español forzado — no auto-detectar
        beam_size=5,
        vad_filter=True,         # Saltea silencios → más rápido
        vad_parameters=dict(min_silence_duration_ms=500),
        word_timestamps=False,
        initial_prompt=(
            "Capacitación bancaria en español argentino. "
            "Términos: BCRA, CBU, CVU, cuenta corriente, caja de ahorro, "
            "plazo fijo, tarjeta de crédito, débito automático, transferencia."
        ),
        condition_on_previous_text=True,
        temperature=0.0,         # Determinístico
    )

    total_duration = info.duration or 1.0  # evitar división por cero
    result_segments = []
    last_reported_pct = 5

    for segment in segments_gen:
        raw_pct = (segment.end / total_duration) * 95  # reservar 5% final para guardado
        pct = min(int(raw_pct) + 5, 99)

        # Reportar solo cuando cambia al menos 2% — evitar spam
        if pct >= last_reported_pct + 2:
            progress(pct)
            last_reported_pct = pct

        result_segments.append({
            "index": len(result_segments),
            "start": round(segment.start, 3),
            "end": round(segment.end, 3),
            "text": segment.text.strip(),
            "confidence": round(segment.avg_logprob, 4),
        })

    full_text = " ".join(s["text"] for s in result_segments)

    result = {
        "language": info.language,
        "duration": round(total_duration, 3),
        "segments": result_segments,
        "full_text": full_text,
    }

    log(f"Guardando resultado ({len(result_segments)} segmentos)...")
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    progress(100)
    log(f"Listo: {len(result_segments)} segmentos, {round(total_duration/60, 1)} min de audio")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Transcripción offline con faster-whisper")
    parser.add_argument("--audio", required=True, help="Path al archivo de audio (WAV recomendado)")
    parser.add_argument("--output", required=True, help="Path donde guardar el JSON de salida")
    parser.add_argument("--model", default="medium", help="Tamaño/path del modelo (default: medium)")
    args = parser.parse_args()

    if not Path(args.audio).exists():
        print(f"ERROR:Archivo de audio no encontrado: {args.audio}", file=sys.stderr, flush=True)
        sys.exit(1)

    try:
        transcribe(args.audio, args.output, args.model)
    except MemoryError:
        print("ERROR:Memoria insuficiente. Intentá con modelo 'small' en vez de 'medium'.", file=sys.stderr, flush=True)
        sys.exit(1)
    except Exception as e:
        print(f"ERROR:{type(e).__name__}: {e}", file=sys.stderr, flush=True)
        sys.exit(1)
