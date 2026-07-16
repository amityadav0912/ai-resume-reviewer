import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

export async function GET(request: Request) {
    try { 
        const result = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents : "Explain LLM in 2 Lines",
            config: {
                thinkingConfig : {
                    thinkingBudget: 0,
                }
            }
        })
        console.log(result);

        return Response.json({answer: result.text});
    } 
    catch(error){
        console.log(error);
        return Response.json({error: 'Failed to generate content'}, {status: 500});
    }
    
}