import { useLocation, useNavigate, useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import api from "../services/api"

export default function SessionReport() {
    const { id } = useParams()
    const { state } = useLocation()
    const navigate = useNavigate()

    const [report, setReport] = useState(state?.report || null)
    const [loading, setLoading] = useState(!state?.report)

    useEffect(() => {
        if (!report) {
            async function fetchSession() {
                try {
                    const res = await api.get(`/voice-interview/session/${id}`)
                    const s = res.data.session
                    setReport({
                        overallScore: s.overallScore,
                        overallFeedback: s.overallFeedback,
                        totalQuestions: s.totalQuestions,
                        answeredCount: s.answeredCount,
                        answers: s.answers,
                        questions: s.questions
                    })
                } catch {
                    navigate("/dashboard")
                } finally {
                    setLoading(false)
                }
            }
            fetchSession()
        }
    }, [])

    function getScoreColor(score) {
        if (score >= 7) return "text-green-400"
        if (score >= 4) return "text-yellow-400"
        return "text-red-400"
    }

    function getScoreBg(score) {
        if (score >= 7) return "bg-green-500/10 border-green-500/20"
        if (score >= 4) return "bg-yellow-500/10 border-yellow-500/20"
        return "bg-red-500/10 border-red-500/20"
    }

    function getOverallLabel(score) {
        if (score >= 8) return "Excellent"
        if (score >= 6) return "Good"
        if (score >= 4) return "Average"
        return "Needs Improvement"
    }

    if (loading) return (
        <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
            <p className="text-gray-400">Loading report...</p>
        </div>
    )

    if (!report) return null

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
                <h1 className="text-lg font-semibold">Interview Report</h1>
            </div>

            <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">

                {/* Overall score card */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
                    <p className="text-gray-400 text-sm mb-2">Overall Score</p>
                    <p className={`text-6xl font-bold mb-2 ${getScoreColor(report.overallScore)}`}>
                        {report.overallScore}<span className="text-2xl text-gray-500">/10</span>
                    </p>
                    <p className={`text-sm font-medium mb-4 ${getScoreColor(report.overallScore)}`}>
                        {getOverallLabel(report.overallScore)}
                    </p>
                    <p className="text-gray-300 text-sm leading-relaxed max-w-xl mx-auto">
                        {report.overallFeedback}
                    </p>
                    <div className="flex items-center justify-center gap-6 mt-5 text-sm text-gray-500">
                        <span>{report.totalQuestions} questions</span>
                        <span>·</span>
                        <span>{report.answeredCount} answered</span>
                        <span>·</span>
                        <span>{report.totalQuestions - report.answeredCount} skipped</span>
                    </div>
                </div>

                {/* Per question breakdown */}
                <div>
                    <h2 className="text-lg font-semibold text-white mb-4">Question Breakdown</h2>
                    <div className="space-y-5">
                        {report.answers.map((answer, i) => {
                            // find matching question from session questions
                            const question = report.questions?.find(
                                q => q.index === answer.questionIndex
                            )

                            return (
                                <div
                                    key={i}
                                    className={`border rounded-2xl p-5 space-y-4 ${getScoreBg(answer.score)}`}
                                >
                                    {/* Question header */}
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                            <span className="text-blue-400 font-bold text-sm shrink-0 mt-0.5">
                                                Q{i + 1}
                                            </span>
                                            <p className="text-white font-medium text-sm">
                                                {question?.question || `Question ${answer.questionIndex + 1}`}
                                            </p>
                                        </div>
                                        <span className={`text-xl font-bold shrink-0 ${getScoreColor(answer.score)}`}>
                                            {answer.score}/10
                                        </span>
                                    </div>

                                    {/* Candidate answer */}
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">
                                            Your Answer
                                        </p>
                                        <p className="text-gray-300 text-sm leading-relaxed bg-gray-900/60 rounded-xl px-4 py-3">
                                            {answer.transcript || "No answer provided."}
                                        </p>
                                    </div>

                                    {/* AI Feedback */}
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">
                                            Feedback
                                        </p>
                                        <p className="text-gray-300 text-sm leading-relaxed bg-gray-900/60 rounded-xl px-4 py-3">
                                            {answer.feedback}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pb-10">
                    <button
                        onClick={() => navigate("/dashboard")}
                        className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl text-sm font-medium transition-colors"
                    >
                        Back to Dashboard
                    </button>
                    <button
                        onClick={() => navigate(`/interview/${state?.report?.interviewReportId || ""}`)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-medium transition-colors"
                    >
                        Practice Again
                    </button>
                </div>
            </div>
        </div>
    )
}
