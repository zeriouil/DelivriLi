import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Initialize the Gemini client
// Note: This relies on GEMINI_API_KEY being set in your .env.local file
const client = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

export async function POST(request: Request) {
  try {
    if (!client) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { imageBase64, mimeType } = body;

    if (!imageBase64 || !mimeType) {
      return NextResponse.json(
        { error: 'imageBase64 and mimeType are required' },
        { status: 400 }
      );
    }

    const prompt = `You are an expert menu digitizer. 
Please read this restaurant menu image and extract all categories, menu items, prices, and descriptions.
Format the output as a strict JSON object following this schema:
{
  "categories": [
    {
      "name": "string (e.g. Starters, Main Courses, Drinks)",
      "items": [
        {
          "name": "string",
          "description": "string (optional, leave empty if none)",
          "price": number (the price as a number, e.g. 15.5)
        }
      ]
    }
  ]
}
Return only the raw JSON.`;

    const interaction = await client.interactions.create({
      model: 'gemini-3.6-flash',
      input: [
        { type: 'text', text: prompt },
        { type: 'image', data: imageBase64, mime_type: mimeType }
      ],
      response_mime_type: 'application/json',
    });

    const resultText = interaction.output_text;
    
    if (!resultText) {
      throw new Error('Empty response from AI');
    }

    const json = JSON.parse(resultText);

    return NextResponse.json({ success: true, data: json });
  } catch (error: any) {
    console.error('Menu extraction error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract menu' },
      { status: 500 }
    );
  }
}
