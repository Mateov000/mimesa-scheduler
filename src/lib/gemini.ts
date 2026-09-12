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
}

export const PREFERRED_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-002',
  'gemini-1.5-flash-001',
  'gemini-1.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-8b',
  'gemini-2.5-flash',
  'gemini-2.0-flash-exp',
  'gemini-1.5-pro',
  'gemini-1.5-pro-latest',
  'gemini-pro',
];

// Cache model discovery per API key to minimize network requests (15 min TTL)
const resolutionCache = new Map<string, { result: ModelResolutionResult; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Queries Google Generative Language API's ListModels endpoint to see exactly
 * which models this specific API key is authorized to use for generateContent.
 */
export async function listAvailableModels(apiKey: string): Promise<DiscoveredGeminiModel[]> {
  const cleanKey = apiKey.replace(/^['"]|['"]$/g, '').trim();
  const versions: ('v1beta' | 'v1')[] = ['v1beta', 'v1'];
  const allDiscovered: DiscoveredGeminiModel[] = [];
  const seen = new Set<string>();

  for (const apiVer of versions) {
    try {
      const url = `https://generativelanguage.googleapis.com/${apiVer}/models?key=${cleanKey}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        console.warn(`[Gemini ListModels ${apiVer}] HTTP ${res.status}:`, errJson?.error?.message || res.statusText);
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
      console.warn(`[Gemini ListModels ${apiVer}] Error fetching models:`, err?.message || err);
    }
  }

  return allDiscovered;
}

/**
 * Resolves the best supported model for the given API key.
 * If ListModels works, picks the best available model.
 * If ListModels fails, falls back to the priority candidate list.
 */
export async function resolveBestModel(apiKey: string): Promise<ModelResolutionResult> {
  const cleanKey = apiKey.replace(/^['"]|['"]$/g, '').trim();
  const cached = resolutionCache.get(cleanKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  const discovered = await listAvailableModels(cleanKey);
  const discoveredNames = discovered.map(m => m.name);

  if (discovered.length > 0) {
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

  // If ListModels returned no models or failed, default to modern gemini-2.0-flash with fallback list
  const defaultResult: ModelResolutionResult = {
    modelName: 'gemini-2.0-flash',
    apiVersion: 'v1beta',
    availableModels: PREFERRED_MODELS.slice(0, 5),
    discoveryMethod: 'fallback_probe',
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
  }
): Promise<{
  text: string;
  modelUsed: string;
  latencyMs: number;
  availableModels: string[];
}> {
  const cleanKey = apiKey.replace(/^['"]|['"]$/g, '').trim();
  const resolved = await resolveBestModel(cleanKey);

  // Build candidate list starting with the resolved model
  const candidates = [
    resolved.modelName,
    ...PREFERRED_MODELS.filter(m => m !== resolved.modelName),
  ];

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

      // If we used a fallback that worked, update cache with the working model
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
      // Only continue to next candidate if it's a 404 / model not found error
      const isNotFound = errMsg.includes('404') ||
        errMsg.includes('not found') ||
        errMsg.includes('is not supported for generateContent');

      if (!isNotFound) {
        // If it's an authentication, quota, or network error, rethrow immediately
        throw err;
      }
      console.warn(`[Gemini Fallback] Model '${modelCandidate}' failed with 404, trying next candidate...`);
    }
  }

  throw lastError || new Error('No compatible Gemini model found for this API key.');
}
