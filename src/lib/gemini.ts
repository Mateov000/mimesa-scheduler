import { GoogleGenerativeAI, ModelParams, RequestOptions } from '@google/generative-ai';

export interface DiscoveredGeminiModel {
  name: string;
  displayName?: string;
  supportedMethods: string[];
  apiVersion: 'v1' | 'v1beta';
}

export interface ModelResolutionResult {
  modelName: string;
  apiVersion?: 'v1' | 'v1beta';
  availableModels: string[];
  discoveryMethod: 'list_models' | 'fallback_probe';
  inspectionError?: string;
}

export interface InspectionResult {
  ok: boolean;
  models: DiscoveredGeminiModel[];
  errorMessage?: string;
  statusCode?: number;
  hint?: string;
}

// Modelos textuales de alta velocidad en orden de fiabilidad y disponibilidad
export const PREFERRED_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.5-flash',
  'gemini-3.8-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
  'gemini-pro',
];

// Regex para descartar modelos que no soportan salida de texto (ej. TTS, Audio puro, Embeddings)
export const NON_TEXT_MODEL_REGEX = /(-tts|tts|-audio|embedding|imagen|whisper|robotics)/i;

/**
 * Consulta la API ListModels de Google para diagnosticar qué modelos están habilitados
 * para la clave del usuario (usado principalmente en el botón de Probar Conexión).
 */
export async function inspectGeminiKey(apiKey: string): Promise<InspectionResult> {
  const cleanKey = apiKey.replace(/^['"]|['"]$/g, '').trim();
  if (!cleanKey) {
    return { ok: false, models: [], errorMessage: 'API Key vacía' };
  }

  const versions: ('v1beta' | 'v1')[] = ['v1beta', 'v1'];
  let lastErrorJson: any = null;
  let lastStatus = 0;
  const allDiscovered: DiscoveredGeminiModel[] = [];
  const seen = new Set<string>();

  for (const apiVer of versions) {
    try {
      const url = `https://generativelanguage.googleapis.com/${apiVer}/models?key=${cleanKey}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(4000),
      });

      lastStatus = res.status;

      if (!res.ok) {
        lastErrorJson = await res.json().catch(() => null);
        console.warn(`[Gemini inspectKey ${apiVer}] HTTP ${res.status}:`, lastErrorJson?.error?.message || res.statusText);
        continue;
      }

      const data = await res.json();
      if (Array.isArray(data.models)) {
        for (const m of data.models) {
          const rawName = String(m.name || '').replace(/^models\//, '');
          const methods: string[] = Array.isArray(m.supportedGenerationMethods) ? m.supportedGenerationMethods : [];

          if (NON_TEXT_MODEL_REGEX.test(rawName)) {
            continue;
          }

          if (rawName && methods.includes('generateContent') && !seen.has(rawName)) {
            seen.add(rawName);
            allDiscovered.push({
              name: rawName,
              displayName: m.displayName || rawName,
              supportedMethods: methods,
              apiVersion: apiVer,
            });
          }
        }
      }
    } catch (err: any) {
      console.warn(`[Gemini inspectKey ${apiVer}] Error de red:`, err?.message || err);
    }
  }

  if (allDiscovered.length > 0) {
    return {
      ok: true,
      models: allDiscovered,
    };
  }

  const rawMsg = lastErrorJson?.error?.message || '';
  let hint = 'No se encontraron modelos de texto disponibles para esta clave.';

  if (rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('API key not valid')) {
    hint = 'La clave ingresada no es válida. Revisa o genera una nueva en Google AI Studio (aistudio.google.com).';
  } else if (rawMsg.includes('Generative Language API has not been used') || rawMsg.includes('disabled')) {
    hint = 'La API "Generative Language" no está habilitada en el proyecto de Google Cloud de esta clave. Crea una clave directa en aistudio.google.com/app/apikey.';
  } else if (rawMsg.includes('The caller does not have permission') || lastStatus === 403) {
    hint = 'Permiso denegado por Google. Genera tu clave en Google AI Studio (aistudio.google.com).';
  } else if (lastStatus === 404) {
    hint = 'El servicio de Google respondió 404. Genera una clave gratuita en https://aistudio.google.com/app/apikey.';
  }

  return {
    ok: false,
    models: [],
    statusCode: lastStatus,
    errorMessage: rawMsg || (lastStatus ? `HTTP Error ${lastStatus} al consultar modelos` : 'Error de red contactando a Google'),
    hint,
  };
}

export async function listAvailableModels(apiKey: string): Promise<DiscoveredGeminiModel[]> {
  const inspection = await inspectGeminiKey(apiKey);
  return inspection.models;
}

/**
 * Ejecuta la llamada a Gemini con failover ultra veloz y sin retrasos de red previos.
 * Si el modelo preferido (ej. gemini-3.8-flash) sufre 503 (alta demanda) o timeout,
 * inmediatamente salta a gemini-2.0-flash o gemini-1.5-flash sin bloquear al usuario.
 */
export async function executeGeminiWithFallback(
  apiKey: string,
  generateParams: {
    contents: any;
    systemInstruction?: string;
    temperature?: number;
    responseMimeType?: string;
    maxOutputTokens?: number;
    preferredModel?: string;
  }
): Promise<{
  text: string;
  modelUsed: string;
  latencyMs: number;
  availableModels: string[];
}> {
  const cleanKey = apiKey.replace(/^['"]|['"]$/g, '').trim();
  const userRequested = generateParams.preferredModel?.trim();

  // Candidatos ordenados de forma eficiente
  const candidateList: string[] = [];
  if (userRequested && userRequested !== 'auto' && !NON_TEXT_MODEL_REGEX.test(userRequested)) {
    candidateList.push(userRequested);
  }
  candidateList.push('gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash');

  const candidates = Array.from(new Set(candidateList));
  const genAI = new GoogleGenerativeAI(cleanKey);
  let lastError: any = null;

  for (const modelCandidate of candidates) {
    const start = Date.now();
    try {
      const modelOptions: ModelParams = {
        model: modelCandidate,
        generationConfig: {
          temperature: generateParams.temperature ?? 0.15,
          ...(generateParams.responseMimeType ? { responseMimeType: generateParams.responseMimeType } : {}),
          ...(generateParams.maxOutputTokens ? { maxOutputTokens: generateParams.maxOutputTokens } : {}),
        },
        ...(generateParams.systemInstruction ? { systemInstruction: generateParams.systemInstruction } : {}),
      };

      // Timeout de 9 segundos por intento para responder rápido
      const requestOptions: RequestOptions = {
        timeout: 9000,
      };

      const model = genAI.getGenerativeModel(modelOptions, requestOptions);
      const result = await model.generateContent(generateParams.contents);
      const text = result.response.text();
      const latencyMs = Date.now() - start;

      return {
        text,
        modelUsed: modelCandidate,
        latencyMs,
        availableModels: candidates,
      };
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);

      // Si la API key es totalmente inválida, abortar
      if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid')) {
        throw err;
      }

      // Si el modelo da 503 (alta demanda), 404, 400 (audio modal) o timeout, probar de inmediato el siguiente
      console.warn(`[Gemini Failover] Modelo '${modelCandidate}' no disponible (${errMsg.slice(0, 70)}...), probando siguiente candidato...`);
    }
  }

  const guidance = 'Ningún modelo de Gemini respondió a tiempo. Te recomendamos verificar en Preferencias que esté seleccionado gemini-2.0-flash.';
  throw new Error(`${lastError?.message || 'Modelos no disponibles'} - ${guidance}`);
}
