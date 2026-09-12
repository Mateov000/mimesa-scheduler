-- ==============================================================================
-- MiMesa Scheduler - Esquema de Base de Datos Supabase (PostgreSQL 15+)
-- ==============================================================================

-- 1. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Enumerados
DO $$ BEGIN
  CREATE TYPE event_category AS ENUM (
    'facultad',
    'trabajo',
    'batch_cooking',
    'sueno',
    'social',
    'citas',
    'gym',
    'ocio',
    'commute'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE location_type AS ENUM (
    'casa',
    'exterior',
    'interior',
    'depto_contacto',
    'facultad',
    'trabajo_rambla',
    'trabajo_ferro'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Tabla de Contactos (Totalmente configurable por el usuario)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  relationship TEXT, -- 'ex', 'amigo', 'cita', 'familia'
  target_hours_week NUMERIC(4,1) DEFAULT 0,
  max_weekly_occurrences INT DEFAULT 99,
  has_own_apartment BOOLEAN DEFAULT FALSE,
  color_code TEXT DEFAULT '#3B82F6',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Horarios Ocupados de los Contactos (Ventanas no disponibles)
CREATE TABLE IF NOT EXISTS contact_busy_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Domingo, 1=Lunes, etc.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Tabla de Eventos / Bloques de Calendario
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  category event_category NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  location location_type NOT NULL DEFAULT 'casa',
  location_detail TEXT, -- Ej: 'Café Güemes', 'Playa Varese'
  notes TEXT,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  cannabis_consumed BOOLEAN NOT NULL DEFAULT FALSE,
  weather_dependent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Tabla de Turnos Laborales Asignados (Previsibilidad de 2 semanas)
CREATE TABLE IF NOT EXISTS work_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch TEXT NOT NULL CHECK (branch IN ('Rambla', 'Ferro')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_confirmed BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Ponderaciones del Usuario (Sliders 0-10) y Preferencias Globales
CREATE TABLE IF NOT EXISTS user_preferences (
  id INT PRIMARY KEY DEFAULT 1,
  weight_sleep INT NOT NULL DEFAULT 9 CHECK (weight_sleep BETWEEN 0 AND 10),
  weight_study INT NOT NULL DEFAULT 8 CHECK (weight_study BETWEEN 0 AND 10),
  weight_social INT NOT NULL DEFAULT 7 CHECK (weight_social BETWEEN 0 AND 10),
  weight_gym INT NOT NULL DEFAULT 6 CHECK (weight_gym BETWEEN 0 AND 10),
  cannabis_buffer_hours NUMERIC(3,1) NOT NULL DEFAULT 4.0,
  commute_duration_minutes INT NOT NULL DEFAULT 30,
  target_sleep_hours NUMERIC(3,1) NOT NULL DEFAULT 8.0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- 8. Datos Iniciales por defecto
INSERT INTO user_preferences (id, weight_sleep, weight_study, weight_social, weight_gym)
VALUES (1, 9, 8, 7, 6)
ON CONFLICT (id) DO NOTHING;

-- Habilitar Realtime en eventos
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE events;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

