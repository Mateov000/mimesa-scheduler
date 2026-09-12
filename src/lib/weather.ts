export interface HourlyWeatherSlot {
  time: string; // ISO or YYYY-MM-DDTHH:00
  temperature: number; // °C
  precipitation_probability: number; // %
  weathercode: number;
  windspeed: number; // km/h
  is_adverse: boolean; // rain > 30% or wind > 35 km/h
  condition: string;
  icon: string;
}

export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weathercode: number[];
    windspeed_10m: number[];
  };
}

const MDP_WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=-38.0055&longitude=-57.5426&hourly=temperature_2m,precipitation_probability,weathercode,windspeed_10m&timezone=America%2FArgentina%2FBuenos_Aires';

let cachedForecast: { data: HourlyWeatherSlot[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos

export function interpretWeatherCode(code: number, rainProb: number, windSpeed: number): { condition: string; icon: string } {
  if (windSpeed > 35) {
    return { condition: `Viento fuerte (${Math.round(windSpeed)} km/h)`, icon: 'wind' };
  }
  if (rainProb > 40 || (code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return { condition: `Lluvia (${rainProb}%)`, icon: 'cloud-rain' };
  }
  if (code >= 95) {
    return { condition: 'Tormenta', icon: 'cloud-lightning' };
  }
  if (code === 0) {
    return { condition: 'Despejado / Soleado', icon: 'sun' };
  }
  if (code === 1 || code === 2) {
    return { condition: 'Algo nublado', icon: 'cloud-sun' };
  }
  if (code === 3) {
    return { condition: 'Nublado', icon: 'cloud' };
  }
  if (code >= 45 && code <= 48) {
    return { condition: 'Neblina costera', icon: 'cloud-fog' };
  }
  return { condition: 'Templado', icon: 'thermometer' };
}

export async function fetchMDPWeatherForecast(): Promise<HourlyWeatherSlot[]> {
  const now = Date.now();
  if (cachedForecast && now - cachedForecast.timestamp < CACHE_TTL_MS) {
    return cachedForecast.data;
  }

  try {
    const res = await fetch(MDP_WEATHER_URL, {
      next: { revalidate: 900 }, // 15 mins
    });
    if (!res.ok) {
      throw new Error(`Open-Meteo HTTP error ${res.status}`);
    }
    const data: OpenMeteoResponse = await res.json();
    const slots: HourlyWeatherSlot[] = [];

    for (let i = 0; i < data.hourly.time.length; i++) {
      const time = data.hourly.time[i];
      const temp = data.hourly.temperature_2m[i];
      const rain = data.hourly.precipitation_probability[i] ?? 0;
      const wind = data.hourly.windspeed_10m[i] ?? 0;
      const code = data.hourly.weathercode[i] ?? 0;
      const isAdverse = rain > 30 || wind > 35;
      const { condition, icon } = interpretWeatherCode(code, rain, wind);

      slots.push({
        time,
        temperature: temp,
        precipitation_probability: rain,
        weathercode: code,
        windspeed: wind,
        is_adverse: isAdverse,
        condition,
        icon,
      });
    }

    cachedForecast = { data: slots, timestamp: now };
    return slots;
  } catch (error) {
    console.error('Error fetching MDP weather from Open-Meteo:', error);
    // Fallback con datos típicos de MDP
    return generateFallbackMDPWeather();
  }
}

export function findSlotForTime(slots: HourlyWeatherSlot[], targetTimeIso: string): HourlyWeatherSlot | null {
  if (!slots.length) return null;
  const targetDate = new Date(targetTimeIso);
  const targetYear = targetDate.getFullYear();
  const targetMonth = String(targetDate.getMonth() + 1).padStart(2, '0');
  const targetDay = String(targetDate.getDate()).padStart(2, '0');
  const targetHour = String(targetDate.getHours()).padStart(2, '0');
  const matchKey = `${targetYear}-${targetMonth}-${targetDay}T${targetHour}:00`;

  const found = slots.find((s) => s.time.startsWith(matchKey));
  return found || slots[0] || null;
}

export function generateMDPWeatherSummaryForAI(slots: HourlyWeatherSlot[]): string {
  if (!slots.length) return 'Sin datos climáticos disponibles.';
  // Resumen representativo de bloques horarios con lluvia o viento fuerte
  const adverseEvents: string[] = [];
  const sunnyDays: string[] = [];

  slots.forEach((s) => {
    const hour = parseInt(s.time.split('T')[1]?.slice(0, 2) || '0', 10);
    // Filtrar entre 08:00 y 23:00 para no sobrecargar
    if (hour >= 8 && hour <= 23) {
      if (s.precipitation_probability > 30) {
        adverseEvents.push(`${s.time}: Lluvia ${s.precipitation_probability}%, viento ${s.windspeed}km/h (Riesgo exterior -> usar interior/depto)`);
      } else if (s.windspeed > 35) {
        adverseEvents.push(`${s.time}: Viento muy fuerte ${s.windspeed}km/h (Riesgo exterior)`);
      } else if (s.precipitation_probability <= 15 && s.temperature >= 18 && s.windspeed <= 25) {
        if (hour === 14 || hour === 16) {
          sunnyDays.push(`${s.time}: Soleado ${s.temperature}°C, viento suave ${s.windspeed}km/h (Excelente para Playa Grande, Varese o Parque)`);
        }
      }
    }
  });

  return `
PRONÓSTICO METEOROLÓGICO HORARIO MAR DEL PLATA (Open-Meteo):
- Alertas de mal tiempo (lluvia > 30% o viento > 35 km/h):
${adverseEvents.slice(0, 8).map((a) => `  * ${a}`).join('\n') || '  * No se prevén lluvias severas en la ventana.'}
- Ventanas de buen tiempo al aire libre:
${sunnyDays.slice(0, 5).map((s) => `  * ${s}`).join('\n') || '  * Clima templado de costa estándar.'}
`;
}

function generateFallbackMDPWeather(): HourlyWeatherSlot[] {
  const slots: HourlyWeatherSlot[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  for (let i = 0; i < 168; i++) {
    const d = new Date(start.getTime() + i * 3600 * 1000);
    const iso = d.toISOString().slice(0, 16);
    const hour = d.getHours();
    const isAfternoonRain = d.getDay() === 0 && hour >= 16 && hour <= 19; // lluvia domingo tarde
    const rain = isAfternoonRain ? 65 : 10;
    const wind = isAfternoonRain ? 32 : 18;
    const temp = hour >= 12 && hour <= 16 ? 20 : 12;
    slots.push({
      time: iso,
      temperature: temp,
      precipitation_probability: rain,
      weathercode: isAfternoonRain ? 61 : 1,
      windspeed: wind,
      is_adverse: rain > 30 || wind > 35,
      condition: isAfternoonRain ? 'Lluvia probable' : 'Parcialmente nublado',
      icon: isAfternoonRain ? 'cloud-rain' : 'cloud-sun',
    });
  }
  return slots;
}

