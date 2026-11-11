# Especificación Técnica: Backend (NEXT.g API)

## 1. Objetivo
Desarrollar un servidor backend ligero, ultrarrápido y seguro utilizando **Bun + ElysiaJS** con base de datos embebida **SQLite** (`bun:sqlite`). Su función principal es gestionar la persistencia local de la biblioteca de videojuegos del usuario y actuar como un proxy autenticado hacia la API de **IGDB (Twitch)** para proteger credenciales y optimizar el consumo de peticiones.

---

## 2. Stack Tecnológico

| Componente | Tecnología | Versión / Detalle |
| :--- | :--- | :--- |
| **Runtime** | Bun | >= 1.1.0 |
| **Framework Web** | ElysiaJS | >= 1.0.0 |
| **Validación de Tipos** | TypeBox (`@elysiajs/eden` / `t.*`) | Tipado estricto E2E |
| **Base de Datos** | `bun:sqlite` | Embebida, con modo WAL (Write-Ahead Logging) |
| **CORS Middleware** | `@elysiajs/cors` | Habilitado para comunicación con Vite/Vue |
| **Testing** | `bun test` | Runner nativo de Bun |

---

## 3. Comandos de Ejecución

```bash
# Instalación de dependencias
bun install

# Modo desarrollo con recarga en vivo (hot reload)
bun run --watch src/index.ts

# Ejecución en producción
bun run src/index.ts

# Ejecutar suite de pruebas unitarias y de integración
bun test

# Verificación de tipos TypeScript
bunx tsc --noEmit
```

---

## 4. Estructura del Proyecto

```
backend/
├── src/
│   ├── config/
│   │   ├── env.ts                 # Validación de variables de entorno
│   │   └── constants.ts           # URLs de Twitch/IGDB, TTLs de tokens
│   ├── db/
│   │   ├── index.ts               # Inicialización de bun:sqlite y migración de tablas
│   │   └── schema.sql             # Script DDL de creación de tablas
│   ├── services/
│   │   ├── twitch-auth.service.ts # Obtención y caché en memoria del token OAuth2
│   │   ├── igdb.service.ts        # Cliente proxy para búsqueda en IGDB
│   │   └── games.service.ts       # Operaciones CRUD y lógica de persistencia local
│   ├── controllers/
│   │   ├── search.controller.ts   # GET /api/search
│   │   └── games.controller.ts    # GET, POST, DELETE /api/games
│   ├── types/
│   │   └── schemas.ts             # Schemas TypeBox para validación de requests/responses
│   └── index.ts                   # Entrypoint: configuración de Elysia, CORS y rutas
├── tests/
│   ├── twitch-auth.test.ts
│   ├── igdb.test.ts
│   └── games.test.ts
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 5. Modelo de Datos y Base de Datos (SQLite)

El archivo de base de datos se ubicará en `data/nextg.db` (creado automáticamente al iniciar).

### 5.1. Esquema SQL DDL
```sql
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY,          -- ID oficial de IGDB
  title TEXT NOT NULL,             -- Título del juego
  cover_url TEXT,                  -- URL de la portada (Cloudinary HD)
  release_year INTEGER,            -- Año de lanzamiento inicial
  summary TEXT,                    -- Sinopsis / Descripción
  genres TEXT,                     -- JSON Array string, ej. ["Action", "RPG"]
  platforms TEXT,                  -- JSON Array string, ej. ["PC", "PlayStation 5"]
  rating REAL,                     -- Puntuación agregada (0 a 100)
  game_modes TEXT                  -- JSON Array string, ej. ["Single player"]
);

CREATE TABLE IF NOT EXISTS user_games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('BACKLOG', 'PLAYING', 'COMPLETED', 'WISHLIST')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE,
  UNIQUE(game_id)
);

