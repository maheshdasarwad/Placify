import { Routes, Route, Navigate } from "react-router-dom"
import { useAuth } from "./context/AuthContext"

import Login from "./pages/Login"
import Register from "./pages/Register"
import Dashboard from "./pages/Dashboard"
import NewInterview from "./pages/NewInterview"
import InterviewReport from "./pages/InterviewReport"
import VoiceInterview from "./pages/VoiceInterview"
// import SessionReport from "./pages/SessionReport"

function PrivateRoute({ children }) {
    const { user, loading } = useAuth()
    if (loading) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Loading...</div>
    return user ? children : <Navigate to="/login" replace />
}

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/interview/new" element={<PrivateRoute><NewInterview /></PrivateRoute>}   />
            <Route path="/interview/:id" element={<PrivateRoute><InterviewReport /></PrivateRoute>} />
            <Route path="/interview/:id/session" element={<PrivateRoute><VoiceInterview /></PrivateRoute>} />
            {/* 
           
            <Route path="/session/:id/report" element={<PrivateRoute><SessionReport /></PrivateRoute>} /> */} 

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    )
}
