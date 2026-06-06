#!/usr/bin/env python3
"""
Descarga el modelo faster-whisper medium a storage/models/ para uso air-gap.
Ejecutar UNA VEZ antes del deployment al servidor del banco.

Uso:
    python workers/download_model.py
    python workers/download_model.py --model small  # para prueba rápida
"""

import sys
import argparse
from pathlib import Path

def download_model(model_size: str = "medium", output_dir: str = "./storage/models"):
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("ERROR: faster-whisper no instalado. Ejecutar: pip install faster-whisper==1.0.3", file=sys.stderr)
        sys.exit(1)

    models_path = Path(output_dir)
    models_path.mkdir(parents=True, exist_ok=True)

    print(f"Descargando modelo '{model_size}' a {models_path.resolve()} ...", flush=True)
    print("(esto puede tardar varios minutos según la conexión)", flush=True)

    # Instanciar el modelo lo descarga automáticamente al cache de HuggingFace,
    # luego lo copiamos al directorio local.
    try:
        from huggingface_hub import snapshot_download
        repo_id = f"Systran/faster-whisper-{model_size}"
        local_dir = models_path / model_size
        snapshot_download(repo_id=repo_id, local_dir=str(local_dir), local_dir_use_symlinks=False)
        print(f"\n✅ Modelo descargado en: {local_dir.resolve()}", flush=True)
        print(f"\nAgregá esto a .env.local:", flush=True)
        print(f"WHISPER_MODEL_PATH=./storage/models/{model_size}", flush=True)
    except ImportError:
        # fallback: cargar el modelo (lo cachea en ~/.cache/huggingface)
        print("huggingface_hub no disponible, usando caché automático de faster-whisper...", flush=True)
        model = WhisperModel(model_size, device="cpu", compute_type="int8", cpu_threads=1)
        print(f"\n✅ Modelo '{model_size}' descargado en caché del sistema.", flush=True)
        print("Para air-gap, copiá la carpeta ~/.cache/huggingface al servidor.", flush=True)
        del model

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Descarga modelo Whisper para uso offline")
    parser.add_argument("--model", default="medium", choices=["tiny", "base", "small", "medium", "large-v2"],
                        help="Tamaño del modelo (default: medium)")
    parser.add_argument("--output-dir", default="./storage/models",
                        help="Directorio de salida (default: ./storage/models)")
    args = parser.parse_args()
    download_model(args.model, args.output_dir)
