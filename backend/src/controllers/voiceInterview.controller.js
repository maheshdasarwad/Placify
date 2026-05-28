const InterviewSession = require("../models/voiceSession.model");
const InterviewReport = require("../models/interviewReport.model");
const { evaluateAnswer, generateSessionReport } = require("../services/ai.service");
const { synthesizeQuestion } = require("../services/tts.service");
const { transcribeAudio } = require("../services/stt.service")

/**
 * @desc    Create a new voice interview session from an existing interview report
 * @route   POST /api/voice-interview/session
 * @access  Private
 */
async function createSession(req, res) {
    const { interviewReportId, questionCount = 5 } = req.body;

    if (!interviewReportId) {
        return res.status(400).json({ message: "interviewReportId is required." });
    }

    const report = await InterviewReport.findOne({
        _id: interviewReportId,
        user: req.user.id
    });

    if (!report) {
        return res.status(404).json({ message: "Interview report not found." });
    }

    // Flatten technical + behavioral questions into one indexed list
    const technical = report.technicalQuestions.map((q) => ({
        type: "technical",
        question: q.question,
        idealAnswer: q.answer
    }));

    const behavioral = report.behavioralQuestions.map((q) => ({
        type: "behavioral",
        question: q.question,
        idealAnswer: q.answer
    }));

    const allQuestions = [...technical, ...behavioral];

    // Shuffle and pick questionCount questions
    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(questionCount, allQuestions.length));

    const questions = selected.map((q, i) => ({
        index: i,
        type: q.type,
        question: q.question,
        idealAnswer: q.idealAnswer
    }));

    const session = await InterviewSession.create({
        interviewReport: interviewReportId,
        user: req.user.id,
        status: "in_progress",
        questions,
        answers: []
    });

    res.status(201).json({
        message: "Interview session created successfully.",
        session: {
            _id: session._id,
            status: session.status,
            totalQuestions: session.questions.length,
            // Don't send idealAnswer to frontend
            questions: session.questions.map((q) => ({
                index: q.index,
                type: q.type,
                question: q.question
            }))
        }
    });
}


/**
 * @desc    Get session details and current progress
 * @route   GET /api/voice-interview/session/:sessionId
 * @access  Private
 */
async function getSession(req, res) {
    const session = await InterviewSession.findOne({
        _id: req.params.sessionId,
        user: req.user.id
    });

    if (!session) {
        return res.status(404).json({ message: "Session not found." });
    }

    const answeredIndexes = session.answers.map((a) => a.questionIndex);

    res.status(200).json({
        message: "Session fetched successfully.",
        session: {
            _id: session._id,
            status: session.status,
            totalQuestions: session.questions.length,
            answeredCount: session.answers.length,
            answeredIndexes,
            overallScore: session.overallScore,
            overallFeedback: session.overallFeedback,
            completedAt: session.completedAt,
            // Don't expose idealAnswer
            questions: session.questions.map((q) => ({
                index: q.index,
                type: q.type,
                question: q.question
            })),
            answers: session.answers
        }
    });
}


/**
 * @desc    Get TTS audio for a specific question
 * @route   GET /api/voice-interview/session/:sessionId/question/:questionIndex/audio
 * @access  Private
 */
async function getQuestionAudio(req, res) {
    const { sessionId, questionIndex } = req.params;

    const session = await InterviewSession.findOne({
        _id: sessionId,
        user: req.user.id
    });

    if (!session) {
        return res.status(404).json({ message: "Session not found." });
    }

    const question = session.questions.find(
        (q) => q.index === parseInt(questionIndex)
    );

    if (!question) {
        return res.status(404).json({ message: "Question not found." });
    }

    const audioBuffer = await synthesizeQuestion(question.question);

    res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length,
        "Content-Disposition": `inline; filename="question-${questionIndex}.mp3"`
    });

    res.send(audioBuffer);
}


/**
 * @desc    Submit transcript for a question → AI evaluates → stores answer
 * @route   POST /api/voice-interview/session/:sessionId/answer
 * @access  Private
 */
