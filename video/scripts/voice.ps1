# Draft voiceover with the Windows Turkish voice (Microsoft Tolga), one WAV per scene.
# Writes public/voice/<id>.wav and src/voice-durations.json (seconds per scene).
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Speech

$root = Split-Path -Parent $PSScriptRoot
$scenes = Get-Content -Raw -Encoding UTF8 (Join-Path $root "src/scenes.json") | ConvertFrom-Json
$outDir = Join-Path $root "public/voice"
New-Item -ItemType Directory -Force $outDir | Out-Null

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice("Microsoft Tolga")
$synth.Rate = 0
$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(44100, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)

$durations = [ordered]@{}
foreach ($scene in $scenes) {
  $file = Join-Path $outDir "$($scene.id).wav"
  $synth.SetOutputToWaveFile($file, $format)
  $synth.Speak($scene.speech)
  $synth.SetOutputToNull()
  # 16-bit mono 44.1 kHz: 88200 bytes per second after the 44-byte header
  $seconds = ((Get-Item $file).Length - 44) / 88200
  $durations[$scene.id] = [math]::Round($seconds, 3)
  Write-Host ("{0,-10} {1,6:N2} s" -f $scene.id, $seconds)
}
$synth.Dispose()

$durations | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $root "src/voice-durations.json")
