import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import api from "../services/api"

const ANSWER_TIME = 90

// ─── Animated waveform bars (deterministic, no Math.random) ──────────────────
const BAR_HEIGHTS = [12, 24, 36, 28, 16, 38, 20, 32, 14, 30, 22, 34]
const BAR_DURATIONS = [0.5, 0.7, 0.6, 0.8, 0.55, 0.65, 0.75, 0.5, 0.7, 0.6, 0.8, 0.55]
const BAR_DELAYS = [0, 0.1, 0.05, 0.15, 0.08, 0.12, 0.03, 0.18, 0.07, 0.13, 0.02, 0.17]

function SpeakingWaveform({ color = "blue", count = 12 }) {
    const barColor = color === "green" ? "#4ade80" : "#60a5fa"
    return (
        <>
            <style>{`
                @keyframes barPulse {
                    0%, 100% { transform: scaleY(0.25); opacity: 0.5; }
                    50%       { transform: scaleY(1);    opacity: 1;   }
                }
            `}</style>
            <div className="flex items-center justify-center gap-[3px]" style={{ height: 48 }}>
                {BAR_HEIGHTS.slice(0, count).map((h, i) => (
                    <div
                        key={i}
                        style={{
                            width: 6,
                            height: h,
                            backgroundColor: barColor,
                            borderRadius: 4,
                            animation: `barPulse ${BAR_DURATIONS[i]}s ease-in-out ${BAR_DELAYS[i]}s infinite`,
                        }}
                    />
                ))}
            </div>
        </>
    )
}

