const {GoogleGenAI} = require("@google/genai")
const {z} = require('zod')
const {zodToJsonSchema} = require('zod-to-json-schema')

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})

const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe"),
    technicalQuestions: z.array(
        z.object({
            question: z.string().describe("A realistic technical interview question tailored to the candidate's role, skills, experience level, and target company."),
            intension: z.string().describe("Explain why the interviewer asks this question. Mention which skill, concept, problem-solving ability, communication ability, or practical knowledge is being evaluated."),
            answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
        })
    ).describe("A comprehensive list of technical interview questions with detailed interviewer intentions and high-quality answering guidance."),

    behavioralQuestions: z.array(
        z.object({
            question: z.string().describe( "A realistic behavioral or HR interview question relevant to teamwork, leadership, communication, conflict resolution, ownership, adaptability, failure handling, or project experience." ),
            intention: z.string().describe( "Explain what personality trait, soft skill, mindset, or behavioral quality the interviewer wants to evaluate through this question." ),
            answer: z.string().describe( "Provide a strong sample response using a structured approach such as STAR (Situation, Task, Action, Result). Include guidance on tone, storytelling, clarity, and impactful points." )
        })
    ).describe( "A detailed list of behavioral interview questions along with interviewer intentions and ideal answering strategies." ),

    skillGaps: z.array(
        z.object({
            skill: z.string().describe( "The missing, weak, or underdeveloped skill identified in the candidate profile." ),
            severity: z.enum(["low", "medium", "high"]).describe( "How critical this skill gap is for succeeding in the target interview or role." ),
        })
    ).describe("List of skill gaps in the candidate's profile along with their severity"),

    preparationPlan: z.array(z.object({
            day: z.number().describe("The day number in the preparation plan, starting from 1"),
            focus: z.string().describe( "The primary topic or preparation goal for the day."),
            tasks: z.array(z.string().describe("A specific actionable task, exercise, mock interview activity, coding practice, revision topic, or project work item.")
                ).describe(
                "List of practical tasks the candidate should complete on this day."
            ),
        })
    ).describe("A structured day-wise interview preparation roadmap with focused tasks and expected learning outcomes.")

})

async function generateInterviewReport({resume, selfDescription, jobDescription}) {

    const prompt = `
        Analyze the candidate profile carefully.
        Generate an interview report for a candidate with the following details :
            Resume: ${resume}
            Self Description: ${selfDescription}
            Job Description: ${jobDescription}

        Your response must:
        - Be personalized according to the resume, self description, and job description
        - Focus on realistic interview preparation
        - Include technical depth
        - Return ONLY valid JSON matching the provided schema
        - Avoid markdown formatting
        - Avoid explanations outside the schema
        Generate a comprehensive and highly useful interview report.
    `

    const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(interviewReportSchema),
            temperature: 0.7
        }
    })

    console.log(JSON.parse(response.text))
}

async function invokeGeminiAi() {
    
}

module.exports = invokeGeminiAi 