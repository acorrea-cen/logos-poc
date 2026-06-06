# Genera un archivo WAV de prueba usando el TTS integrado de Windows.
# No requiere FFmpeg ni dependencias externas.
#
# Uso:
#   .\scripts\generate-test-audio.ps1
#   .\scripts\generate-test-audio.ps1 -OutputPath .\storage\audio\test-manual.wav

param(
    [string]$OutputPath = ".\storage\audio\test-whisper.wav"
)

$texto = @"
Bienvenidos a la capacitación bancaria del Banco.
En esta sesión vamos a hablar sobre los principales productos que ofrecemos a nuestros clientes.

Primero, las cuentas. Tenemos dos tipos principales: la cuenta corriente y la caja de ahorro.
La cuenta corriente permite realizar transferencias, pagos y débitos automáticos.
La caja de ahorro genera intereses sobre el saldo disponible.

Segundo, los medios de pago. El CBU, o Clave Bancaria Uniforme, es el número de 22 dígitos
que identifica una cuenta bancaria en el sistema financiero argentino.
El CVU, o Clave Virtual Uniforme, cumple la misma función para cuentas virtuales.

El BCRA, Banco Central de la República Argentina, es el organismo regulador
que establece las normas que todos los bancos deben cumplir.

Para transferencias, el cliente puede usar homebanking, la aplicación móvil,
o acercarse a una sucursal con su DNI.

En caso de consultas sobre extractos, resúmenes de tarjeta de crédito
o plazo fijo, el cliente debe comunicarse con el área de atención al cliente.

Gracias por participar en esta capacitación.
"@

New-Item -ItemType Directory -Force -Path (Split-Path $OutputPath) | Out-Null

Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer

# Intentar seleccionar voz en español si está disponible
$voces = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like "es-*" }
if ($voces) {
    $synth.SelectVoice($voces[0].VoiceInfo.Name)
    Write-Host "Usando voz: $($voces[0].VoiceInfo.Name)"
} else {
    Write-Host "Voz en español no encontrada, usando voz por defecto del sistema."
    Write-Host "(El texto tiene términos en español — Whisper debería reconocerlos igual)"
}

$synth.Rate = -2  # Un poco más lento — mejor para transcripción
$synth.SetOutputToWaveFile($OutputPath)
$synth.Speak($texto)
$synth.SetOutputToDefaultAudioDevice()
$synth.Dispose()

$size = [math]::Round((Get-Item $OutputPath).Length / 1KB)
Write-Host ""
Write-Host "✅ Audio generado: $OutputPath ($size KB)"
Write-Host ""
Write-Host "Siguiente paso — testear Whisper directamente sobre este WAV:"
Write-Host "  npm run test:whisper -- --audio $OutputPath"
