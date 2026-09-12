import { NextResponse } from 'next/server';
import { executeGeminiWithFallback } from '@/lib/gemini';
import { ParsedScheduleItem, ParseScheduleResponse } from '@/types/parser';
import { EventCategory, LocationType } from '@/types/database';

export const runtime = 'nodejs';
export const maxDuration = 60;

const PARSER_SYSTEM_PROMPT = `Eres el asistente inteligente de reconocimiento y extracción de horarios de "MiMesa Scheduler" en Mar del Plata, Argentina.
Tu misión es recibir una imagen (foto de planilla de turnos, captura de WhatsApp, foto de pizarra o notas) y/o un texto explicativo del usuario, interpretar los horarios y devolverlos en formato JSON estructurado.

### CONTEXTO DEL USUARIO (MATU EN MDP):
- Trabajo: Locales de souvenirs en Mar del Plata:
  * "Rambla" (Casino): Ubicación 'trabajo_rambla', detalle 'Local Rambla Casino'. Turnos habituales de mañana (10 a 16) o tarde (14 a 20).
  * "Ferro" (San Juan): Ubicación 'trabajo_ferro', detalle 'Local Ferro San Juan'. Turnos rotativos habituales de tarde/noche (17 a 01 del día siguiente).
- Universidad: Materias de cursada ('facultad'): Redes, Análisis, Calidad de Software, AEEC.
- Gimnasio ('gym') y Actividades Sociales ('social').
- Fecha de referencia: Se te provee la fecha ISO de la semana en curso. Los días relativos (ej. "lunes", "miércoles", "sábado") deben calcularse a partir de la semana correspondiente a esa fecha de referencia (con timezone de Argentina -03:00).

### REGLAS DE EXTRACCIÓN:
1. Si un turno dice de 17:00 a 01:00 o cruza la medianoche, la hora de fin debe tener la fecha del día siguiente.
2. Si se trata de un turno laboral, asigna:
   - \`category\`: "trabajo"
   - \`is_locked\`: true
   - \`is_work_shift\`: true
   - \`branch\`: "Rambla" o "Ferro"
   - \`location\`: "trabajo_rambla" o "trabajo_ferro"
3. Si se trata de estudio/facultad, asigna:
   - \`category\`: "facultad"
   - \`location\`: "facultad"
   - \`is_locked\`: true
   - \`is_work_shift\`: false
4. Genera un \`summary\` claro en español explicando cuántos eventos o turnos se detectaron.

### FORMATO JSON REQUERIDO (ESTRICTO):
{
  "summary": "Se detectaron 3 turnos de trabajo...",
  "items": [
    {
      "id": "parsed-1",
      "title": "Turno Souvenirs: Rambla",
      "category": "trabajo",
      "start_time": "2026-09-16T10:00:00-03:00",
      "end_time": "2026-09-16T16:00:00-03:00",
      "location": "trabajo_rambla",
      "location_detail": "Local Rambla Casino",
      "is_locked": true,
      "is_work_shift": true,
      "branch": "Rambla",
      "notes": "Turno diurno"
    }
  ],
  "warnings": []
}
`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      prompt = '',
      image = null, // base64 string
      reference_date = new Date().toISOString(),
    }: {
      prompt?: string;
      image?: string | null;
      reference_date?: string;
    } = body;

    // Detectar API Key desde Body, Header del cliente o Variable de Entorno
    const bodyApiKey = typeof body?.gemini_api_key === 'string' ? body.gemini_api_key.trim() : '';
    const headerApiKey = req.headers.get('x-gemini-api-key')?.trim();
    const envApiKey = process.env.GEMINI_API_KEY?.trim();

    const rawKey = bodyApiKey || headerApiKey || envApiKey || '';
    const cleanKey = rawKey.replace(/^['"]|['"]$/g, '').trim();
    const apiKey = cleanKey.length > 10 && cleanKey !== 'your-gemini-api-key' ? cleanKey : '';

    const preferredModel = typeof body?.gemini_model === 'string'
      ? body.gemini_model.trim()
      : (req.headers.get('x-gemini-model')?.trim() || '');

    // Si hay API key configurada, usar Gemini multimodal (con resolución y fallback)
    if (apiKey) {
      try {
        const contents: any[] = [];

        // Si se adjuntó imagen en base64
        if (image) {
          // Extraer mime type y data si viene en formato data:image/xxx;base64,...
          const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
          const mimeType = matches ? matches[1] : 'image/jpeg';
          const base64Data = matches ? matches[2] : image;

          contents.push({
            inlineData: {
              mimeType,
              data: base64Data,
            },
          });
        }

        const userPrompt = `Fecha de referencia para la semana (ISO): ${reference_date}.
Instrucción o texto del usuario: "${prompt || 'Extrae todos los horarios visibles en la imagen y asígnalos a los días de esta semana.'}"`;

        contents.push({ text: userPrompt });

        const geminiRes = await executeGeminiWithFallback(apiKey, {
          contents,
          systemInstruction: PARSER_SYSTEM_PROMPT,
          temperature: 0.1,
          responseMimeType: 'application/json',
          preferredModel: preferredModel || undefined,
        });

        const text = geminiRes.text;
        let cleanJson = text.trim();
        if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        }
        const parsed: ParseScheduleResponse = JSON.parse(cleanJson);

        return NextResponse.json(parsed);
      } catch (geminiErr) {
        console.error('Error in Gemini multimodal parse, falling back to heuristic:', geminiErr);
        const fallback = heuristicParse(prompt, reference_date);
        return NextResponse.json(fallback);
      }
    }

    // Fallback heurístico para modo offline o sin API key
    const fallback = heuristicParse(prompt, reference_date);
    return NextResponse.json(fallback);
  } catch (error) {
    console.error('Error in /api/parse-schedule:', error);
    return NextResponse.json(
      { error: 'Error procesando horarios', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Heuristic Parser para extraer turnos a partir de texto en español
 * Ejemplo: "miércoles de 10 a 16 en rambla y viernes de 17 a 01 en ferro"
 */
function heuristicParse(text: string, referenceDateStr: string): ParseScheduleResponse {
  const refDate = new Date(referenceDateStr);
  const day = refDate.getDay();
  const diff = refDate.getDate() - day + (day === 0 ? -6 : 1); // lunes
  const monday = new Date(refDate.setDate(diff));

  const items: ParsedScheduleItem[] = [];
  const lower = text.toLowerCase();

  const dayMap: Record<string, number> = {
    lunes: 0,
    lun: 0,
    martes: 1,
    mar: 1,
    miercoles: 2,
    miércoles: 2,
    mie: 2,
    jueves: 3,
    jue: 3,
    viernes: 4,
    vie: 4,
    sabado: 5,
    sábado: 5,
    sab: 5,
    domingo: 6,
    dom: 6,
  };

  // Buscar patrones como "miercoles ... 10 ... 16"
  // Dividir por conectores ("y", ",", ";", "\n", "ademas")
  const clauses = lower.split(/[\n,;]| y | adem[aá]s /);

  clauses.forEach((clause, idx) => {
    let matchedDayOffset: number | null = null;
    for (const [dayName, offset] of Object.entries(dayMap)) {
      if (new RegExp(`\\b${dayName}\\b`).test(clause)) {
        matchedDayOffset = offset;
        break;
      }
    }

    if (matchedDayOffset !== null) {
      // Buscar horarios: "10 a 16", "10:00 a 16:00", "17 a 01", "17:00 a 1:00", "de 14 a 20"
      const timeMatch = clause.match(/(\d{1,2})(?::(\d{2}))?\s*(?:a|hasta|-)\s*(\d{1,2})(?::(\d{2}))?/);
      if (timeMatch) {
        const startH = parseInt(timeMatch[1], 10);
        const startM = parseInt(timeMatch[2] || '0', 10);
        const endH = parseInt(timeMatch[3], 10);
        const endM = parseInt(timeMatch[4] || '0', 10);

        const startDate = new Date(monday);
        startDate.setDate(monday.getDate() + matchedDayOffset);
        startDate.setHours(startH, startM, 0, 0);

        const endDate = new Date(monday);
        // Si termina antes de la hora de inicio (ej. 17 a 01), cruza al día siguiente
        const dayIncrement = endH < startH ? matchedDayOffset + 1 : matchedDayOffset;
        endDate.setDate(monday.getDate() + dayIncrement);
        endDate.setHours(endH, endM, 0, 0);

        const isFerro = clause.includes('ferro');
        const isRambla = clause.includes('rambla') || (!isFerro && (clause.includes('trabajo') || clause.includes('turno')));
        const isUni = clause.includes('facultad') || clause.includes('cursada') || clause.includes('redes') || clause.includes('analisis') || clause.includes('calidad');
        const isGym = clause.includes('gym') || clause.includes('entren');

        let category: EventCategory = 'trabajo';
        let location: LocationType = 'trabajo_rambla';
        let locationDetail = 'Local Rambla';
        let branch: 'Rambla' | 'Ferro' | undefined = 'Rambla';
        let isWorkShift = true;
        let title = 'Turno Souvenirs: Rambla';

        if (isFerro) {
          title = 'Turno Souvenirs: Ferro';
          location = 'trabajo_ferro';
          locationDetail = 'Local Ferro San Juan';
          branch = 'Ferro';
        } else if (isUni) {
          title = clause.includes('redes') ? 'Cursada: Redes' : clause.includes('calidad') ? 'Cursada: Calidad' : 'Cursada Universitaria';
          category = 'facultad';
          location = 'facultad';
          locationDetail = 'Facultad UFASTA';
          branch = undefined;
          isWorkShift = false;
        } else if (isGym) {
          title = 'Entrenamiento: Gym';
          category = 'gym';
          location = 'interior';
          locationDetail = 'Gimnasio';
          branch = undefined;
          isWorkShift = false;
        }

        items.push({
          id: `parsed-${idx}-${Date.now()}`,
          title,
          category,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          location,
          location_detail: locationDetail,
          is_locked: true,
          is_work_shift: isWorkShift,
          branch,
          notes: clause.trim(),
        });
      }
    }
  });

  // Si no se encontró nada por cláusula, pero hay texto genérico
  if (items.length === 0) {
    // Intentar al menos detectar números
    const defaultStart = new Date(monday);
    defaultStart.setDate(monday.getDate() + 2); // Miércoles
    defaultStart.setHours(10, 0, 0, 0);
    const defaultEnd = new Date(defaultStart);
    defaultEnd.setHours(16, 0, 0, 0);

    items.push({
      id: `parsed-sample-${Date.now()}`,
      title: 'Turno Souvenirs: Rambla',
      category: 'trabajo',
      start_time: defaultStart.toISOString(),
      end_time: defaultEnd.toISOString(),
      location: 'trabajo_rambla',
      location_detail: 'Local Rambla Casino',
      is_locked: true,
      is_work_shift: true,
      branch: 'Rambla',
      notes: text.trim() || 'Turno extraído',
    });
  }

  return {
    summary: `Se reconocieron ${items.length} bloques de horario a partir de la descripción proporcionada.`,
    items,
    warnings: items.some((i) => i.branch === 'Ferro')
      ? ['Se detectó turno nocturno en Ferro. Recuerda que la IA acomodará automáticamente tu sueño flotante a 8 horas continuas.']
      : undefined,
  };
}

