# Lista de Tareas: Backend (NEXT.g API)

Estado: **Completado y Verificado**  
Referencia: [`docs/tasks/backend-plan.md`](file:///C:/Users/maxe1/Documents/Repos/Spring%20projects%20on%20Github/Game%20Backlog/docs/tasks/backend-plan.md) • [`docs/spec-backend.md`](file:///C:/Users/maxe1/Documents/Repos/Spring%20projects%20on%20Github/Game%20Backlog/docs/spec-backend.md)

---

## Fase 1: Infraestructura Base y Base de Datos

- [x] **Tarea 1.1: Inicialización del Proyecto Backend y Configuración de Entorno**
  - **Aceptación:** `package.json`, `tsconfig.json`, `@elysiajs/cors`, `elysia` instalados; `src/config/env.ts` valida variables de entorno; `.env.example` creado.
  - **Verificación:** `bun install` y `bun run typecheck` completaron sin errores.
  - **Archivos:** `backend/package.json`, `backend/tsconfig.json`, `backend/.env.example`, `backend/src/config/env.ts`, `backend/src/config/constants.ts`

- [x] **Tarea 1.2: Capa de Base de Datos y Esquema SQLite (`bun:sqlite`)**
  - **Aceptación:** Inicialización de base de datos con modo WAL activado, DDL de tablas `games` y `user_games` con cascade delete y constraints.
  - **Verificación:** `bun test tests/games.test.ts` pasa en verde con base de datos en memoria.
  - **Archivos:** `backend/src/db/schema.sql`, `backend/src/db/index.ts`

- [x] **🛡️ Checkpoint 1: Base de Datos y Entorno**
  - [x] Dependencias instaladas y tipos validados con `tsc --noEmit`.
  - [x] Tablas SQLite y constraints verificadas.

---

## Fase 2: Servicios de Negocio (Twitch OAuth, IGDB y Catálogo)

- [x] **Tarea 2.1: Servicio de Autenticación Twitch OAuth con Caché en Memoria**
  - **Aceptación:** Obtención de token OAuth2 client credentials, caché en memoria con buffer de expiración de 60s, renovación automática.
  - **Verificación:** `bun test tests/twitch-auth.test.ts` pasa con tests unitarios.
  - **Archivos:** `backend/src/services/twitch-auth.service.ts`, `backend/tests/twitch-auth.test.ts`

- [x] **Tarea 2.2: Servicio Proxy de Búsqueda IGDB**
  - **Aceptación:** Búsqueda difusa en `/v4/games`, inyección de cabeceras de Twitch, formateo de portadas `t_cover_big` y normalización de datos.
  - **Verificación:** `bun test tests/igdb.test.ts` pasa en verde con respuestas parseadas.
  - **Archivos:** `backend/src/services/igdb.service.ts`, `backend/tests/igdb.test.ts`

- [x] **Tarea 2.3: Servicio de Gestión de Catálogo y Estados (`GamesService`)**
  - **Aceptación:** Métodos `getAll(status?)`, `upsertGame(game)` con transacciones SQLite atómicas, y `deleteGame(id)`.
  - **Verificación:** `bun test tests/games.test.ts` prueba CRUD completo y orden por fecha.
  - **Archivos:** `backend/src/services/games.service.ts`, `backend/tests/games.test.ts`

- [x] **🛡️ Checkpoint 2: Servicios y Lógica de Datos**
  - [x] Autenticación de Twitch e IGDB funcionando y testeada.
  - [x] Persistencia y transacciones probadas en base de datos.

---

## Fase 3: Controladores Elysia, TypeBox Schemas y Servidor

- [x] **Tarea 3.1: Schemas TypeBox y Controladores de Rutas**
  - **Aceptación:** Definición de esquemas de validación TypeBox para `GET /api/search`, `GET /api/games`, `POST /api/games`, `DELETE /api/games/:id`.
  - **Verificación:** Tests de integración con cliente Elysia en `tests/api.test.ts`.
  - **Archivos:** `backend/src/types/schemas.ts`, `backend/src/controllers/search.controller.ts`, `backend/src/controllers/games.controller.ts`

- [x] **Tarea 3.2: Entrypoint Principal del Servidor, CORS y Manejo Global de Errores**
  - **Aceptación:** Servidor Elysia escuchando en puerto configurado, CORS habilitado para `http://localhost:5173`, middleware de logging y manejo de errores 4xx/500 con respuestas JSON limpias.
  - **Verificación:** `app.handle()` en tests de integración y servidor listo para `bun run dev`.
  - **Archivos:** `backend/src/index.ts`, `backend/tests/api.test.ts`

- [x] **🛡️ Checkpoint 3: Backend Completo y Funcional**
  - [x] Suite completa de tests en verde (`bun test`: 9 tests pasando, 0 fallos).
  - [x] Endpoints y base de datos listos para conectarse con el Frontend Vue 3.
