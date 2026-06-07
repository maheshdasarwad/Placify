import { useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../services/api"

export default function NewInterview() {
    const navigate = useNavigate()

    const [jobDescription, setJobDescription] = useState("")
    const [selfDescription, setSelfDescription] = useState("")
    const [resumeFile, setResumeFile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    async function handleSubmit(e) {
        e.preventDefault()
        setError("")

        if (!resumeFile) {
            setError("Please upload your resume PDF.")
            return
        }

        setLoading(true)

        try {
            const formData = new FormData()
            formData.append("resume", resumeFile)
            formData.append("jobDescription", jobDescription)
            formData.append("selfDescription", selfDescription)

            const res = await api.post("/interview", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            })

            navigate(`/interview/${res.data.interviewReport._id}`)
        } catch (err) {
            setError(err.response?.data?.message || "Failed to generate report.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white">

            {/* Navbar */}
            <div className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
                <button
                    onClick={() => navigate("/dashboard")}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                    ← Back
                </button>
                <h1 className="text-lg font-semibold">New Interview</h1>
            </div>

            <div className="max-w-2xl mx-auto px-6 py-10">
                <h2 className="text-2xl font-bold mb-1">Generate Interview Report</h2>
                <p className="text-gray-400 text-sm mb-8">
                    Upload your resume and we'll generate tailored questions, skill gaps, and a preparation plan.
                </p>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* Resume Upload */}
                    <div>
                        <label className="text-sm text-gray-400 mb-1.5 block">Resume (PDF)</label>
                        <div className="relative">
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={(e) => setResumeFile(e.target.files[0])}
                                className="hidden"
                                id="resume-upload"
                            />
                            <label
                                htmlFor="resume-upload"
                                className="flex items-center gap-3 bg-gray-800 border border-gray-700 border-dashed rounded-lg px-4 py-4 cursor-pointer hover:border-blue-500 transition-colors"
                            >
                                <span className="text-2xl">📄</span>
                                <span className="text-sm text-gray-400">
                                    {resumeFile ? resumeFile.name : "Click to upload resume PDF"}
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Job Description */}
                    <div>
                        <label className="text-sm text-gray-400 mb-1.5 block">Job Description</label>
                        <textarea
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            required
                            rows={5}
                            placeholder="Paste the job description here..."
                            className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:border-blue-500 resize-none"
                        />
                    </div>

                    {/* Self Description */}
                    <div>
                        <label className="text-sm text-gray-400 mb-1.5 block">About Yourself</label>
                        <textarea
                            value={selfDescription}
                            onChange={(e) => setSelfDescription(e.target.value)}
                            required
                            rows={3}
                            placeholder="Brief intro about yourself, your experience, and goals..."
                            className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm border border-gray-700 focus:outline-none focus:border-blue-500 resize-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg text-sm transition-colors"
                    >
                        {loading ? "Generating report... this may take a moment" : "Generate Report"}
                    </button>

                </form>
            </div>
        </div>
    )
}
