# MiMesa Scheduler 🌊 | Optimizador de Vida Cotidiana MDP

> **Progressive Web App (PWA)** de optimización de rutina personal y gestión de tiempo multicriterio para Mar del Plata, Argentina. Diseñado para operar 100% dentro de planes gratuitos: **Next.js 14+ en Vercel**, **Supabase (PostgreSQL + Realtime)**, **Google Gemini 1.5 Flash (Google AI Studio)** y **Open-Meteo**.

---

## 🌟 Características Principales

1. **Gestión de Restricciones Duras (Inviolables):**
   - **Candados 🔒:** Cualquier evento puede ser congelado con un clic y jamás será alterado por el optimizador.
   - **Turnos de Souvenirs (Rambla y Ferro):** Gestión de turnos rotativos con 2 semanas de previsibilidad. Commute protegido de 30 min (tiempo de desconexión sin estudio forzado).
   - **Sueño Flotante Adaptativo:** Si sales a la 01:00 AM de Ferro, la app desplaza automáticamente tu descanso a 02:00–10:00 para garantizar 8 horas continuas.
   - **Regla de Sigilo de Cannabis 🌿:** Exige un búfer estricto de 4 horas fuera de casa antes de regresar con los padres.
   - **Autonomía Alimentaria (Batch Cooking 🍳):** Programa al menos 2 sesiones semanales de 2 horas para viandas transportables.
2. **Contactos y Vínculos 100% Dinámicos:**
   - Sin nombres ni reglas hardcodeadas: Matu carga amigos, exparejas o citas con sus metas semanales, color y disponibilidad recurrente (`busy_slots`).
   - Flag de **"Tiene Departamento Propio"**: Permite a la IA planificar actividades bajo techo en su casa en días de lluvia (máx 1x por semana).
3. **Clima Horario de Mar del Plata (Open-Meteo):**
   - Lectura hora a hora de lluvia (`precip_prob > 30%`) y viento costero (`wind_speed > 35 km/h`).
   - Reubicación automática de mateadas y salidas al aire libre a interiores (cafés en Güemes, Paseo Aldrey o departamentos).
4. **Visualizador de Cambios (Diff Viewer) & Modo Fantasma (Ghost View):**
   - Modal interactivo con **Resumen Ejecutivo**, **Auditoría de Reglas**, **Scorecards** y **Tarjetas Antes/Después**.
   - Checkboxes individuales para **aceptación parcial** de cambios.
   - **Ghost View:** Previsualización en el calendario semanal con bordes punteados translúcidos y animación antes de confirmar.
   - Persistencia directa por lotes en Supabase con sincronización Realtime celular/PC.
5. **Acceso Seguro con PIN:**
   - PIN personal (`NEXT_PUBLIC_APP_PASSCODE`, por defecto `1234`) para evitar logins engorrosos.
6. **Soporte PWA Completo:**
   - Web App Manifest nativo (`manifest.json`) y Service Worker para instalar como app nativa en iOS Safari y Android Chrome.

---

## 🚀 Despliegue y Configuración Rápida

### 1. Clonar e Instalar Dependencias
```bash
cd mimesa-scheduler
npm install
```

### 2. Configurar Variables de Entorno (`.env.local`)
Copia `.env.example` a `.env.local`:
```env
# Supabase (Gratis en https://supabase.com)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-supabase-anon-key

# Google AI Studio (Gratis en https://aistudio.google.com)
GEMINI_API_KEY=tu-gemini-api-key

# PIN de acceso personal a la app
NEXT_PUBLIC_APP_PASSCODE=1234
```

> **Nota:** La aplicación incluye un modo offline/local con persistencia inmediata en `localStorage` y optimizador heurístico de alta fidelidad. Si no configuras las claves inmediatamente, puedes probar y utilizar toda la aplicación de manera local sin errores.

### 3. Migración en Supabase
Ejecuta el contenido del archivo [`supabase/schema.sql`](file:///c:/Users/Matu/Documents/Proyectos%20miscelaneos/mimesa-scheduler/supabase/schema.sql) en el **SQL Editor** de tu panel de Supabase.

### 4. Ejecutar en Desarrollo
```bash
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### 5. Compilar para Producción
```bash
npm run build
npm run start
```

---

## 📐 Arquitectura de Código

```
mimesa-scheduler/
├── supabase/
│   └── schema.sql                  # Script SQL DDL con Realtime habilitado
├── public/
│   ├── manifest.json               # Manifest PWA
│   ├── sw.js                       # Service Worker
│   └── icons/                      # Íconos de aplicación (192 y 512)
└── src/
    ├── app/
    │   ├── api/
    │   │   ├── recalculate/route.ts # Serverless Route: Gemini 1.5 Flash + Open-Meteo
    │   │   └── weather/route.ts     # Proxy de clima horario para Mar del Plata
    │   ├── layout.tsx               # Root Layout con PWA meta tags y tema oscuro
    │   ├── page.tsx                 # Página orquestadora de estado y vistas
    │   └── globals.css              # Estilos glassmorphism y animación Ghost View
    ├── components/
    │   ├── CalendarView.tsx         # Calendario semanal con candados y Ghost View
    │   ├── DiffViewerModal.tsx      # Modal comparativo Antes/Después con checks
    │   ├── ContactsManager.tsx      # Módulo dinámico de contactos y franjas ocupadas
    │   ├── WorkShiftsManager.tsx    # Gestor de turnos para Rambla y Ferro
    │   ├── PreferencesModal.tsx     # Sliders de prioridad (0-10) y parámetros
    │   ├── EventModal.tsx           # Modal para crear/editar bloques
    │   ├── WeatherWidget.tsx        # Widget climático de MDP en tiempo real
    │   ├── PasscodeLock.tsx         # Pantalla de bloqueo con PIN
    │   └── Header.tsx               # Barra superior, navegación y botón ⚡ Reconsiderar
    ├── lib/
    │   ├── weather.ts               # Cliente Open-Meteo para MDP (-38.0055, -57.5426)
    │   ├── supabase.ts              # Cliente Supabase
    │   ├── sampleData.ts            # Datos realistas de Matu en Mar del Plata
    │   └── storage.ts               # Capa de datos híbrida (Supabase / LocalStorage)
    └── types/
        ├── database.ts              # Tipos TypeScript de base de datos
        └── optimizer.ts             # Contrato de datos estricto JSON IA ⇄ Frontend
```
