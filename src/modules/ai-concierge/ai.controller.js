import { GoogleGenAI } from '@google/genai';
import { conciergeToolDeclarations, executeConciergeTool } from './ai.tools.js';

const SYSTEM_INSTRUCTION = `You are NXT_RAIL AI Concierge, an intelligent railway travel assistant for Indian Railways passengers.
Your capabilities:
1. Look up a passenger's 10-digit PNR using 'get_pnr_context' to inspect their train route, station stops, arrival times, and bookingId.
2. Search station cabs and calculate real-time distance & fare to any landmark using 'get_station_cabs_and_estimate'.
3. Search station retiring rooms and hotels using 'get_station_hotels'.
4. Execute bookings ('book_station_cab', 'book_station_hotel') ONLY after you have presented the exact vendor name, vehicle/room type, distance/nights, and ₹ fare to the user and the user explicitly confirms (e.g., "Yes, book it" or "Confirm").

Rules:
- Always ask for the 10-digit PNR first if the user hasn't provided one and wants to check or book PNR-linked services.
- Never invent station codes, vendor IDs, or fares—always call the tools first.
- Keep responses concise, structured, and easy to read with bullet points and ₹ symbols.`;

export const chatWithConcierge = async (req, res, next) => {
  try {
    const { messages, pnr } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        status: 'fail',
        message: 'GEMINI_API_KEY is missing in backend environment variables.'
      });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY,
      apiVersion : 'v1beta'
     });

    // Format conversation history into Gemini contents structure
    const contents = (messages || []).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Inject active PNR context hint if available
    const systemPrompt = pnr
      ? `${SYSTEM_INSTRUCTION}\nActive User PNR Context: ${pnr}. Use get_pnr_context if you need bookingId or route stops.`
      : SYSTEM_INSTRUCTION;

    const executedActions = [];
    let loopCount = 0;
    const maxLoops = 5;

    let response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction: systemPrompt,
        tools: [{ functionDeclarations: conciergeToolDeclarations }],
        temperature: 0.2
      }
    });

    // Multi-step Agentic Tool Execution Loop
    while (response.functionCalls && response.functionCalls.length > 0 && loopCount < maxLoops) {
      loopCount += 1;
      const modelParts = response.candidates?.[0]?.content?.parts || [];
      contents.push({ role: 'model', parts: modelParts });

      const toolResponseParts = [];

      for (const call of response.functionCalls) {
        const toolResult = await executeConciergeTool(call.name, call.args);
        executedActions.push({ tool: call.name, args: call.args, result: toolResult });

        toolResponseParts.push({
          functionResponse: {
            name: call.name,
            response: { result: toolResult }
          }
        });
      }

      contents.push({ role: 'user', parts: toolResponseParts });

      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction: systemPrompt,
          tools: [{ functionDeclarations: conciergeToolDeclarations }],
          temperature: 0.2
        }
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        reply: response.text || 'I processed your request.',
        executedActions
      }
    });
  } catch (error) {
    next(error);
  }
};