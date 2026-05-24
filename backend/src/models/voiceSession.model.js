const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
    {
        index: {
            type: Number,
            required: [true, "Question index is required"],
            min: 0
        },
        type: {
            type: String,
            enum: ["technical", "behavioral"],
            required: [true, "Question type is required"]
        },
        question: {
            type: String,
            required: [true, "Question text is required"]
        },
        idealAnswer: {
            type: String,
            required: [true, "Ideal answer is required"]
        }
    },
    { _id: false }
);

const answerSchema = new mongoose.Schema(
    {
        questionIndex: {
            type: Number,
            required: [true, "Question index is required"],
            min: 0
        },
        transcript: {
            type: String,
            default: ""
        },
        score: {
            type: Number,
            min: 0,
            max: 10
        },
        feedback: {
            type: String,
            default: ""
        },
        audioUrl: {
            type: String,
            default: ""
        },
        answeredAt: {
            type: Date,
            default: Date.now
        }
    },
    { _id: false }
);

const interviewSessionSchema = new mongoose.Schema(
    {
        interviewReport: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "InterviewReport",
            required: [true, "Interview report reference is required"]
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: [true, "User reference is required"]
        },
        status: {
            type: String,
            enum: ["in_progress", "completed"],
            default: "in_progress"
        },
        questions: {
            type: [questionSchema],
            validate: {
                validator: (v) => Array.isArray(v) && v.length > 0,
                message: "Session must have at least one question"
            }
        },
        answers: [answerSchema],
        overallScore: {
            type: Number,
            min: 0,
            max: 10
        },
        overallFeedback: {
            type: String,
            default: ""
        },
        completedAt: {
            type: Date
        }
    },
    { timestamps: true }
);

const InterviewSession = mongoose.model("InterviewSession", interviewSessionSchema);

module.exports = InterviewSession;
