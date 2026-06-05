import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import api from "../services/api"

export default function InterviewReport() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [report, setReport] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [activeTab, setActiveTab] = useState("technical")
    const [downloadingResume, setDownloadingResume] = useState(false)

    useEffect(() => {
        async function fetchReport() {
            try {
                const res = await api.get(`/interview/report/${id}`)
                setReport(res.data.interviewReport)
            } catch (err) {
                setError("Failed to load report.")
            } finally {
                setLoading(false)
            }
        }
        fetchReport()
    }, [id])

    async function handleDownloadResume() {
        setDownloadingResume(true)
        try {
            const res = await api.post(`/interview/resume/pdf/${id}`, {}, {
                responseType: "blob"
            })
            const url = window.URL.createObjectURL(new Blob([res.data]))
            const a = document.createElement("a")
            a.href = url
            a.download = `resume_${id}.pdf`
            a.click()
            window.URL.revokeObjectURL(url)
        } catch (err) {
            alert("Failed to download resume.")
        } finally {
            setDownloadingResume(false)
        }
    }

    function getSeverityColor(severity) {
        if (severity === "high") return "bg-red-500/10 text-red-400 border-red-500/20"
        if (severity === "medium") return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
        return "bg-green-500/10 text-green-400 border-green-500/20"
    }

    function getScoreColor(score) {
        if (score >= 75) return "text-green-400"
        if (score >= 50) return "text-yellow-400"
        return "text-red-400"
    }

    const tabs = [
        { key: "technical", label: "Technical Questions" },
        { key: "behavioral", label: "Behavioral Questions" },
        { key: "gaps", label: "Skill Gaps" },
        { key: "plan", label: "Prep Plan" }
    ]

    if (loading) return (
        <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
            Loading report...
        </div>
    )

    if (error) return (
        <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
            <p className="text-red-400">{error}</p>
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-950 text-white">

            {/* Navbar */}
            <div className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
                <button
                    onClick={() => navigate("/dashboard")}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                    ← Dashboard
                </button>
                <h1 className="text-lg font-semibold">{report.title}</h1>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-8">

                {/* Header card */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">{report.title}</h2>
                        <p className="text-gray-400 text-sm mt-1">
                            Generated on {new Date(report.createdAt).toLocaleDateString("en-IN", {
                                day: "numeric", month: "long", year: "numeric"
                            })}
                        </p>
                        <div className="flex items-center gap-3 mt-3">
                            <span className={`text-3xl font-bold ${getScoreColor(report.matchScore)}`}>
                                {report.matchScore}%
                            </span>
                            <span className="text-gray-500 text-sm">match score</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => navigate(`/interview/${id}/session`)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                        >
                            🎙 Start Voice Interview
                        </button>
                        <button
                            onClick={handleDownloadResume}
                            disabled={downloadingResume}
                            className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-sm px-4 py-2.5 rounded-lg transition-colors"
                        >
                            {downloadingResume ? "Generating..." : "⬇ Download Resume"}
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 text-sm py-2 rounded-lg transition-colors font-medium ${
                                activeTab === tab.key
                                    ? "bg-blue-600 text-white"
                                    : "text-gray-400 hover:text-white"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Technical Questions */}
                {activeTab === "technical" && (
                    <div className="space-y-4">
                        {report.technicalQuestions.map((q, i) => (
                            <QuestionCard key={i} index={i + 1} {...q} />
                        ))}
                    </div>
                )}

                {/* Behavioral Questions */}
                {activeTab === "behavioral" && (
                    <div className="space-y-4">
                        {report.behavioralQuestions.map((q, i) => (
                            <QuestionCard key={i} index={i + 1} {...q} />
                        ))}
                    </div>
                )}

                {/* Skill Gaps */}
                {activeTab === "gaps" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {report.skillGaps.map((gap, i) => (
                            <div
                                key={i}
                                className={`border rounded-xl px-4 py-3 flex items-center justify-between ${getSeverityColor(gap.severity)}`}
                            >
                                <span className="text-sm font-medium">{gap.skill}</span>
                                <span className="text-xs capitalize">{gap.severity}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Prep Plan */}
                {activeTab === "plan" && (
                    <div className="space-y-4">
                        {report.preparationPlan.map((day) => (
                            <div key={day.day} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                                        Day {day.day}
                                    </span>
                                    <span className="text-white font-medium">{day.focus}</span>
                                </div>
                                <ul className="space-y-1.5">
                                    {day.tasks.map((task, i) => (
                                        <li key={i} className="text-gray-400 text-sm flex items-start gap-2">
                                            <span className="text-blue-400 mt-0.5">•</span>
                                            {task}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function QuestionCard({ index, question, intention, answer }) {
    const [open, setOpen] = useState(false)

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <button
                onClick={() => setOpen(!open)}
                className="w-full text-left"
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <span className="text-blue-400 font-bold text-sm mt-0.5">Q{index}</span>
                        <p className="text-white text-sm font-medium">{question}</p>
                    </div>
                    <span className="text-gray-500 text-xs mt-0.5 shrink-0">
                        {open ? "▲ Hide" : "▼ Show"}
                    </span>
                </div>
            </button>

            {open && (
                <div className="mt-4 space-y-3 border-t border-gray-800 pt-4">
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Interviewer's Intention</p>
                        <p className="text-gray-300 text-sm">{intention}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">How to Answer</p>
                        <p className="text-gray-300 text-sm">{answer}</p>
                    </div>
                </div>
            )}
        </div>
    )
}
