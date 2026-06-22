const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")

const app = express()

const ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
]

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true)
        const allowed = ALLOWED_ORIGINS.some(o =>
            typeof o === "string" ? o === origin : o.test(origin)
        )
        callback(null, allowed)
    },
    credentials: true,
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

const authRouter         = require("./routes/auth.routes")
const interviewRouter    = require("./routes/interview.routes")
const voiceInterviewRouter = require("./routes/voiceInterview.routes")

app.use("/api/auth",           authRouter)
app.use("/api/interview",      interviewRouter)
app.use("/api/voice-interview", voiceInterviewRouter)

module.exports = app