export default function VoiceInterview() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [session, setSession]           = useState(null)
    const [currentIndex, setCurrentIndex] = useState(0)
    // phases: loading | creating | ready | speaking | recording | submitting | finishing | error
    const [phase, setPhase]               = useState("loading")
    const [timeLeft, setTimeLeft]         = useState(ANSWER_TIME)
    const [error, setError]               = useState("")
    const [replayCount, setReplayCount]   = useState(0)
    const [liveTranscript, setLiveTranscript] = useState("")

    const mediaRecorderRef = useRef(null)
    const audioChunksRef   = useRef([])
    const timerRef         = useRef(null)
    const audioRef         = useRef(null)
    const currentIndexRef  = useRef(0)
    const recognitionRef   = useRef(null)
    const playingRef       = useRef(false)   // guard against double-play

    // ─── 1. Create session on mount ───────────────────────────────────────────
    useEffect(() => {
        async function init() {
            try {
                setPhase("creating")
                const res = await api.post("/voice-interview/session", {
                    interviewReportId: id,
                    questionCount: 5
                })
                setSession(res.data.session)
                setPhase("ready")           // wait for user to click Start
            } catch (err) {
                setError(err.response?.data?.message || "Failed to create session.")
                setPhase("error")
            }
        }
        init()

        return () => {
            stopRecording()
            stopRecognition()
            clearInterval(timerRef.current)
            if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current = null
            }
        }
    }, [id])

    // ─── 2. User clicks "Start Interview" ────────────────────────────────────
    function handleStart() {
        currentIndexRef.current = 0
        playQuestionAudio(0)
    }

    // ─── 3. Play TTS for a given question index ───────────────────────────────
    async function playQuestionAudio(index) {
        if (playingRef.current) return
        playingRef.current = true
        setPhase("speaking")

        try {
            const response = await fetch(
                `/api/voice-interview/session/${session._id}/question/${index}/audio`,
                { credentials: "include" }
            )
            if (!response.ok) throw new Error(`Audio fetch failed: ${response.status}`)

            const blob = await response.blob()
            const url  = URL.createObjectURL(blob)

            if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current.onended = null
                audioRef.current.onerror = null
                audioRef.current = null
            }

            const audio = new Audio(url)
            audioRef.current = audio

            audio.onended = () => {
                URL.revokeObjectURL(url)
                playingRef.current = false
                startRecording()
            }

            audio.onerror = () => {
                playingRef.current = false
                setError("Failed to play audio. Check your speakers.")
                setPhase("error")
            }

            await audio.play()

        } catch (err) {
            playingRef.current = false
            setError("Failed to load question audio: " + err.message)
            setPhase("error")
        }
    }

    // ─── 4. Replay question ───────────────────────────────────────────────────
    async function handleReplay() {
        // stop ongoing audio + recording
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.onended = null
            audioRef.current = null
        }
        stopRecording()
        stopRecognition()
        setLiveTranscript("")
        playingRef.current = false
        setReplayCount(c => c + 1)
        await playQuestionAudio(currentIndexRef.current)
    }

    // ─── 5. Start MediaRecorder + live speech recognition ────────────────────
    async function startRecording() {
        setTimeLeft(ANSWER_TIME)
        setLiveTranscript("")
        setPhase("recording")
        audioChunksRef.current = []

        // Live transcript via Web Speech API
        try {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition
            if (SR) {
                const recognition = new SR()
                recognition.continuous     = true
                recognition.interimResults = true
                recognition.lang           = "en-US"
                recognition.onresult = (e) => {
                    const text = Array.from(e.results).map(r => r[0].transcript).join(" ")
                    setLiveTranscript(text)
                }
                recognition.onerror = () => {}
                recognition.start()
                recognitionRef.current = recognition
            }
        } catch (_) {}

        // MediaRecorder for backend STT
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mr     = new MediaRecorder(stream, { mimeType: "audio/webm" })
            mediaRecorderRef.current = mr

            mr.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data)
            }
            mr.start(250)

            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current)
                        handleSubmitAnswer()
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)

        } catch (err) {
            setError(
                err.name === "NotAllowedError"
                    ? "Microphone permission denied. Please allow access and refresh."
                    : "Could not access microphone: " + err.message
            )
            setPhase("error")
        }
    }

    // ─── 6. Stop MediaRecorder ────────────────────────────────────────────────
    function stopRecording() {
        clearInterval(timerRef.current)
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop()
            mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop())
        }
    }

    function stopRecognition() {
        if (recognitionRef.current) {
            try { recognitionRef.current.stop() } catch (_) {}
            recognitionRef.current = null
        }
    }

    // ─── 7. Submit answer ─────────────────────────────────────────────────────
    const handleSubmitAnswer = useCallback(async () => {
        stopRecording()
        stopRecognition()
        setPhase("submitting")
        await new Promise(r => setTimeout(r, 300))

        try {
            const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
            const fd   = new FormData()
            fd.append("audio", blob, "answer.webm")
            fd.append("questionIndex", currentIndexRef.current)

            await api.post(
                `/voice-interview/session/${session._id}/answer`,
                fd,
                { headers: { "Content-Type": "multipart/form-data" } }
            )

            const nextIndex = currentIndexRef.current + 1
            if (nextIndex >= session.questions.length) {
                await handleComplete()
            } else {
                currentIndexRef.current = nextIndex
                playingRef.current      = false
                setCurrentIndex(nextIndex)
                setReplayCount(0)
                setLiveTranscript("")
                playQuestionAudio(nextIndex)
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to submit answer.")
            setPhase("error")
        }
    }, [session])

    // ─── 8. Complete session ──────────────────────────────────────────────────
    async function handleComplete() {
        try {
            setPhase("finishing")
            const res = await api.post(`/voice-interview/session/${session._id}/complete`)
            navigate(`/session/${session._id}/report`, {
                state: { report: res.data.report }
            })
        } catch {
            setError("Failed to generate report.")
            setPhase("error")
        }
    }

    // ─── 9. Skip question ─────────────────────────────────────────────────────
    async function handleSkip() {
        stopRecording()
        stopRecognition()
        setPhase("submitting")

        try {
            const fd = new FormData()
            fd.append("questionIndex", currentIndexRef.current)
            fd.append("transcript", "No answer provided.")
            await api.post(`/voice-interview/session/${session._id}/answer`, fd)
        } catch (_) {}

        const nextIndex = currentIndexRef.current + 1
        if (nextIndex >= session.questions.length) {
            await handleComplete()
        } else {
            currentIndexRef.current = nextIndex
            playingRef.current      = false
            setCurrentIndex(nextIndex)
            setReplayCount(0)
            setLiveTranscript("")
            playQuestionAudio(nextIndex)
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────
    function formatTime(s) {
        return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
    }

    function timerColor() {
        if (timeLeft > 30) return "text-green-400"
        if (timeLeft > 10) return "text-yellow-400"
        return "text-red-400"
    }

    const totalQ    = session?.questions?.length || 1
    const progressW = (currentIndex / totalQ) * 100

    // ─── PHASE: loading / creating ────────────────────────────────────────────
    if (["loading", "creating"].includes(phase)) return (
        <FullScreen>
            <div className="w-16 h-16 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-5">
                <MicIcon className="w-7 h-7 text-blue-400 animate-pulse" />
            </div>
            <p className="text-white font-medium">Setting up your interview...</p>
            <p className="text-gray-500 text-sm mt-1">Preparing personalised questions</p>
        </FullScreen>
    )

    // ─── PHASE: ready (AI is ready, waiting for user) ────────────────────────
    if (phase === "ready") return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col">
            <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
                <button
                    onClick={() => navigate(`/interview/${id}`)}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                    ← Back
                </button>
                <span className="text-xs text-gray-600">{totalQ} questions</span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-lg mx-auto w-full gap-8 py-10">
                {/* AI avatar */}
                <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-blue-600/15 border-2 border-blue-500/40 flex items-center justify-center">
                        <BotIcon className="w-10 h-10 text-blue-400" />
                    </div>
                    <span className="absolute -bottom-1 -right-1 flex items-center justify-center w-6 h-6 bg-green-500 rounded-full border-2 border-gray-950 text-white">
                        <span className="text-[9px] font-bold">AI</span>
                    </span>
                </div>

                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">AI Interviewer is Ready</h2>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
                        Questions will be asked by voice only — no text will be displayed during the interview. Answer naturally when prompted.
                    </p>
                </div>

                {/* Tips */}
                <div className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
                    {[
                        ["🎧", "Make sure your speakers / headphones are on"],
                        ["🎙",  "Allow microphone access when the browser asks"],
                        ["🔁", "You can replay any question if you didn't hear it"],
                        ["⏭",  "You can skip a question if you want to move on"],
                    ].map(([icon, text], i) => (
                        <div key={i} className="flex items-start gap-3 text-sm text-gray-400">
                            <span className="text-base mt-0.5">{icon}</span>
                            <span>{text}</span>
                        </div>
                    ))}
                </div>

                <button
                    onClick={handleStart}
                    className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold py-4 rounded-2xl text-base transition-all duration-150 shadow-lg shadow-blue-900/30"
                >
                    Start Interview
                </button>
            </div>
        </div>
    )

    // ─── PHASE: submitting ────────────────────────────────────────────────────
    if (phase === "submitting") return (
        <FullScreen>
            <SpinnerIcon className="w-10 h-10 text-indigo-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-300 font-medium">Saving your answer...</p>
            <p className="text-gray-600 text-sm mt-1">Loading next question</p>
        </FullScreen>
    )

    // ─── PHASE: finishing ─────────────────────────────────────────────────────
    if (phase === "finishing") return (
        <FullScreen>
            <div className="w-14 h-14 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-4">
                <ReportIcon className="w-6 h-6 text-purple-400 animate-pulse" />
            </div>
            <p className="text-white font-medium">Generating your full interview report...</p>
            <p className="text-gray-500 text-sm mt-1">This may take a moment</p>
        </FullScreen>
    )

    // ─── PHASE: error ─────────────────────────────────────────────────────────
    if (phase === "error") return (
        <FullScreen>
            <div className="w-14 h-14 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
                <WarnIcon className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-red-400 text-sm text-center max-w-xs mb-5">{error}</p>
            <button
                onClick={() => navigate(`/interview/${id}`)}
                className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
                ← Back to Report
            </button>
        </FullScreen>
    )

    // ─── PHASE: speaking | recording ─────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col">

            {/* Top bar */}
            <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
                <button
                    onClick={() => { stopRecording(); stopRecognition(); navigate(`/interview/${id}`) }}
                    className="text-gray-400 hover:text-white text-sm transition-colors flex items-center gap-1.5"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Exit
                </button>
                <span className="text-xs bg-gray-800 text-gray-400 px-3 py-1 rounded-full border border-gray-700/60">
                    Question {currentIndex + 1} / {totalQ}
                </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-800/50 h-[2px]">
                <div
                    className="bg-blue-500 h-[2px] transition-all duration-700 ease-out"
                    style={{ width: `${progressW}%` }}
                />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-2xl mx-auto w-full gap-5">

                {/* ── SPEAKING: animated AI avatar ── */}
                {phase === "speaking" && (
                    <div className="w-full flex flex-col items-center gap-5">
                        <div className="w-full bg-gray-900 border border-blue-500/20 rounded-3xl px-8 py-10 flex flex-col items-center gap-5 shadow-xl shadow-blue-900/5">

                            {/* Avatar with pulse rings */}
                            <div className="relative flex items-center justify-center">
                                <div className="absolute w-28 h-28 rounded-full border border-blue-400/20 animate-ping"
                                    style={{ animationDuration: "2s" }} />
                                <div className="absolute w-20 h-20 rounded-full border border-blue-400/15 animate-ping"
                                    style={{ animationDuration: "1.5s", animationDelay: "0.3s" }} />
                                <div className="relative w-16 h-16 rounded-full bg-blue-600/20 border-2 border-blue-500/50 flex items-center justify-center z-10">
                                    <BotIcon className="w-7 h-7 text-blue-400" />
                                </div>
                            </div>

                            {/* Animated bars */}
                            <SpeakingWaveform color="blue" count={12} />

                            <div className="text-center">
                                <p className="text-blue-300 font-semibold">AI Interviewer is Speaking</p>
                                <p className="text-gray-600 text-xs mt-1">Listen carefully — no text will be shown</p>
                            </div>
                        </div>

                        {/* Replay */}
                        <button
                            onClick={handleReplay}
                            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white bg-gray-900 border border-gray-700 hover:border-gray-500 px-5 py-2.5 rounded-xl transition-all"
                        >
                            <ReplayIcon className="w-4 h-4" />
                            Replay question
                            {replayCount > 0 && (
                                <span className="text-gray-600 ml-1">({replayCount})</span>
                            )}
                        </button>
                    </div>
                )}

                {/* ── RECORDING ── */}
                {phase === "recording" && (
                    <div className="w-full flex flex-col gap-4">

                        {/* Timer / status bar */}
                        <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4">
                            <div className="flex items-center gap-2.5">
                                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                                <span className="text-sm text-gray-300 font-medium">Recording your answer</span>
                            </div>
                            <span className={`text-xl font-bold font-mono tabular-nums ${timerColor()}`}>
                                {formatTime(timeLeft)}
                            </span>
                        </div>

                        {/* Waveform + live transcript */}
                        <div className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4 min-h-[160px]">
                            <SpeakingWaveform color="green" count={12} />

                            {/* Live transcript */}
                            <div className="border-t border-gray-800/70 pt-4">
                                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">
                                    Live transcript (your words)
                                </p>
                                {liveTranscript ? (
                                    <p className="text-gray-300 text-sm leading-relaxed">
                                        {liveTranscript}
                                        <span className="inline-block w-0.5 h-4 bg-blue-400 ml-1 animate-pulse align-middle" />
                                    </p>
                                ) : (
                                    <p className="text-gray-600 text-sm italic">
                                        Start speaking — your words will appear here...
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleSubmitAnswer}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Done Answering
                            </button>
                            <button
                                onClick={handleSkip}
                                className="px-5 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-gray-400 hover:text-gray-300 py-3.5 rounded-xl text-sm transition-all"
                            >
                                Skip
                            </button>
                        </div>

                        {/* Replay during recording */}
                        <button
                            onClick={handleReplay}
                            className="self-center flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
                        >
                            <ReplayIcon className="w-4 h-4" />
                            Didn't hear it? Replay the question
                            {replayCount > 0 && (
                                <span className="text-gray-700 ml-1">({replayCount})</span>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Helper components ────────────────────────────────────────────────────────
function FullScreen({ children }) {
    return (
        <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-6">
            <div className="text-center">{children}</div>
        </div>
    )
}

function MicIcon({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
    )
}

function BotIcon({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
        </svg>
    )
}

function SpinnerIcon({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    )
}

function ReportIcon({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    )
}

function WarnIcon({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    )
}

function ReplayIcon({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
    )
}
