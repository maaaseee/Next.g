# Plan de Implementación: Suite de Testing End-to-End (E2E) con Playwright

**Proyecto:** NEXT.g Game Backlog (Vue 3 + Elysia.js + PostgreSQL)  
**Objetivo:** Automatizar la verificación integral de flujos de usuario, integraciones de API y rendimiento visual en entornos locales y CI/CD.

---

## 1. Arquitectura de la Suite E2E

```mermaid
flowchart TD
    subgraph CI["GitHub Actions / Entorno Local"]
        PostgresContainer["PostgreSQL Efímero (Docker / Port 5432)"]
        BackendServer["Backend Bun / Elysia (localhost:3000)"]
        FrontendVite["Frontend Vue 3 / Vite (localhost:5173)"]
        PlaywrightRunner["Playwright Test Runner (Chromium / Firefox / WebKit)"]
    end

    PostgresContainer --> BackendServer
    BackendServer --> FrontendVite
    FrontendVite --> PlaywrightRunner
    BackendServer -. Direct API Mock / Seed .-> PlaywrightRunner
```

### Principios de Diseño
1. **Aislamiento Total:** Cada suite o ejecución utiliza una base de datos limpia o usuarios con identificadores únicos creados dinámicamente vía API.
2. **WebServers Integrados:** Playwright gestiona el arranque simultáneo del backend Bun y el frontend Vite mediante `webServer` en `playwright.config.ts`.
3. **Mocks de APIs Externas:** Redirección o mock de Twitch OAuth/IGDB en tests donde no se requiera conectividad hacia Twitch Developer Portal.

---

## 2. Configuración e Instalación

### Dependencias requeridas
En la raíz del proyecto:
```bash
bun add -D @playwright/test
bunx playwright install --with-deps chromium
```

### Archivo de Configuración: `playwright.config.ts`
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list']
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: [
    {
      command: 'bun run --cwd backend src/index.ts',
      url: 'http://localhost:3000/health/live',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      command: 'bun run dev --port 5173',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
  ],
});
```

---

## 3. Matriz de Casos de Prueba (Fases de Implementación)

### Fase 1: Autenticación, Registro y Onboarding
* **`e2e/auth/register-login.spec.ts`**
  - Registro de nuevo usuario con validación de contraseña y correo duplicado.
  - Inicio de sesión con credenciales correctas y almacenamiento de JWT.
  - Cierre de sesión e invalidación de token (`token_version`).
  - Inicio de sesión de desarrollo rápido (`dev-test-login` en entornos no productivos).
* **`e2e/auth/onboarding.spec.ts`**
  - Flujo de bienvenida post-registro: selección de 3 juegos favoritos.
  - Bloqueo de avance si se seleccionan menos de 3 juegos.
  - Confirmación y redirección automática al catálogo con los juegos añadidos.

### Fase 2: Gestión de Biblioteca y Catálogo
* **`e2e/catalog/library-crud.spec.ts`**
  - Visualización de pestañas por estado: `BACKLOG`, `PLAYING`, `COMPLETED`, `WISHLIST`.
  - Cambio de estado de un juego desde la tarjeta o modal.
  - Filtro por género y plataforma.
  - Eliminación de un juego con diálogo de confirmación.

### Fase 3: Búsqueda y Detalle de Juegos
* **`e2e/search/game-search.spec.ts`**
  - Apertura del buscador global con atajo de teclado (`Ctrl+K` / `Cmd+K`) o clic.
  - Búsqueda en tiempo real con debounce y visualización de resultados.
  - Agregar un juego directamente desde los resultados de búsqueda a la biblioteca.
  - Navegación a la página de detalle `/game/:id` y verificación de sinopsis, capturas y calificación.

### Fase 4: Ruleta Gamer (Aleatorizador)
* **`e2e/roulette/picker.spec.ts`**
  - Navegación a `/roulette`.
  - Selección de modos: Rueda Clásica, Carrete Vertical (Slot) y Selector Instantáneo.
  - Aplicación de filtros (ej. solo juegos del backlog en plataforma Switch).
  - Ejecución del giro y verificación del modal de juego ganador con opción "Marcar como Jugando".

### Fase 5: Comunidad, Perfiles y Tarjetas OpenGraph
* **`e2e/social/profile-og.spec.ts`**
  - Visita a la sección de Comunidad (`/community`) y exploración de perfiles públicos.
  - Visita al Gamer Passport de un usuario (`/u/:username`).
  - Verificación de renderizado de imagen SVG social en `/api/og/user/:id` y `/api/og/game/:id`.

---

## 4. Estructura de Carpetas Propuesta

```
Game Backlog/
├── e2e/
│   ├── fixtures/
│   │   ├── auth.fixture.ts        # Helper para login automático y generación de tokens
│   │   └── mock-data.ts           # Juegos de prueba y respuestas simuladas
│   ├── auth/
│   │   ├── register-login.spec.ts
│   │   └── onboarding.spec.ts
│   ├── catalog/
│   │   └── library-crud.spec.ts
│   ├── search/
│   │   └── game-search.spec.ts
│   ├── roulette/
│   │   └── picker.spec.ts
│   └── social/
│       └── profile-og.spec.ts
└── playwright.config.ts
```

---

## 5. Pipeline de CI: `.github/workflows/e2e.yml`

```yaml
name: End-to-End Tests (Playwright)

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  e2e:
    name: Run Playwright Test Suite
    timeout-minutes: 20
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgrespassword
          POSTGRES_DB: nextg_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install Root & Backend Dependencies
        run: |
          bun install --frozen-lockfile
          cd backend && bun install --frozen-lockfile

      - name: Install Playwright Browsers
        run: bunx playwright install --with-deps chromium

      - name: Run Playwright Tests
        env:
          DATABASE_URL: postgres://postgres:postgrespassword@localhost:5432/nextg_db
          JWT_SECRET: test-secret-key-for-playwright-e2e-testing-32chars
          NODE_ENV: test
          VITE_API_URL: http://localhost:3000
        run: bunx playwright test

      - name: Upload Playwright Report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14
```
