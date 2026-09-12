import { GoogleGenerativeAI, GenerativeModel, ModelParams, RequestOptions } from '@google/generative-ai';

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
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-002',
  'gemini-3.8-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
  'gemini-pro',
];

// Regex para descartar modelos que no soportan salida de texto (ej. TTS, Audio puro, Embeddings)
const NON_TEXT_MODEL_REGEX = /(-tts|tts|-audio|embedding|imagen|whisper|robotics)/i;

const resolutionCache = new Map<string, { result: ModelResolutionResult; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Consulta la API ListModels de Google para detectar qué modelos están disponibles
 * para la clave del usuario, descartando expresamente modelos no textuales como TTS.
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
        signal: AbortSignal.timeout(6000),
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

          // Descartar modelos que no son de texto o que son de solo voz/audio
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
      console.warn(`[Gemini inspectKey ${apiVer}] Network error:`, err?.message || err);
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

export async function resolveBestModel(apiKey: string, preferredModel?: string): Promise<ModelResolutionResult> {
  const cleanKey = apiKey.replace(/^['"]|['"]$/g, '').trim();
  const cached = resolutionCache.get(cleanKey);
  if (!preferredModel && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  const inspection = await inspectGeminiKey(cleanKey);
  const discovered = inspection.models;
  const discoveredNames = discovered.map((m) => m.name);

  if (discovered.length > 0) {
    // Si el usuario especificó un modelo puntual y fue descubierto y no es TTS
    if (preferredModel && preferredModel !== 'auto' && !NON_TEXT_MODEL_REGEX.test(preferredModel)) {
      const match = discovered.find((m) => m.name.toLowerCase() === preferredModel.toLowerCase());
      if (match) {
        const result: ModelResolutionResult = {
          modelName: match.name,
          apiVersion: match.apiVersion,
          availableModels: discoveredNames,
          discoveryMethod: 'list_models',
        };
        resolutionCache.set(cleanKey, { result, timestamp: Date.now() });
        return result;
      }
    }

    // Buscar en la lista de preferencia estándar
    for (const pref of PREFERRED_MODELS) {
      const match = discovered.find((m) => m.name === pref);
      if (match) {
        const result: ModelResolutionResult = {
          modelName: match.name,
          apiVersion: match.apiVersion,
          availableModels: discoveredNames,
          discoveryMethod: 'list_models',
        };
        resolutionCache.set(cleanKey, { result, timestamp: Date.now() });
        return result;
      }
    }

    // Cualquier modelo Flash textual
    const flashMatch = discovered.find(
      (m) => m.name.toLowerCase().includes('flash') && !NON_TEXT_MODEL_REGEX.test(m.name)
    );
    if (flashMatch) {
      const result: ModelResolutionResult = {
        modelName: flashMatch.name,
        apiVersion: flashMatch.apiVersion,
        availableModels: discoveredNames,
        discoveryMethod: 'list_models',
      };
      resolutionCache.set(cleanKey, { result, timestamp: Date.now() });
      return result;
    }

    // Primer modelo textual descubierto
    const result: ModelResolutionResult = {
      modelName: discovered[0].name,
      apiVersion: discovered[0].apiVersion,
      availableModels: discoveredNames,
      discoveryMethod: 'list_models',
    };
    resolutionCache.set(cleanKey, { result, timestamp: Date.now() });
    return result;
  }

  // Fallback si ListModels no devolvió nada
  const fallbackModel = (preferredModel && preferredModel !== 'auto' && !NON_TEXT_MODEL_REGEX.test(preferredModel))
    ? preferredModel
    : 'gemini-2.0-flash';

  return {
    modelName: fallbackModel,
    apiVersion: 'v1beta',
    availableModels: PREFERRED_MODELS.slice(0, 5),
    discoveryMethod: 'fallback_probe',
    inspectionError: inspection.errorMessage,
  };
}

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
  const resolved = await resolveBestModel(cleanKey, userRequested);

  if (resolved.discoveryMethod === 'fallback_probe' && resolved.inspectionError) {
    throw new Error(`Google AI rechazó la clave: ${resolved.inspectionError}. Asegúrate de crear tu clave en https://aistudio.google.com/app/apikey.`);
  }

  // Armar lista de candidatos priorizada evitando modelos de audio/TTS
  const rawCandidates = [
    ...(userRequested && userRequested !== 'auto' && !NON_TEXT_MODEL_REGEX.test(userRequested) ? [userRequested] : []),
    resolved.modelName,
    ...PREFERRED_MODELS,
    ...(resolved.availableModels || []),
  ];

  const candidates = Array.from(new Set(rawCandidates.filter((m) => Boolean(m) && !NON_TEXT_MODEL_REGEX.test(m))));

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

      const requestOptions: RequestOptions = resolved.apiVersion ? { apiVersion: resolved.apiVersion } : {};
      const model = genAI.getGenerativeModel(modelOptions, requestOptions);

      const result = await model.generateContent(generateParams.contents);
      const text = result.response.text();
      const latencyMs = Date.now() - start;

      if (modelCandidate !== resolved.modelName) {
        resolutionCache.set(cleanKey, {
          result: {
            ...resolved,
            modelName: modelCandidate,
          },
          timestamp: Date.now(),
        });
      }

      return {
        text,
        modelUsed: modelCandidate,
        latencyMs,
        availableModels: resolved.availableModels,
      };
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);

      if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid')) {
        throw err;
      }

      // Detectar incompatibilidad de modalidades (como TTS que rechaza TEXT),
      // alta demanda temporal (503), modelo no encontrado (404), o cuota puntual (429)
      const shouldFailover =
        errMsg.includes('modalities') ||
        errMsg.includes('AUDIO') ||
        errMsg.includes('not supported') ||
        errMsg.includes('404') ||
        errMsg.includes('not found') ||
        errMsg.includes('503') ||
        errMsg.includes('Service Unavailable') ||
        errMsg.includes('high demand') ||
        errMsg.includes('overloaded') ||
        errMsg.includes('500') ||
        errMsg.includes('502') ||
        errMsg.includes('504') ||
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED');

      if (shouldFailover) {
        console.warn(`[Gemini Failover] Modelo '${modelCandidate}' no apto o saturado (${errMsg.slice(0, 60)}...), probando siguiente...`);
        continue;
      }

      throw err;
    }
  }

  const guidance = 'Ningún modelo de texto de Gemini pudo responder. Si fue error 503 ("high demand"), intenta con gemini-2.0-flash en Preferencias. Si fue 404, genera una clave en https://aistudio.google.com/app/apikey.';
  throw new Error(`${lastError?.message || 'Modelos no disponibles'} - ${guidance}`);
}
