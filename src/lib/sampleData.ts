import { Contact, ContactBusySlot, Event, UserPreferences, WorkShift } from '@/types/database';

export const INITIAL_PREFERENCES: UserPreferences = {
  id: 1,
  weight_sleep: 9,
  weight_study: 8,
  weight_social: 7,
  weight_gym: 6,
  cannabis_buffer_hours: 4.0,
  commute_duration_minutes: 30,
  target_sleep_hours: 8.0,
};

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'c-juancito',
    name: 'Juancito',
    relationship: 'amigo',
    target_hours_week: 6.0,
    max_weekly_occurrences: 3,
    has_own_apartment: false,
    color_code: '#3B82F6', // Blue
    notes: 'Compañero de la vida, le gusta el café en Güemes y salir a caminar por Varese.',
  },
  {
    id: 'c-sofi',
    name: 'Sofi (Ex)',
    relationship: 'ex',
    target_hours_week: 4.0,
    max_weekly_occurrences: 1,
    has_own_apartment: true,
    color_code: '#EC4899', // Pink
    notes: 'Depto céntrico disponible para resguardo de lluvia (máximo 1 vez por semana).',
  },
  {
    id: 'c-nico',
    name: 'Nico',
    relationship: 'amigo',
    target_hours_week: 5.0,
    max_weekly_occurrences: 3,
    has_own_apartment: false,
    color_code: '#10B981', // Emerald
    notes: 'Compañero de gym y estudio de Calidad de Software.',
  },
];

export const INITIAL_BUSY_SLOTS: ContactBusySlot[] = [
  // Juancito trabaja Lun a Vie 09:00 a 18:00
  { id: 'bs-j-1', contact_id: 'c-juancito', day_of_week: 1, start_time: '09:00', end_time: '18:00', description: 'Trabajo' },
  { id: 'bs-j-2', contact_id: 'c-juancito', day_of_week: 2, start_time: '09:00', end_time: '18:00', description: 'Trabajo' },
  { id: 'bs-j-3', contact_id: 'c-juancito', day_of_week: 3, start_time: '09:00', end_time: '18:00', description: 'Trabajo' },
  { id: 'bs-j-4', contact_id: 'c-juancito', day_of_week: 4, start_time: '09:00', end_time: '18:00', description: 'Trabajo' },
  { id: 'bs-j-5', contact_id: 'c-juancito', day_of_week: 5, start_time: '09:00', end_time: '18:00', description: 'Trabajo' },
  // Sofi cursa Lun y Mié 08:00 a 13:00
  { id: 'bs-s-1', contact_id: 'c-sofi', day_of_week: 1, start_time: '08:00', end_time: '13:00', description: 'Facultad' },
  { id: 'bs-s-2', contact_id: 'c-sofi', day_of_week: 3, start_time: '08:00', end_time: '13:00', description: 'Facultad' },
  // Nico cursa Mar y Jue 14:00 a 20:00
  { id: 'bs-n-1', contact_id: 'c-nico', day_of_week: 2, start_time: '14:00', end_time: '20:00', description: 'Facultad' },
  { id: 'bs-n-2', contact_id: 'c-nico', day_of_week: 4, start_time: '14:00', end_time: '20:00', description: 'Facultad' },
];

