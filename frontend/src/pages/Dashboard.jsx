import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import api from "../services/api"

export default function Dashboard() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    const [reports, setReports] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        async function fetchReports() {
            try {
                const res = await api.get("/interview")
                setReports(res.data.interviewReports)
            } catch (err) {
                setError("Failed to load reports.")
            } finally {
                setLoading(false)
            }
        }
        fetchReports()
    }, [])

    function getScoreColor(score) {
        if (score >= 75) return "text-green-400"
        if (score >= 50) return "text-yellow-400"
        return "text-red-400"
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white">

            {/* Navbar */}
            <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
                <h1 className="text-lg font-semibold text-white">Interview Prep</h1>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-400">Hey, {user?.username}</span>
                    <button
                        onClick={logout}
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-10">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Your Interviews</h2>
                        <p className="text-gray-400 text-sm mt-1">
                            {reports.length} report{reports.length !== 1 ? "s" : ""} generated
                        </p>
                    </div>
                    <button
                        onClick={() => navigate("/interview/new")}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                    >
                        + New Interview
                    </button>
                </div>

                {/* States */}
                {loading && (
                    <div className="text-center text-gray-500 py-20">Loading reports...</div>
                )}

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
                        {error}
                    </div>
                )}

                {!loading && reports.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-gray-500 text-sm">No interviews yet.</p>
                        <button
                            onClick={() => navigate("/interview/new")}
                            className="mt-4 text-blue-400 text-sm hover:underline"
                        >
                            Generate your first report →
                        </button>
                    </div>
                )}

                {/* Reports list */}
                <div className="space-y-3">
                    {reports.map((report) => (
                        <div
                            key={report._id}
                            onClick={() => navigate(`/interview/${report._id}`)}
                            className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between cursor-pointer hover:border-gray-600 transition-colors"
                        >
                            <div>
                                <h3 className="text-white font-medium">{report.title}</h3>
                                <p className="text-gray-500 text-xs mt-0.5">
                                    {new Date(report.createdAt).toLocaleDateString("en-IN", {
                                        day: "numeric", month: "short", year: "numeric"
                                    })}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className={`text-lg font-bold ${getScoreColor(report.matchScore)}`}>
                                    {report.matchScore}%
                                </span>
                                <p className="text-gray-500 text-xs">match score</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
