import { NextResponse } from 'next/server';
import { fetchMDPWeatherForecast } from '@/lib/weather';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const slots = await fetchMDPWeatherForecast();
    return NextResponse.json({
      city: 'Mar del Plata, Argentina',
      latitude: -38.0055,
      longitude: -57.5426,
      slots,
    });
  } catch (error) {
    console.error('Error fetching weather in /api/weather:', error);
    return NextResponse.json(
      { error: 'Error obteniendo pronóstico meteorológico de MDP' },
      { status: 500 }
    );
  }
}

