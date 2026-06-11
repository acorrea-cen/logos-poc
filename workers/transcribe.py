#!/usr/bin/env python3
"""
Worker de transcripción con pywhispercpp (whisper.cpp).
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
import os
from pathlib import Path


def log(msg: str) -> None:
    print(f"INFO:{msg}", file=sys.stderr, flush=True)


def progress(pct: int) -> None:
    print(f"PROGRESS:{pct}", file=sys.stderr, flush=True)


def get_audio_duration(audio_path: str) -> float:
    try:
        import wave
        with wave.open(audio_path, 'rb') as wf:
            return wf.getnframes() / wf.getframerate()
    except Exception:
        return 0.0


def is_repetition(text: str, recent: list[str], window: int = 8, threshold: int = 3) -> bool:
    """Devuelve True si el texto es una repetición de bucle de Whisper."""
    t = text.lower().strip()
    if not t:
        return False
    # Idéntico al segmento anterior
    if recent and recent[-1] == t:
        return True
    # Aparece threshold+ veces en la ventana reciente
    if recent[-window:].count(t) >= threshold:
        return True
    return False


def transcribe(audio_path: str, output_path: str, model_name: str) -> dict:
    try:
        from pywhispercpp.model import Model
    except ImportError:
        print("ERROR:pywhispercpp no instalado. Ejecutar: pip install pywhispercpp", file=sys.stderr, flush=True)
        sys.exit(1)

    # Normalizar nombre de modelo (ignorar paths)
    if os.path.sep in model_name or "/" in model_name:
        model_name = Path(model_name).name

    log(f"Cargando modelo '{model_name}' (CPU)...")
    progress(2)

    models_dir = os.path.join(os.path.expanduser("~"), ".cache", "whisper")
    os.makedirs(models_dir, exist_ok=True)

    total_duration = get_audio_duration(audio_path) or 1.0
    result_segments = []
    recent_texts: list[str] = []
    last_reported_pct = [5]

    def on_segment(seg):
        start_s = seg.t0 / 100.0
        end_s = seg.t1 / 100.0
        text = seg.text.strip()
        if not text:
            return

        if is_repetition(text, recent_texts):
            log(f"Segmento repetido descartado: {text[:60]!r}")
            return

        recent_texts.append(text.lower().strip())

        confidence = 0.0
        try:
            p = seg.probability
            if p == p:  # NaN check
                confidence = round(float(p), 4)
        except Exception:
            pass

        result_segments.append({
            "index": len(result_segments),
            "start": round(start_s, 3),
            "end": round(end_s, 3),
            "text": text,
            "confidence": confidence,
        })

        raw_pct = (end_s / total_duration) * 95
        pct = min(int(raw_pct) + 5, 99)
        if pct >= last_reported_pct[0] + 2:
            progress(pct)
            last_reported_pct[0] = pct

    model = Model(
        model_name,
        models_dir=models_dir,
        n_threads=4,
        print_realtime=False,
        print_progress=False,
    )

    log(f"Transcribiendo {Path(audio_path).name} ({round(total_duration/60, 1)} min)...")
    progress(5)

    model.transcribe(
        audio_path,
        language="es",
        initial_prompt=(
            "Capacitación bancaria en español argentino. "
            "Términos: BCRA, CBU, CVU, cuenta corriente, caja de ahorro, "
            "plazo fijo, tarjeta de crédito, débito automático, transferencia."
        ),
        n_threads=4,
        no_context=True,
        temperature=0.2,
        new_segment_callback=on_segment,
    )

    full_text = " ".join(s["text"] for s in result_segments)

    result = {
        "language": "es",
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
    parser = argparse.ArgumentParser(description="Transcripción offline con pywhispercpp")
    parser.add_argument("--audio", required=True, help="Path al archivo de audio (WAV recomendado)")
    parser.add_argument("--output", required=True, help="Path donde guardar el JSON de salida")
    parser.add_argument("--model", default="medium", help="Tamaño del modelo (default: medium)")
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