CREATE INDEX IF NOT EXISTS idx_user_games_status ON user_games(status);
```

---

## 6. Endpoints y Contratos de la API

### 6.1. `GET /api/search`
Proxy hacia la API de IGDB con **Fallback automático a base de datos seed local de 50 juegos** si no hay credenciales de Twitch configuradas. Realiza búsqueda difusa por título, género o plataforma.

- **Query Params:**
  - `q` (string, minLength: 1): Término de búsqueda.
- **Respuesta (200 OK):**
  ```json
  [
    {
      "id": 119133,
      "title": "Elden Ring",
      "cover_url": "https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg",
      "release_year": 2022,
      "summary": "An expansive fantasy action-RPG game...",
      "genres": ["Role-playing (RPG)", "Adventure", "Action"],
      "platforms": ["PC", "PlayStation 5", "Xbox Series X|S"],
      "rating": 95.5,
      "game_modes": ["Single player", "Multiplayer", "Co-operative"]
    }
  ]
  ```

### 6.2. `GET /api/games`
Retorna los juegos guardados en el catálogo local del usuario, opcionalmente filtrados por estado, género o plataforma.

- **Query Params:**
  - `status` (opcional): `'BACKLOG' | 'PLAYING' | 'COMPLETED' | 'WISHLIST'`
  - `genre` (opcional): Filtro por género (ej. `RPG`)
  - `platform` (opcional): Filtro por plataforma (ej. `Switch`)
- **Respuesta (200 OK):**
  ```json
  [
    {
      "id": 119133,
      "title": "Elden Ring",
      "cover_url": "https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg",
      "release_year": 2022,
      "summary": "An expansive fantasy action-RPG game...",
      "genres": ["Role-playing (RPG)", "Adventure", "Action"],
      "platforms": ["PC", "PlayStation 5", "Xbox Series X|S"],
      "rating": 95.5,
      "game_modes": ["Single player", "Multiplayer", "Co-operative"],
      "status": "PLAYING",
      "created_at": "2026-09-03T18:00:00.000Z",
      "updated_at": "2026-09-03T18:00:00.000Z"
    }
  ]
  ```

### 6.3. `POST /api/seed`
Endpoint para pre-cargar los 50 juegos y la biblioteca inicial en SQLite.

### 6.3. `POST /api/games`
Agrega un juego a la biblioteca o actualiza su estado (Upsert). Guarda automáticamente la información maestra en `games` y la relación en `user_games`.

- **Body (JSON):**
  ```json
  {
    "id": 1020,
    "title": "Grand Theft Auto V",
    "cover_url": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7h.jpg",
    "release_year": 2013,
    "status": "PLAYING"
  }
  ```
- **Respuesta (200 OK / 201 Created):** Objeto del juego actualizado con su nuevo estado.

### 6.4. `DELETE /api/games/:id`
Elimina un juego del catálogo del usuario.

- **Params:** `id` (número entero).
- **Respuesta (200 OK):** `{ "success": true, "deleted_id": 1020 }`.

---

## 7. Estilo de Código y Convenciones

- **Elysia Chain Pattern:** Modularización mediante subgrupos (`.group('/api/games', app => ...)`).
- **TypeBox estricto:** Todo endpoint debe tener validado su `query`, `body` y `params` con `t.*`.
- **Servicio de Autenticación con Twitch en Memoria:**
  - Almacena el `access_token` y `expires_at`.
  - Antes de cada petición a IGDB, verifica si el token está expirado (con margen de seguridad de 60 segundos). Si expiró, solicita uno nuevo a `https://id.twitch.tv/oauth2/token` usando `TWITCH_CLIENT_ID` y `TWITCH_CLIENT_SECRET`.

### Ejemplo de Controlador Elysia
```typescript
import { Elysia, t } from 'elysia';
import { GamesService } from '../services/games.service';
import { GameStatusSchema, UpsertGameSchema } from '../types/schemas';

export const gamesController = new Elysia({ prefix: '/api/games' })
  .get('/', ({ query }) => GamesService.getAll(query.status), {
    query: t.Object({
      status: t.Optional(GameStatusSchema)
    })
  })
  .post('/', ({ body, set }) => {
    const result = GamesService.upsertGame(body);
    set.status = 200;
    return result;
  }, {
    body: UpsertGameSchema
  })
  .delete('/:id', ({ params: { id } }) => GamesService.deleteGame(Number(id)), {
    params: t.Object({
      id: t.Numeric()
    })
  });
```

---

## 8. Estrategia de Testing

- **Tests de Servicios:**
  - `twitch-auth.test.ts`: Verificar caché y renovación del token.
  - `igdb.test.ts`: Verificar normalización de respuesta de IGDB (reemplazo de tamaño de carátula `t_thumb` por `t_cover_big` o `t_720p`, manejo de carátulas ausentes).
  - `games.test.ts`: Probar operaciones en SQLite en memoria (`:memory:`), comprobando restricciones únicas y cascade delete.

---

## 9. Boundaries (Límites y Reglas)

- **Siempre:**
  - Usar transacciones SQLite (`db.transaction()`) al hacer upsert simultáneo en `games` y `user_games`.
  - Normalizar URLs de imágenes provenientes de IGDB (garantizar `https:` y `t_cover_big`).
  - Habilitar `PRAGMA journal_mode = WAL` para evitar bloqueos de base de datos.
- **Consultar primero:**
  - Modificaciones en la estructura de tablas o campos nuevos.
  - Inclusión de librerías ORM externas (se prioriza `bun:sqlite` nativo por rendimiento y simplicidad).
- **Nunca:**
  - Guardar o comitear claves secretas (`TWITCH_CLIENT_SECRET`) en repositorios o logs.
  - Enviar peticiones a IGDB sin pasar por el caché de token en memoria.
  - Devolver errores 500 no controlados sin logging claro en consola.

---

## 10. Criterios de Éxito (Definición de Terminado)

- [ ] El servidor inicia con `bun run --watch src/index.ts` sin errores.
- [ ] Búsqueda `/api/search?q=zelda` retorna resultados reales de IGDB en menos de 400ms.
- [ ] Guardar un juego persiste correctamente en `nextg.db`.
- [ ] Eliminar un juego lo borra de `user_games` inmediatamente.
- [ ] Todas las pruebas en `bun test` pasan en verde.
