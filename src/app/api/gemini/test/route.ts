import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawKey = body?.apiKey || req.headers.get('x-gemini-api-key') || process.env.GEMINI_API_KEY || '';
    const cleanKey = String(rawKey).replace(/^['"]|['"]$/g, '').trim();

    if (!cleanKey || cleanKey.length < 10) {
      return NextResponse.json(
        { success: false, error: 'API Key no proporcionada o demasiado corta' },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(cleanKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        maxOutputTokens: 10,
        temperature: 0,
      },
    });

    const start = Date.now();
    const result = await model.generateContent('ping');
    const latency = Date.now() - start;
    const text = result.response.text();

    return NextResponse.json({
      success: true,
      model: 'gemini-1.5-flash',
      latency_ms: latency,
      message: 'Conexión exitosa con Google Gemini 1.5 Flash',
      response_preview: text.trim(),
    });
  } catch (error: any) {
    console.error('Error testing Gemini API key:', error);
    const msg = error?.message || String(error);
    return NextResponse.json(
      {
        success: false,
        error: msg,
        hint: msg.includes('API_KEY_INVALID')
          ? 'La clave ingresada no es válida. Revisa en Google AI Studio (aistudio.google.com).'
          : msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')
          ? 'Límite de cuota de Google alcanzado.'
          : 'Error al contactar con la API de Google Gemini.',
      },
      { status: 400 }
    );
  }
}

