const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const voiceInterviewController = require("../controllers/voiceInterview.controller");
const multer = require("multer")

const voiceInterviewRouter = express.Router()
const audioUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
})

// All routes are private
voiceInterviewRouter.use(authMiddleware.authUser);

voiceInterviewRouter.post("/session", voiceInterviewController.createSession);
voiceInterviewRouter.get("/sessions", voiceInterviewController.getAllSessions);
voiceInterviewRouter.get("/session/:sessionId", voiceInterviewController.getSession);
voiceInterviewRouter.get("/session/:sessionId/question/:questionIndex/audio", voiceInterviewController.getQuestionAudio);
voiceInterviewRouter.post("/session/:sessionId/answer", audioUpload.single("audio"), voiceInterviewController.submitAnswer);
voiceInterviewRouter.post("/session/:sessionId/complete", voiceInterviewController.completeSession);

module.exports = voiceInterviewRouter;
