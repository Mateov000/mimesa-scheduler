import { NextResponse } from 'next/server';
import { executeGeminiWithFallback, inspectGeminiKey } from '@/lib/gemini';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawKey = body?.apiKey || req.headers.get('x-gemini-api-key') || process.env.GEMINI_API_KEY || '';
    const cleanKey = String(rawKey).replace(/^['"]|['"]$/g, '').trim();

    if (!cleanKey || cleanKey.length < 10) {
      return NextResponse.json(
        { success: false, error: 'API Key no proporcionada o demasiado corta' },
        { status: 400 }
      );
    }

    const preferredModel = String(body?.preferredModel || body?.gemini_model || req.headers.get('x-gemini-model') || '').trim();

    // 1. Diagnóstico previo con ListModels
    const inspection = await inspectGeminiKey(cleanKey);
    if (!inspection.ok) {
      return NextResponse.json(
        {
          success: false,
          error: inspection.errorMessage || 'Error validando la API Key en Google AI Studio',
          hint: inspection.hint,
        },
        { status: 400 }
      );
    }

    // 2. Si ListModels encontró modelos, ejecutar prueba de ping
    const result = await executeGeminiWithFallback(cleanKey, {
      contents: 'ping',
      temperature: 0,
      maxOutputTokens: 10,
      preferredModel: preferredModel || undefined,
    });

    return NextResponse.json({
      success: true,
      model: result.modelUsed,
      latency_ms: result.latencyMs,
      available_models: result.availableModels,
      message: `Conexión exitosa con Google Gemini (${result.modelUsed})`,
      response_preview: result.text.trim(),
    });
  } catch (error: any) {
    console.error('Error testing Gemini API key:', error);
    const msg = error?.message || String(error);

    let hint = 'Error al contactar con la API de Google Gemini.';
    if (msg.includes('API_KEY_INVALID')) {
      hint = 'La clave ingresada no es válida. Revisa en Google AI Studio (aistudio.google.com).';
    } else if (msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
      hint = 'Límite de cuota de Google alcanzado en este momento.';
    } else if (msg.includes('Generative Language API has not been used') || msg.includes('disabled')) {
      hint = 'Debes habilitar la "Generative Language API" en tu proyecto de Google Cloud o crear la clave directamente en aistudio.google.com/app/apikey (recomendado).';
    } else if (msg.includes('404') || msg.includes('not found')) {
      hint = 'Google no encontró modelos habilitados para este proyecto. Te recomendamos crear una nueva clave gratuita directamente desde https://aistudio.google.com/app/apikey.';
    }

    return NextResponse.json(
      {
        success: false,
        error: msg,
        hint,
      },
      { status: 400 }
    );
  }
}
