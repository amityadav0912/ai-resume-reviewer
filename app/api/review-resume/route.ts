import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});
const systemPrompt = (role: string, yearsOfExperience: number) => `You are a senior ${role} hiring manager with 10+ years of experience 
reviewing technical resumes. You are strict, honest, and specific in 
your feedback. You do not sugarcoat weaknesses and you do not inflate 
strengths.

## Task
Review the candidate's resume for a ${role}position. The candidate 
has ${yearsOfExperience} years of experience. Calibrate all feedback 
to this experience level — a 1-year candidate is judged differently 
than a 10-year candidate.

## Output Format
Respond with a single JSON object matching this exact schema. Do NOT 
include any text, markdown, or explanation before or after the JSON. 
Your entire response must be valid JSON parseable by JSON.parse().

{
  "summary": "1-2 sentence overall assessment",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "gaps": ["gap 1", "gap 2", "gap 3"],
  "missingKeywords": ["keyword1", "keyword2"],
  "suggestions": ["actionable suggestion 1", "..."],
  "overallScore": 7
}

## Field Rules
- summary: exactly 1-2 sentences, direct and specific.
- strengths: 3-5 items. Each must reference something literally in the resume.
- gaps: 3-5 items. Skills/experience missing for a ${role}at 
  ${yearsOfExperience}-year experience level.
- missingKeywords: 3-8 items. ATS-relevant keywords for ${role}
  positions that are absent from the resume.
- suggestions: 3-5 items. Concrete, actionable improvements.
- overallScore: integer from 1 to 10. Be honest — most resumes 
  score 5-7. Reserve 9-10 for exceptional candidates.

## Anti-Hallucination Rules
- Do NOT invent skills, technologies, or experiences not present 
  in the resume text.
- If a skill is listed but not demonstrated in projects/experience, 
  flag it in "gaps" as unverified.
- If the resume is too short or vague to review meaningfully, 
  return a summary explaining this and use low scores for 
  strengths (empty array is acceptable).
- Every strength or gap must be tied to something specific in 
  the resume text — no generic praise or generic criticism.

Return only the JSON object. No preamble, no markdown, no code fences.`;


export async function POST(request: Request) {
    let resume: string, yearsOfExperience: number, role: string;
    try {
        ({ resume, yearsOfExperience, role } = await request.json() as {resume: string, yearsOfExperience: number, role: string});
    } catch {
        return Response.json({ error: "Invalid Input", details: "Request body is not valid JSON. Make sure the resume text is properly encoded." }, { status: 400 });
    }
    if (typeof resume !== 'string') {
        return Response.json({ error: "Invalid Input", details: "'resume' is required and must be a string" }, { status: 400 });
      }
      if (typeof yearsOfExperience !== 'number') {
        return Response.json({ error: "Invalid Input", details: "'yearsOfExperience' is required and must be a number" }, { status: 400 });
      }
      if (typeof role !== 'string') {
        return Response.json({ error: "Invalid Input", details: "'role' is required and must be a string" }, { status: 400 });
      }

    const acceptedRoles = ['Backend Engineer', 'Frontend Engineer', 'Full Stack Engineer', 'AI Engineer', 'Data Engineer']
    if(resume.length < 200 || resume.length > 15000) {
        return Response.json({error: "Invalid Input" , details: 'Resume must be between 200 and 15000 characters' }, { status: 400 });
    }
    if(yearsOfExperience < 0 || yearsOfExperience > 50) {
        return Response.json({error: "Invalid Input" , details: 'Year of experience must be between 0 and 50' }, { status: 400 });
    }
    if(!acceptedRoles.includes(role)) {
        return Response.json({error: "Invalid Input" , details: `${role} must be one of the following: ${acceptedRoles.join(', ')}` }, { status: 400 });
    }
    try {
        const result = await ai.models.generateContent({
            model: 'gemini-3.5-flash',

            contents: `Review the following resume: ${resume} for the role of ${role} with ${yearsOfExperience} years of experience.`,
            config: {
                thinkingConfig: {
                    thinkingBudget: 512,
                }, 
                systemInstruction: systemPrompt(role, yearsOfExperience),
            }
        })
        console.log(result.usageMetadata);
        try{
            const parsedRespone = JSON.parse(result.text || '{}');
            return Response.json({review: parsedRespone, meta: {model: 'gemini-3.5-flash', tokensUsed: result.usageMetadata?.totalTokenCount ?? 0, responseId: result.responseId ?? 'unknown' }}, { status: 200 });
        }
        catch(error){
            console.error(error);
            return Response.json({error: "Invalid Response" , details: 'Response is not a valid JSON' }, { status: 500 });
        }
    } 
    catch(error){
        console.error(error);
        return Response.json({error: "Internal Server Error" , details: 'Failed to review resume' }, { status: 500 });
    }
}