async function submitAnswer(req, res) {

    console.log("req.body:", req.body)
    console.log("req.file:", req.file)

    const { sessionId } = req.params
    const questionIndex = req.body?.questionIndex

    if (questionIndex === undefined || questionIndex === null || questionIndex === "") {
    return res.status(400).json({ message: "questionIndex is required." })
}

    const session = await InterviewSession.findOne({
        _id: sessionId,
        user: req.user.id
    })

    if (!session) {
        return res.status(404).json({ message: "Session not found." })
    }

    if (session.status === "completed") {
        return res.status(400).json({ message: "Session is already completed." })
    }

    const question = session.questions.find(
        (q) => q.index === parseInt(questionIndex)
    )

    if (!question) {
        return res.status(404).json({ message: "Question not found." })
    }

    const alreadyAnswered = session.answers.find(
        (a) => a.questionIndex === parseInt(questionIndex)
    )

    if (alreadyAnswered) {
        return res.status(400).json({ message: "Question already answered." })
    }

    // Transcribe audio if file uploaded, otherwise use text transcript from body
    let transcript = req.body.transcript || ""

    if (req.file) {
        try {
            transcript = await transcribeAudio(req.file.buffer, req.file.mimetype)
        } catch (err) {
            console.error("STT failed:", err.message)
            transcript = "Could not transcribe audio."
        }
    }

    if (!transcript || transcript.trim().length === 0) {
        transcript = "No answer provided."
    }

    const { score, feedback } = await evaluateAnswer({
        question: question.question,
        idealAnswer: question.idealAnswer,
        userTranscript: transcript
    })

    session.answers.push({
        questionIndex: parseInt(questionIndex),
        transcript: transcript.trim(),
        score,
        feedback,
        answeredAt: new Date()
    })

    await session.save()

    res.status(200).json({
        message: "Answer submitted successfully.",
        result: { score, feedback, transcript }
    })
}


/**
 * @desc    Complete session → generate overall report
 * @route   POST /api/voice-interview/session/:sessionId/complete
 * @access  Private
 */
async function completeSession(req, res) {
    const session = await InterviewSession.findOne({
        _id: req.params.sessionId,
        user: req.user.id
    });

    if (!session) {
        return res.status(404).json({ message: "Session not found." });
    }

    if (session.status === "completed") {
        return res.status(400).json({ message: "Session is already completed." });
    }

    if (session.answers.length === 0) {
        return res.status(400).json({ message: "No answers submitted yet." });
    }

    // Build full answered questions list for report generation
    const answeredQuestions = session.answers.map((answer) => {
        const question = session.questions.find(
            (q) => q.index === answer.questionIndex
        );
        return {
            question: question.question,
            idealAnswer: question.idealAnswer,
            transcript: answer.transcript,
            score: answer.score,
            feedback: answer.feedback
        };
    });

    const report = await InterviewReport.findById(session.interviewReport)
        || { title: "Interview" };

    const { overallScore, overallFeedback } = await generateSessionReport({
        jobTitle: report.title || "the role",
        answeredQuestions
    });

    session.status = "completed";
    session.overallScore = overallScore;
    session.overallFeedback = overallFeedback;
    session.completedAt = new Date();

    await session.save();

    res.status(200).json({
        message: "Interview session completed.",
        report: {
            overallScore,
            overallFeedback,
            totalQuestions: session.questions.length,
            answeredCount: session.answers.length,
            answers: session.answers,
            // add this line:
            questions: session.questions.map(q => ({
                index: q.index,
                type: q.type,
                question: q.question
            }))
        }
    })
}


/**
 * @desc    List all sessions for logged in user
 * @route   GET /api/voice-interview/sessions
 * @access  Private
 */
async function getAllSessions(req, res) {
    const sessions = await InterviewSession.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .select("-questions.idealAnswer -answers.transcript")
        .populate("interviewReport", "title matchScore");

    res.status(200).json({
        message: "Sessions fetched successfully.",
        sessions
    });
}

module.exports = {
    createSession,
    getSession,
    getQuestionAudio,
    submitAnswer,
    completeSession,
    getAllSessions
};
