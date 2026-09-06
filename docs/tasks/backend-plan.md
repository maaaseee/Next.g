# Plan de Implementación: Backend (NEXT.g API)

## 1. Visión General
Este documento desglosa paso a paso la construcción del backend de **NEXT.g** según lo definido en [`docs/spec-backend.md`](file:///C:/Users/maxe1/Documents/Repos/Spring%20projects%20on%20Github/Game%20Backlog/docs/spec-backend.md). El objetivo es crear una API modular, segura y de alto rendimiento utilizando **Bun + ElysiaJS + SQLite (`bun:sqlite`) + IGDB Proxy**, dividida en unidades de trabajo pequeñas y verificables.

---

## 2. Decisiones de Arquitectura y Dependencias

```
[ Variables de Entorno (.env / env.ts) ]
                   │
                   ▼
     [ Capa de Base de Datos (bun:sqlite + WAL) ]
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
[ Servicio Twitch OAuth ]  [ Servicio de Catálogo ]
         │                 (Games CRUD & Transactions)
         ▼                   │
 [ Servicio Proxy IGDB ]     │
         │                   │
         └─────────┬─────────┘
                   ▼
    [ Controladores Elysia + TypeBox ]
                   │
                   ▼
  [ Servidor Elysia + CORS + Error Handling ]
```

- **Runtime & DB nativo:** Se utiliza Bun y su módulo nativo `bun:sqlite` sin librerías pesadas para máxima velocidad y simplicidad.
- **Cache en memoria para Twitch OAuth:** El token de Twitch se cachea en memoria y se renueva automáticamente con 60s de buffer antes de su expiración, protegiendo las cuotas de red.
- **Transaccionalidad atómica:** El guardado de un juego usa transacciones SQLite (`db.transaction`) para mantener sincronizadas las tablas `games` y `user_games`.

---

## 3. Desglose de Fases y Tareas

### Fase 1: Infraestructura Base y Base de Datos

#### Tarea 1.1: Inicialización del Proyecto Backend y Configuración de Entorno
- **Descripción:** Crear el directorio `backend/`, inicializar `package.json`, `tsconfig.json`, instalar dependencias core (`elysia`, `@elysiajs/cors`, `@sinclair/typebox`) y configurar el módulo de variables de entorno con fallback seguro y `.env.example`.
- **Criterios de Aceptación:**
  - `backend/package.json` y `backend/tsconfig.json` configurados para Bun y TypeScript estricto.
  - `src/config/env.ts` valida y exporta `PORT`, `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`.
  - `.env.example` documenta todas las variables requeridas.
- **Verificación:**
  - `bun install` se ejecuta sin errores.
  - `bunx tsc --noEmit` pasa en verde.
- **Dependencias:** Ninguna.
- **Archivos afectados:**
  - `backend/package.json`
  - `backend/tsconfig.json`
  - `backend/.env.example`
  - `backend/src/config/env.ts`
  - `backend/src/config/constants.ts`
- **Scope:** **S** (1-2 archivos de config + 2 fuentes).

---

#### Tarea 1.2: Capa de Base de Datos y Esquema SQLite (`bun:sqlite`)
- **Descripción:** Implementar la conexión singleton a SQLite con modo WAL habilitado y la ejecución automática del script DDL (`schema.sql`) para crear las tablas `games` y `user_games` con sus claves foráneas e índices.
- **Criterios de Aceptación:**
  - `src/db/index.ts` inicializa la base de datos en `data/nextg.db` (o `:memory:` en modo test).
  - Crea las tablas `games` y `user_games` si no existen con `PRAGMA journal_mode = WAL` y `PRAGMA foreign_keys = ON`.
- **Verificación:**
  - Test en `tests/db.test.ts` verifica la creación de tablas, inserción y restricción de clave foránea.
- **Dependencias:** Tarea 1.1.
- **Archivos afectados:**
  - `backend/src/db/schema.sql`
  - `backend/src/db/index.ts`
  - `backend/tests/db.test.ts`
- **Scope:** **S** (2 archivos fuentes + 1 test).

---

### 🛡️ Checkpoint 1: Base de Datos y Entorno
- [ ] Dependencias instaladas y compilación limpia con `bunx tsc --noEmit`.
- [ ] Tests de base de datos pasando con `bun test tests/db.test.ts`.

---

### Fase 2: Servicios de Autenticación, IGDB y Catálogo

#### Tarea 2.1: Servicio de Autenticación Twitch OAuth con Caché
- **Descripción:** Crear `TwitchAuthService` para solicitar tokens OAuth2 tipo `client_credentials` a Twitch (`https://id.twitch.tv/oauth2/token`). Almacena el `access_token` y `expires_at` en memoria y renueva el token solo cuando falten menos de 60 segundos para vencer.
- **Criterios de Aceptación:**
  - Solicita token exitosamente con Client ID y Secret.
  - Reutiliza el token si aún es válido sin hacer llamadas HTTP repetidas.
  - Renueva automáticamente si el token expiró.
- **Verificación:**
  - Test unitario con mock de fetch en `tests/twitch-auth.test.ts` valida el reuso y la expiración.
- **Dependencias:** Tarea 1.1.
- **Archivos afectados:**
  - `backend/src/services/twitch-auth.service.ts`
  - `backend/tests/twitch-auth.test.ts`
- **Scope:** **S** (1 servicio + 1 test).

---

#### Tarea 2.2: Servicio Proxy de Búsqueda IGDB
- **Descripción:** Implementar `IgdbService` que consume el endpoint `/v4/games` de IGDB inyectando el token de Twitch y headers requeridos (`Client-ID`, `Authorization: Bearer <token>`). Realiza búsqueda difusa con query de texto, filtra campos relevantes y normaliza las URLs de carátulas a alta resolución (`t_cover_big`).
- **Criterios de Aceptación:**
  - Construye la query en sintaxis IGDB (`search "query"; fields id, name, cover.image_id, first_release_date; limit 15;`).
  - Mapea el resultado a la estructura normalizada `{ id, title, cover_url, release_year }`.
  - Si no hay portada, asigna `cover_url: null` de forma segura sin romper la respuesta.
- **Verificación:**
  - Tests en `tests/igdb.test.ts` validan el parseo y formateo correcto de respuestas simuladas de IGDB.
- **Dependencias:** Tarea 2.1.
- **Archivos afectados:**
  - `backend/src/services/igdb.service.ts`
  - `backend/tests/igdb.test.ts`
- **Scope:** **S** (1 servicio + 1 test).

---

#### Tarea 2.3: Servicio de Gestión de Catálogo y Estados (`GamesService`)
- **Descripción:** Implementar `GamesService` con las operaciones CRUD para el catálogo del usuario:
  - `getAll(status?)`: Listar juegos del usuario (con filtro opcional).
  - `upsertGame(game)`: Transacción que guarda/actualiza `games` y `user_games`.
  - `deleteGame(id)`: Elimina de `user_games`.
- **Criterios de Aceptación:**
  - `upsertGame` realiza la inserción atómica en ambas tablas.
  - Si el juego ya existía, actualiza su estado y `updated_at`.
  - `getAll` retorna la lista ordenada por `updated_at DESC`.
- **Verificación:**
  - Tests en `tests/games.test.ts` prueban inserción, actualización de estado, filtrado y borrado.
- **Dependencias:** Tarea 1.2.
- **Archivos afectados:**
  - `backend/src/services/games.service.ts`
  - `backend/tests/games.test.ts`
- **Scope:** **M** (1 servicio con consultas SQL + 1 suite completa de tests).

---

### 🛡️ Checkpoint 2: Servicios de Negocio y Lógica de Datos
- [ ] Pruebas unitarias de Twitch Auth e IGDB pasando (`bun test tests/twitch-auth.test.ts tests/igdb.test.ts`).
- [ ] Pruebas de persistencia y transacciones pasando (`bun test tests/games.test.ts`).

---

### Fase 3: Controladores Elysia, TypeBox Schemas y Servidor

#### Tarea 3.1: Schemas TypeBox y Controladores de Rutas
- **Descripción:** Definir los esquemas de validación TypeBox (`src/types/schemas.ts`) para los payloads y parámetros. Implementar los controladores `searchController` y `gamesController` conectando con sus respectivos servicios.
- **Criterios de Aceptación:**
  - `searchController` maneja `GET /api/search` con validación de query `q`.
  - `gamesController` maneja `GET /api/games`, `POST /api/games` y `DELETE /api/games/:id` con validación de tipos.
  - Manejo de respuestas 400 Bad Request automáticas si el payload es inválido.
- **Verificación:**
  - Tests de integración de controladores con cliente HTTP de prueba Elysia.
- **Dependencias:** Tareas 2.2 y 2.3.
- **Archivos afectados:**
  - `backend/src/types/schemas.ts`
  - `backend/src/controllers/search.controller.ts`
  - `backend/src/controllers/games.controller.ts`
- **Scope:** **M** (3 archivos).

---

#### Tarea 3.2: Entrypoint Principal del Servidor, CORS y Manejo Global de Errores
- **Descripción:** Configurar `src/index.ts` integrando Elysia, el plugin `@elysiajs/cors` (permitiendo peticiones del frontend Vite en `http://localhost:5173`), middleware de logging simple y captura global de excepciones (`onError`).
- **Criterios de Aceptación:**
  - El servidor escucha en el puerto configurado (`PORT=3000`).
  - Cabeceras CORS habilitadas correctamente para peticiones cross-origin.
  - Errores de API no controlados devuelven JSON `{ error: string, status: number }` con log descriptivo en consola.
- **Verificación:**
  - Ejecución `bun run src/index.ts` y prueba de ping `/api/games` mediante fetch/curl.
- **Dependencias:** Tarea 3.1.
- **Archivos afectados:**
  - `backend/src/index.ts`
- **Scope:** **S** (1 archivo principal).

---

### 🛡️ Checkpoint 3: Backend Completo y Funcional
- [ ] Toda la suite de tests pasa en verde: `bun test`.
- [ ] Servidor corre en `http://localhost:3000` con `bun run --watch src/index.ts`.
- [ ] Endpoint `/api/search?q=mario` y CRUD de `/api/games` probados exitosamente de punta a punta.

---

## 4. Matriz de Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
| :--- | :--- | :--- |
| **Credenciales de Twitch faltantes al levantar** | Alto | Validación temprana en `src/config/env.ts` con mensaje claro de ayuda en consola. |
| **Rate Limit 429 de IGDB en búsquedas rápidas** | Medio | Manejo explícito de código 429 en `igdb.service.ts` con reintento o mensaje de espera al cliente. |
| **Juegos sin fecha o sin portada en IGDB** | Bajo | Normalización defensiva con valores por defecto (`cover_url: null`, `release_year: null`). |
| **Concurrencia en SQLite local** | Bajo | Activación de modo `WAL` (`PRAGMA journal_mode = WAL`) en la conexión inicial. |
