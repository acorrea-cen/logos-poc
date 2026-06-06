"""
Genera un WAV de prueba para testear Whisper.
No requiere FFmpeg ni librerías externas — solo Python stdlib.

Intenta en orden:
  1. pyttsx3 (TTS real en español, pip install pyttsx3)
  2. Windows SAPI via ctypes (TTS nativo, sin pip)
  3. Sine wave puro (señal de audio, Whisper lo procesará pero no transcribirá texto)

Uso:
    python scripts/generate-test-audio.py
    python scripts/generate-test-audio.py --output storage/audio/mi-test.wav
"""

import sys
import os
import argparse
import struct
import math
import wave
from pathlib import Path

TEXTO_PRUEBA = (
    "Bienvenidos a la capacitación bancaria. "
    "En esta sesión hablaremos sobre cuentas corrientes y cajas de ahorro. "
    "El CBU es la Clave Bancaria Uniforme, un número de veintidós dígitos "
    "que identifica una cuenta en el sistema financiero argentino. "
    "El BCRA, Banco Central de la República Argentina, es el organismo regulador. "
    "Los plazos fijos generan intereses sobre el capital depositado. "
    "Las transferencias pueden realizarse por homebanking o en sucursal. "
    "El débito automático permite el pago de servicios sin intervención del cliente. "
    "Ante cualquier consulta sobre tarjetas de crédito o extractos, "
    "comuníquese con atención al cliente. Muchas gracias."
)


def try_pyttsx3(output_path: str) -> bool:
    try:
        import pyttsx3  # type: ignore
        engine = pyttsx3.init()

        # Buscar voz en español
        voices = engine.getProperty("voices")
        spanish = next((v for v in voices if "es" in (v.languages[0] if v.languages else "").lower()
                        or "spanish" in v.name.lower()), None)
        if spanish:
            engine.setProperty("voice", spanish.id)
            print(f"   Voz: {spanish.name}")
        else:
            print("   Voz en español no encontrada, usando voz por defecto.")

        engine.setProperty("rate", 140)  # palabras por minuto
        engine.save_to_file(TEXTO_PRUEBA, output_path)
        engine.runAndWait()
        return Path(output_path).exists() and Path(output_path).stat().st_size > 1000
    except ImportError:
        return False
    except Exception as e:
        print(f"   pyttsx3 falló: {e}")
        return False


def try_windows_sapi(output_path: str) -> bool:
    """TTS nativo de Windows via COM, sin pip."""
    if sys.platform != "win32":
        return False
    try:
        import comtypes.client  # type: ignore
        sapi = comtypes.client.CreateObject("SAPI.SpVoice")
        stream = comtypes.client.CreateObject("SAPI.SpFileStream")
        stream.Open(output_path, 3, False)  # SSFMCreateForWrite = 3
        sapi.AudioOutputStream = stream
        sapi.Rate = -2

        # Buscar voz en español
        voices = sapi.GetVoices()
        for i in range(voices.Count):
            v = voices.Item(i)
            if "es" in v.GetAttribute("Language").lower() or "spanish" in v.GetDescription().lower():
                sapi.Voice = v
                print(f"   Voz: {v.GetDescription()}")
                break

        sapi.Speak(TEXTO_PRUEBA)
        stream.Close()
        return Path(output_path).exists() and Path(output_path).stat().st_size > 1000
    except Exception:
        return False


def generate_sine_wav(output_path: str, duration_sec: int = 30) -> bool:
    """
    Genera un WAV con tonos variados (fallback si TTS no funciona).
    Whisper no va a transcribir texto real, pero sirve para verificar
    que el pipeline procesa el archivo sin errores.
    """
    sample_rate = 16000
    n_samples = sample_rate * duration_sec

    with wave.open(output_path, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)   # 16-bit
        wf.setframerate(sample_rate)

        frames = bytearray()
        # Alternar tonos para simular habla
        tones = [220, 330, 440, 370, 294, 440, 330, 220]
        tone_duration = sample_rate // 4  # 0.25s por tono

        for i in range(n_samples):
            tone_idx = (i // tone_duration) % len(tones)
            freq = tones[tone_idx]
            val = int(16000 * math.sin(2 * math.pi * freq * i / sample_rate))
            frames += struct.pack("<h", val)

        wf.writeframes(bytes(frames))

    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="storage/audio/test-whisper.wav")
    args = parser.parse_args()

    output_path = str(Path(args.output).resolve())
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    print(f"\n🎙  Generando audio de prueba → {args.output}")

    # Intento 1: pyttsx3
    print("\n[1/3] Intentando pyttsx3...")
    if try_pyttsx3(output_path):
        print(f"✅ Generado con pyttsx3 (TTS real en español)")
    # Intento 2: Windows SAPI via comtypes
    elif try_windows_sapi(output_path):
        print(f"✅ Generado con Windows SAPI")
    # Fallback: sine wave
    else:
        print("[3/3] Usando sine wave (fallback — sin TTS real)...")
        print("      Whisper no transcribirá texto, pero verifica que el pipeline funciona.")
        generate_sine_wav(output_path)
        print(f"✅ Generado sine wave de 30 segundos")

    size_kb = Path(output_path).stat().st_size // 1024
    print(f"\n   Archivo: {output_path} ({size_kb} KB)")
    print(f"\nSiguiente paso:")
    print(f"   npm run test:whisper -- --audio {args.output}\n")


if __name__ == "__main__":
    main()