export function getInitialWorkShifts(baseDate: Date): WorkShift[] {
  // Lunes a Domingo de la semana seleccionada
  const d = new Date(baseDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // lunes
  const monday = new Date(d.setDate(diff));

  const shifts: WorkShift[] = [];

  // Miércoles: Turno Rambla 10:00 - 16:00
  const wed = new Date(monday);
  wed.setDate(monday.getDate() + 2);
  const wedStart = new Date(wed);
  wedStart.setHours(10, 0, 0, 0);
  const wedEnd = new Date(wed);
  wedEnd.setHours(16, 0, 0, 0);
  shifts.push({
    id: 'ws-1',
    branch: 'Rambla',
    start_time: wedStart.toISOString(),
    end_time: wedEnd.toISOString(),
    is_confirmed: true,
    notes: 'Cubriendo a Martín en souvenirs Rambla',
  });

  // Viernes a Sábado: Turno Ferro nocturno 17:00 - 01:00
  const fri = new Date(monday);
  fri.setDate(monday.getDate() + 4);
  const friStart = new Date(fri);
  friStart.setHours(17, 0, 0, 0);
  const satEnd = new Date(fri);
  satEnd.setDate(fri.getDate() + 1);
  satEnd.setHours(1, 0, 0, 0);
  shifts.push({
    id: 'ws-2',
    branch: 'Ferro',
    start_time: friStart.toISOString(),
    end_time: satEnd.toISOString(),
    is_confirmed: true,
    notes: 'Turno tarde/noche Ferro con alta rotación de clientes',
  });

  return shifts;
}

export function getInitialEvents(baseDate: Date): Event[] {
  const d = new Date(baseDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // lunes
  const monday = new Date(d.setDate(diff));

  const events: Event[] = [];

  const addEvent = (
    dayOffset: number,
    startH: number,
    startM: number,
    endH: number,
    endM: number,
    title: string,
    category: Event['category'],
    location: Event['location'],
    locationDetail: string,
    isLocked: boolean,
    cannabis: boolean = false,
    contactId: string | null = null,
    weatherDep: boolean = false,
    notes: string = ''
  ) => {
    const start = new Date(monday);
    start.setDate(monday.getDate() + dayOffset);
    start.setHours(startH, startM, 0, 0);

    const end = new Date(monday);
    end.setDate(monday.getDate() + dayOffset + (endH < startH ? 1 : 0));
    end.setHours(endH, endM, 0, 0);

    events.push({
      id: `ev-${dayOffset}-${startH}-${category}`,
      title,
      category,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      is_locked: isLocked,
      location,
      location_detail: locationDetail,
      cannabis_consumed: cannabis,
      contact_id: contactId,
      weather_dependent: weatherDep,
      notes,
    });
  };

  // Cursadas Universidad (Inviolables con candado)
  // Lunes: Redes 08:30 - 12:30 (Facultad)
  addEvent(0, 8, 30, 12, 30, 'Cursada: Redes de Información', 'facultad', 'facultad', 'Aula 104 - FI UFASTA', true);
  // Martes: Calidad de Software 14:00 - 17:30
  addEvent(1, 14, 0, 17, 30, 'Cursada: Calidad de Software', 'facultad', 'facultad', 'Laboratorio 2', true);
  // Jueves: Análisis Matemático 09:00 - 13:00
  addEvent(3, 9, 0, 13, 0, 'Cursada: Análisis Matemático', 'facultad', 'facultad', 'Aula Magna', true);

  // Turnos laborales confirmados (candado)
  // Miércoles: Trabajo Rambla 10:00 - 16:00
  addEvent(2, 9, 30, 10, 0, 'Commute hacia Rambla', 'commute', 'exterior', 'Viaje en colectivo / playlist', true);
  addEvent(2, 10, 0, 16, 0, 'Turno Souvenirs: Rambla', 'trabajo', 'trabajo_rambla', 'Local Rambla Casino', true);
  addEvent(2, 16, 0, 16, 30, 'Commute desde Rambla', 'commute', 'exterior', 'Viaje regreso / podcast', true);

  // Viernes: Turno Ferro 17:00 - 01:00 (Sábado)
  addEvent(4, 16, 30, 17, 0, 'Commute hacia Ferro', 'commute', 'exterior', 'Música relax', true);
  addEvent(4, 17, 0, 1, 0, 'Turno Souvenirs: Ferro', 'trabajo', 'trabajo_ferro', 'Local Ferro San Juan', true);
  addEvent(4, 1, 0, 1, 30, 'Commute regreso nocturno Ferro', 'commute', 'exterior', 'Regreso en remis/bondi', true);

  // Sueño flotante post-Ferro (Sábado 02:00 - 10:00)
  addEvent(5, 2, 0, 10, 0, 'Sueño Reparador (Post-Ferro 8h)', 'sueno', 'casa', 'Mi cuarto', false);

  // Batch Cooking #1 (Jueves por la mañana post-cursada o tarde)
  addEvent(3, 15, 0, 17, 30, 'Batch Cooking #1 (Viandas semana)', 'batch_cooking', 'casa', 'Cocina de casa', false, false, null, false, 'Cocinar arroz integral, pollo y verduras al horno');

  // Batch Cooking #2 (Domingo)
  addEvent(6, 11, 0, 13, 30, 'Batch Cooking #2 (Cierre semana)', 'batch_cooking', 'casa', 'Cocina de casa', false, false, null, false, 'Tartas y ensaladas transportables');

  // Actividades sociales y recreativas (flexibles para optimizar)
  // Sábado: Mateada en Playa Grande con Juancito (exterior, dependiente de clima)
  addEvent(5, 15, 0, 18, 0, 'Mateada costera con Juancito', 'social', 'exterior', 'Playa Grande', false, false, 'c-juancito', true);

  // Domingo: Ocio / Caminata Varese con cannabis (requiere búfer 4h antes de casa)
  addEvent(6, 16, 0, 18, 0, 'Paseo Varese y relax', 'ocio', 'exterior', 'Paseo Jesús de Galíndez', false, true, null, true, 'Atardecer frente al mar');
  // Tiempo de búfer 4h fuera de casa antes de regresar a casa de los padres
  addEvent(6, 18, 0, 20, 30, 'Café y lectura en Güemes (Búfer sigilo)', 'ocio', 'interior', 'Café en Güemes', false, false, null, false, 'Completar búfer de 4h fuera de casa');

  // Gym
  addEvent(0, 18, 0, 19, 30, 'Entrenamiento: Fuerza Torso', 'gym', 'interior', 'Gym Güemes', false);
  addEvent(2, 18, 0, 19, 30, 'Entrenamiento: Piernas', 'gym', 'interior', 'Gym Güemes', false);

  // Estudio continuo
  addEvent(1, 9, 30, 12, 30, 'Estudio: Redes y Análisis', 'facultad', 'casa', 'Escritorio', false);
  addEvent(3, 18, 0, 20, 30, 'Estudio: Calidad de Software', 'facultad', 'casa', 'Escritorio', false);

  return events;
}

