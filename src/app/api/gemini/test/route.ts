import { NextResponse } from 'next/server';
import { executeGeminiWithFallback, listAvailableModels } from '@/lib/gemini';

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

    const result = await executeGeminiWithFallback(cleanKey, {
      contents: 'ping',
      temperature: 0,
      maxOutputTokens: 10,
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

    // Intento de diagnóstico: verificar si ListModels arroja algo
    let availableHint = '';
    try {
      const rawKey = (await req.clone().json().catch(() => ({})))?.apiKey || req.headers.get('x-gemini-api-key') || '';
      const cleanKey = String(rawKey).replace(/^['"]|['"]$/g, '').trim();
      if (cleanKey) {
        const models = await listAvailableModels(cleanKey);
        if (models.length > 0) {
          availableHint = ` Modelos disponibles para tu clave: ${models.map(m => m.name).join(', ')}.`;
        }
      }
    } catch {
      // Ignorar error secundario de diagnóstico
    }

    return NextResponse.json(
      {
        success: false,
        error: msg,
        hint: msg.includes('API_KEY_INVALID')
          ? 'La clave ingresada no es válida. Revisa en Google AI Studio (aistudio.google.com).'
          : msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')
          ? 'Límite de cuota de Google alcanzado en este momento.'
          : (msg.includes('404') || msg.includes('not found'))
          ? `El modelo no se encontró en tu cuenta de Google AI Studio.${availableHint || ' Verifica que tu clave tenga habilitado Generative Language API en aistudio.google.com.'}`
          : 'Error al contactar con la API de Google Gemini.',
      },
      { status: 400 }
    );
  }
}

