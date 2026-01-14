import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawn } from "node:child_process"

// C Minor chord frequencies (C3, Eb3, G3, C4, Eb4, G4)
const NOTES = [
  130.81, // C3
  155.56, // Eb3
  196.00, // G3
  261.63, // C4
  311.13, // Eb4
  392.00, // G4
]

const SAMPLE_RATE = 44100
const DURATION = 0.8 // seconds
const NOTE_DURATION = 0.04 // seconds per arpeggio step
const VOLUME = 0.3

function generateWavBuffer(): Buffer {
  const numSamples = Math.floor(SAMPLE_RATE * DURATION)
  const buffer = Buffer.alloc(44 + numSamples * 2) // 16-bit mono

  // WAV Header
  buffer.write("RIFF", 0)
  buffer.writeUInt32LE(36 + numSamples * 2, 4)
  buffer.write("WAVE", 8)
  buffer.write("fmt ", 12)
  buffer.writeUInt32LE(16, 16) // Subchunk1Size
  buffer.writeUInt16LE(1, 20)  // AudioFormat (PCM)
  buffer.writeUInt16LE(1, 22)  // NumChannels (Mono)
  buffer.writeUInt32LE(SAMPLE_RATE, 24)
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28) // ByteRate
  buffer.writeUInt16LE(2, 32)  // BlockAlign
  buffer.writeUInt16LE(16, 34) // BitsPerSample
  buffer.write("data", 36)
  buffer.writeUInt32LE(numSamples * 2, 40)

  // Audio Data
  let phase = 0
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE

    // Arpeggio logic
    const noteIndex = Math.floor(t / NOTE_DURATION) % NOTES.length
    const frequency = NOTES[noteIndex] ?? 0

    // Pulse wave synthesis
    phase += frequency / SAMPLE_RATE
    if (phase >= 1) phase -= 1

    // Pulse width modulation (simple duty cycle change over time for extra SID flavor)
    const dutyCycle = 0.5 + 0.4 * Math.sin(t * 10)

    const sample = phase < dutyCycle ? VOLUME : -VOLUME

    // Write 16-bit sample
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)))
    buffer.writeInt16LE(intSample, 44 + i * 2)
  }

  return buffer
}

export function playIntroSound() {
  // Only play on macOS as requested
  if (process.platform !== "darwin") {
    return
  }

  try {
    const buffer = generateWavBuffer()
    const tmpFile = path.join(os.tmpdir(), `opencoder-intro-${Date.now()}.wav`)

    fs.writeFileSync(tmpFile, buffer)

    const player = spawn("afplay", [tmpFile], {
      stdio: "ignore",
      detached: true,
    })

    player.unref()

    // Clean up file after a delay (enough for the sound to play)
    const timer = setTimeout(() => {
      try {
        fs.unlinkSync(tmpFile)
      } catch {}
    }, DURATION * 1000 + 1000)
    timer.unref()

  } catch (error) {
    // Fail silently if audio can't play
  }
}
