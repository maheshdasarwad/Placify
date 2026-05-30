import { createContext, useContext, useState, useEffect } from "react"
import api from "../services/api"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const savedUser = localStorage.getItem("user")
        if (savedUser) {
            setUser(JSON.parse(savedUser))
        }
        setLoading(false)
    }, [])

    async function login(email, password) {
        const res = await api.post("/auth/login", { email, password })
        // cookie is set by backend automatically via Set-Cookie header
        localStorage.setItem("user", JSON.stringify(res.data.user))
        setUser(res.data.user)
    }

    async function register(username, email, password) {
        const res = await api.post("/auth/register", { username, email, password })
        localStorage.setItem("user", JSON.stringify(res.data.user))
        setUser(res.data.user)
    }

    function logout() {
        localStorage.removeItem("user")
        setUser(null)
        window.location.href = "/login"
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}
