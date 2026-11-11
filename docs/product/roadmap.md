# Roadmap de Funcionalidades Futuras — NEXT.g

Este documento reúne las especificaciones funcionales, modelos de datos y arquitectura de las características planificadas para las siguientes etapas de **NEXT.g**.

---

## 1. Sistema de Tierlists de Videojuegos (Prioridad Alta)

Permite a los usuarios crear, personalizar y compartir rankings visuales categorizados en niveles (S, A, B, C, D, F).

### Sinergia con la plataforma
- **Importación directa:** El usuario puede poblar su tierlist con juegos que ya tiene en su biblioteca (ej. *"Mis juegos completados"* o *"Mi saga favorita"*).
- **Integración con la Ruleta:** Filtro especial en la ruleta: *"Girar ruleta exclusivamente entre mis juegos de Tier S y A"*.
- **Compartición viral:** Generación de tarjetas OpenGraph dinámicas para compartir la tierlist en redes sociales y foros.

### Modelo de Datos (PostgreSQL)

```sql
CREATE TABLE IF NOT EXISTS tier_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general', -- 'goty', 'franchise', 'genre', 'general'
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tier_list_items (
  id SERIAL PRIMARY KEY,
  tier_list_id UUID NOT NULL REFERENCES tier_lists(id) ON DELETE CASCADE,
  game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  tier VARCHAR(5) NOT NULL CHECK(tier IN ('S', 'A', 'B', 'C', 'D', 'E', 'F')),
  position INT NOT NULL DEFAULT 0,
  UNIQUE(tier_list_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_tier_lists_user ON tier_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_tier_items_list ON tier_list_items(tier_list_id);
```

### Endpoints Planificados
- `GET /api/tierlists`: Listado público de tierlists comunitarias.
- `GET /api/tierlists/:id`: Detalle completo con juegos agrupados por nivel.
- `POST /api/tierlists`: Creación de nueva tierlist.
- `PUT /api/tierlists/:id/items`: Guardado por lotes tras drag & drop.
- `DELETE /api/tierlists/:id`: Eliminación de tierlist propia.

---

## 2. Diario de Juego, Calificaciones Personales y Reseñas

Convierte el backlog en una bitácora interactiva estilo *Letterboxd* o *Backloggd*.

### Modelo de Datos (Extensión de `user_games`)
```sql
ALTER TABLE user_games
  ADD COLUMN IF NOT EXISTS user_rating NUMERIC(3,1) CHECK(user_rating >= 0 AND user_rating <= 10),
  ADD COLUMN IF NOT EXISTS playtime_hours INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_text TEXT,
  ADD COLUMN IF NOT EXISTS completed_date DATE,
  ADD COLUMN IF NOT EXISTS replay_count INT DEFAULT 0;
```

### Casos de uso
- Permitir calificar de 1 a 10 con decimales (o sistema de estrellas).
- Registrar horas jugadas aproximadas.
- Escribir una reseña personal con soporte Markdown.
- Calcular y exponer el **User Rating Comunitario** de cada juego para compararlo con el puntaje oficial de IGDB.

---

## 3. Estadísticas del Jugador (Gamer DNA / Year in Review)

Dashboard analítico que se actualiza automáticamente con la actividad del usuario.

### Métricas calculadas
- **Género predilecto:** Gráfico porcentual de distribución (ej. 42% RPG, 25% Acción, 15% Estrategia).
- **Plataforma principal:** Distribución por consola/PC (PC, PS5, Nintendo Switch, etc.).
- **Tiempo invertido estimado:** Sumatoria total de horas de juego registradas.
- **Resumen anual ("Wrapped"):** Cantidad de juegos completados en el año en curso, juego mejor calificado y mes más activo.

### Endpoint
- `GET /api/users/:id/stats`: Retorna el payload de métricas consolidado calculado directamente mediante agregaciones de PostgreSQL (`COUNT`, `SUM`, `AVG`, `FILTER`).

---

## 4. Sincronización Automática con Steam (Steam Web API)

Elimina la fricción de agregar juegos manualmente al registrarse en la plataforma.

### Flujo de integración
1. El usuario conecta su **Steam ID** o enlace a su perfil de Steam.
2. El backend consulta el endpoint público `IPlayerService/GetOwnedGames` de Valve.
3. El servicio empareja los títulos de Steam con el catálogo de IGDB mediante coincidencia de nombres normalizados.
4. Pobla automáticamente el catálogo del usuario con las horas reales de juego (`playtime_forever`).

---

## 5. Colecciones Temáticas y Listas Personalizadas

Permite ir más allá de los 4 estados canónicos (`BACKLOG`, `PLAYING`, `COMPLETED`, `WISHLIST`).

### Ejemplos de listas
- *"Juegos cortos para pasar en un fin de semana (< 5 horas)"*
- *"Backlog cooperativo para jugar con amigos"*
- *"Joyas de terror para jugar en octubre"*

### Modelo de Datos
```sql
CREATE TABLE IF NOT EXISTS custom_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collection_games (
  id SERIAL PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES custom_collections(id) ON DELETE CASCADE,
  game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  UNIQUE(collection_id, game_id)
);
```

---

## 6. Feed Social de Actividad y Seguidos

Introduce dinámicas comunitarias entre gamers:
- Sistema de seguimiento (`followers` / `following`).
- Feed de novedades: *"Lucas acaba de completar Hades y le dio 10/10"*, *"Max agregó Hollow Knight: Silksong a su Wishlist"*.
- Reacciones rápidas con emojis en las reseñas de amigos.
