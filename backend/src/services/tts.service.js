const { ElevenLabsClient } = require("elevenlabs");

const client = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY
});

async function synthesizeQuestion(text) {
    if (!text || typeof text !== "string") {
        throw new Error("TTS input must be a non-empty string");
    }

    const audio = await client.textToSpeech.convert(
        "EXAVITQu4vr4xnSDxMaL", // Bella
        {
            text: text.trim(),
            model_id: "eleven_multilingual_v2",
            voice_settings: {
                stability: 0.7,
                similarity_boost: 0.8,
                style: 0.2,
                use_speaker_boost: true
            }
        }
    );

    const chunks = [];

    for await (const chunk of audio) {
        chunks.push(chunk);
    }

    return Buffer.concat(chunks);
}

module.exports = { synthesizeQuestion };
