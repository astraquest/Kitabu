$ErrorActionPreference = 'Stop'

$ffmpeg = (Get-Command ffmpeg -ErrorAction Stop).Source
$output = Join-Path $PSScriptRoot '..\src\assets\landing-soundtrack.mp3'

& $ffmpeg -y `
  -f lavfi -i 'sine=frequency=220:duration=8' `
  -f lavfi -i 'sine=frequency=277.18:duration=8' `
  -filter_complex '[0:a]volume=0.10[a0];[1:a]volume=0.07[a1];[a0][a1]amix=inputs=2:duration=longest,afade=t=in:st=0:d=1,afade=t=out:st=7:d=1' `
  -ar 44100 -ac 1 -c:a libmp3lame -b:a 32k $output
