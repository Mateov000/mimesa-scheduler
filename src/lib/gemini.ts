import { GoogleGenerativeAI, GenerativeModel, ModelParams, RequestOptions } from '@google/generative-ai';

export interface DiscoveredGeminiModel {
  name: string; // e.g. "gemini-2.0-flash"
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

export const PREFERRED_MODELS = [
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-002',
  'gemini-1.5-flash-001',
  'gemini-1.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-8b',
  'gemini-2.0-flash-exp',
  'gemini-1.5-pro',
  'gemini-1.5-pro-latest',
  'gemini-pro',
];

// Cache model discovery per API key to minimize network requests (15 min TTL)
const resolutionCache = new Map<string, { result: ModelResolutionResult; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Inspects an API key directly against Google's ListModels endpoint to get
 * the exact status and authorized models or actionable error message from Google.
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
        headers: { 'Accept': 'application/json' },
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

  // If no models were discovered, explain why from Google's response
  const rawMsg = lastErrorJson?.error?.message || '';
  let hint = 'No se encontraron modelos disponibles para esta clave.';

  if (rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('API key not valid')) {
    hint = 'La clave ingresada no es válida. Revisa o genera una nueva en Google AI Studio (aistudio.google.com).';
  } else if (rawMsg.includes('Generative Language API has not been used') || rawMsg.includes('disabled')) {
    hint = 'La API "Generative Language" no está habilitada en el proyecto de Google Cloud de esta clave. Recomendación: Crea una clave gratuita directa en https://aistudio.google.com/app/apikey.';
  } else if (rawMsg.includes('The caller does not have permission') || lastStatus === 403) {
    hint = 'Permiso denegado por Google. Asegúrate de generar la clave en Google AI Studio (aistudio.google.com), no desde un proyecto empresarial restringido.';
  } else if (lastStatus === 404) {
    hint = 'El servicio de modelos de Google respondió 404. Tu proyecto de Google no tiene acceso a la Generative Language API. Genera una clave gratuita en aistudio.google.com.';
  }

  return {
    ok: false,
    models: [],
    statusCode: lastStatus,
    errorMessage: rawMsg || (lastStatus ? `HTTP Error ${lastStatus} al consultar modelos de Google` : 'Error de red contactando a Google'),
    hint,
  };
}

/**
 * Lists available models for generateContent.
 */
export async function listAvailableModels(apiKey: string): Promise<DiscoveredGeminiModel[]> {
  const inspection = await inspectGeminiKey(apiKey);
  return inspection.models;
}

/**
 * Resolves the best supported model for the given API key.
 */
export async function resolveBestModel(apiKey: string, preferredModel?: string): Promise<ModelResolutionResult> {
  const cleanKey = apiKey.replace(/^['"]|['"]$/g, '').trim();
  const cached = resolutionCache.get(cleanKey);
  if (!preferredModel && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  const inspection = await inspectGeminiKey(cleanKey);
  const discovered = inspection.models;
  const discoveredNames = discovered.map(m => m.name);

  if (discovered.length > 0) {
    // 0. If preferredModel requested and discovered, use it
    if (preferredModel && preferredModel !== 'auto') {
      const match = discovered.find(m => m.name.toLowerCase() === preferredModel.toLowerCase());
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

    // 1. Check preferred models in order
    for (const pref of PREFERRED_MODELS) {
      const match = discovered.find(m => m.name === pref);
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

    // 2. Any model with "flash" in the name
    const flashMatch = discovered.find(m => m.name.toLowerCase().includes('flash'));
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

    // 3. Any model with "gemini" in the name
    const geminiMatch = discovered.find(m => m.name.toLowerCase().includes('gemini'));
    if (geminiMatch) {
      const result: ModelResolutionResult = {
        modelName: geminiMatch.name,
        apiVersion: geminiMatch.apiVersion,
        availableModels: discoveredNames,
        discoveryMethod: 'list_models',
      };
      resolutionCache.set(cleanKey, { result, timestamp: Date.now() });
      return result;
    }

    // 4. Fall back to first discovered model
    const result: ModelResolutionResult = {
      modelName: discovered[0].name,
      apiVersion: discovered[0].apiVersion,
      availableModels: discoveredNames,
      discoveryMethod: 'list_models',
    };
    resolutionCache.set(cleanKey, { result, timestamp: Date.now() });
    return result;
  }

  // If inspection failed with a specific Google error, preserve it
  const defaultResult: ModelResolutionResult = {
    modelName: (preferredModel && preferredModel !== 'auto') ? preferredModel : 'gemini-3.8-flash',
    apiVersion: 'v1beta',
    availableModels: PREFERRED_MODELS.slice(0, 6),
    discoveryMethod: 'fallback_probe',
    inspectionError: inspection.errorMessage,
  };
  return defaultResult;
}

/**
 * Executes a generateContent call with automatic fallback across candidate models
 * if the primary model returns 404 (model not found / deprecated).
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
  const resolved = await resolveBestModel(cleanKey, userRequested);

  // If inspection specifically reported that the API key has an error or is disabled, throw early
  if (resolved.discoveryMethod === 'fallback_probe' && resolved.inspectionError) {
    throw new Error(`Google AI rechazó la clave: ${resolved.inspectionError}. Asegúrate de crear una clave en https://aistudio.google.com/app/apikey.`);
  }

  // Build candidate list: prioritize userRequested, then resolved model, then candidates
  const candidateList = [
    ...(userRequested && userRequested !== 'auto' ? [userRequested] : []),
    resolved.modelName,
    ...PREFERRED_MODELS,
    ...(resolved.availableModels || []),
  ];

  // Deduplicate candidate list
  const candidates = Array.from(new Set(candidateList.filter(Boolean)));

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

      // Update cache with the working model
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

      // Si la clave no es válida en lo absoluto, no tiene sentido probar más modelos
      const isInvalidKey = errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid');
      if (isInvalidKey) {
        throw err;
      }

      // Failover automático ante:
      // 1) 404 Modelo no encontrado o deprecado
      // 2) 503 / 500 / 502 / 504 Alta demanda temporal ("high demand", "Service Unavailable", "overloaded")
      // 3) 429 Cuota puntual excedida ("RESOURCE_EXHAUSTED", "Too Many Requests")
      const shouldFailover =
        errMsg.includes('404') ||
        errMsg.includes('not found') ||
        errMsg.includes('is not supported for generateContent') ||
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
        console.warn(`[Gemini Failover] Modelo '${modelCandidate}' con error (${errMsg.slice(0, 75)}...), probando siguiente candidato...`);
        continue;
      }

      throw err;
    }
  }

  // Si todos los candidatos fallaron
  const guidance = 'Ningún modelo de Gemini respondió exitosamente. Si fue error 503 ("high demand"), los servidores de Google AI están experimentando un pico de tráfico; puedes cambiar a gemini-2.5-flash o gemini-2.0-flash en Preferencias. Si fue 404, genera una clave en https://aistudio.google.com/app/apikey.';
  throw new Error(`${lastError?.message || 'Modelos no disponibles'} - ${guidance}`);
}
