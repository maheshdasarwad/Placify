const { ElevenLabsClient } = require("elevenlabs")
const fs = require("fs")
const path = require("path")
const os = require("os")

const client = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY
})

/**
 * Transcribes audio buffer using ElevenLabs Speech-to-Text.
 * @param {Buffer} audioBuffer - Audio data (webm/wav/mp3)
 * @param {string} mimeType - e.g. "audio/webm" or "audio/wav"
 * @returns {Promise<string>} - Transcript text
 */
async function transcribeAudio(audioBuffer, mimeType = "audio/webm") {
    const ext = mimeType.includes("wav") ? ".wav"
        : mimeType.includes("mp4") ? ".mp4"
        : mimeType.includes("mpeg") || mimeType.includes("mp3") ? ".mp3"
        : ".webm"

    // Write buffer to a temp file — ElevenLabs SDK needs a file stream
    const tempPath = path.join(os.tmpdir(), `stt_${Date.now()}${ext}`)
    fs.writeFileSync(tempPath, audioBuffer)

    try {
        const result = await client.speechToText.convert({
            file: fs.createReadStream(tempPath),
            model_id: "scribe_v1",
            language_code: "en"
        })

        return result.text || ""
    } finally {
        fs.unlinkSync(tempPath) // clean up temp file
    }
}

module.exports = { transcribeAudio }