# Documento Técnico: “NEXT.g” (Backlog Juegos MVP)

**Fecha:** Septiembre 2026
**Objetivo:** Especificación técnica para el desarrollo de un MVP funcional en una tarde de una aplicación de gestión de catálogo de videojuegos con funcionalidad de ruleta de selección, distribuida como PWA para escritorio.

## 1. Arquitectura del Sistema (Vista General)
  - **Frontend:** Vue 3 (Composition API) + Vite + Tailwind CSS.
  - **PWA:** vite-plugin-pwa configurado para instalación nativa de escritorio y ejecución en el inicio del SO (run_on_os_login).
  - **Backend:** Bun + ElysiaJS. Actúa como CRUD rápido y Proxy seguro hacia la API externa.
  - **Base de Datos:** SQLite embebido mediante bun:sqlite (modo WAL activado para concurrencia).
  - **Fuente de Datos:** API externa IGDB (Twitch) consumida exclusivamente desde el backend para proteger las credenciales (Client ID y Secret).

## 2. Arquitectura Interna del Backend
El backend con ElysiaJS seguirá un patrón modular simple pero escalable, separando las responsabilidades para facilitar el mantenimiento y lectura del código:
  - **Capa de Enrutamiento (Controllers):** Definición de los endpoints utilizando el encadenamiento de Elysia (ej. .group('/api/games', ...)).
  - **Capa de Validación (Schemas):** Uso estricto de TypeBox (incluido en Elysia con t.*) para validar el payload de entrada y salida, garantizando seguridad de tipos.
  - **Capa de Servicios (Services):** Lógica de negocio aislada, específicamente el cliente HTTP que actúa como proxy para comunicarse con IGDB y manejar la expiración/renovación del token de Twitch.
  - **Capa de Datos (Repository/DB):** Consultas SQL puras aisladas en un módulo db.ts utilizando bun:sqlite.

## 3. Diseño UI/UX y Jerarquía de Componentes (Frontend)
La interfaz utilizará Tailwind CSS para un diseño oscuro, moderno y enfocado en el contenido visual (carátulas de los juegos). La jerarquía de Vue 3 será la siguiente:
  - **App.vue:** Layout principal, maneja la barra de navegación lateral o superior y el router-view.
  - **Views:**
    - CatalogView.vue: Grilla principal con pestañas para filtrar por estados (BACKLOG, PLAYING, etc.).
    - RouletteView.vue: Vista inmersiva para la ruleta. Contiene la lógica de animación y controles de filtrado previos al giro.
    - AdminView.vue: Panel de métricas protegido.
  - **Components:**
    - GameCard.vue: Tarjeta reutilizable que muestra la portada, el título y un menú de acciones (cambiar estado, eliminar).
    - SearchModal.vue: Input flotante con debounce que muestra los resultados de IGDB en tiempo real.
    - RouletteWheel.vue: Componente visual aislado encargado exclusivamente de renderizar la animación CSS (transform, transition) de los juegos pasando.

## 4. Flujo de Datos y Manejo de Estado (Pinia)
Dado que múltiples vistas (Catálogo y Ruleta) necesitan acceder a la misma lista de juegos sincronizada, se implementará **Pinia** como store global:
  - **State:** Almacena el array de juegos del usuario recuperado del backend.
  - **Getters:** Funciones computadas para separar los juegos por estado (ej. backlogGames, completedGames) y proveer datos listos para la interfaz.
  - **Actions:** Métodos asíncronos que envuelven las peticiones al backend (ej. fetchUserGames(), addGameToLibrary(), changeGameStatus()). Al recibir un 200 OK del servidor, actualizan el estado local de Pinia inmediatamente (Optimistic UI) para una sensación de inmediatez.

## 5. Entidades Necesarias
Para el correcto funcionamiento del sistema y la base de datos local, se definen las siguientes entidades principales:
  - **Juego (Game):** Representa la información maestra del videojuego obtenida de la API externa (IGDB). Contiene propiedades como ID oficial, título, URL de la portada y año de lanzamiento.
  - **Juego de Usuario (UserGame):** Representa la relación entre el catálogo del usuario y el juego. Define el estado actual del juego en la biblioteca personal (BACKLOG, PLAYING, COMPLETED, WISHLIST) y la fecha de agregado.
  - **Usuario (User):** Entidad mínima y opcional para la etapa inicial (MVP local), pero proyectada para el panel de administración. Guardaría preferencias básicas o credenciales de acceso al dashboard de admin.

## 6. Modelo de Datos (Esquema SQLite)
```sql
CREATE TABLE IF NOT EXISTS games (  
  id INTEGER PRIMARY KEY,  
  title TEXT NOT NULL,  
  cover_url TEXT,  
  release_year INTEGER  
);  
  
CREATE TABLE IF NOT EXISTS user_games (  
  id INTEGER PRIMARY KEY AUTOINCREMENT,  
  game_id INTEGER NOT NULL,  
  status TEXT NOT NULL CHECK(status IN ('BACKLOG', 'PLAYING', 'COMPLETED', 'WISHLIST')),  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  
  FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE,  
  UNIQUE(game_id)  
);  
```

## 7. Endpoints del Backend (ElysiaJS)
| Método | Ruta | Body / Query | Descripción |
| :- | :- | :- | :- |
| **GET** | `/api/games` | `?status=[opcional]` | Retorna el catálogo. Permite filtrar por estado (ej. BACKLOG). |
| **POST** | `/api/games` | JSON: `{id, title, cover_url, release_year, status}` | Guarda un nuevo juego en el catálogo o actualiza su estado (Upsert transaccional). |
| **DELETE** | `/api/games/:id` | URL Param: `id` | Elimina un juego del catálogo del usuario. |
| **GET** | `/api/search` | `?q=[término_busqueda]` | Proxy hacia IGDB. Autentica vía OAuth2, inyecta headers, realiza la consulta y retorna un payload normalizado para Vue. |

## 8. Features de la Aplicación (Detalladas)
### Features Aceptadas (Incluidas en el MVP)
  - **Búsqueda y catálogo de juegos:** Búsqueda de videojuegos consumiendo datos de IGDB a través del backend.
  - **Estados de Catálogo (Jugado, Pendiente, Wishlist):** Clasificación para alimentar los filtros de la ruleta.

### Features Nuevas (Agregadas al MVP)
  - **Ruleta de Selección:** Funcionalidad interactiva con filtro por estado o selección manual efímera, ejecutada en el cliente.
  - **Panel de Administrador:** Vista reservada de lectura para métricas.
  - **Logging de la App:** Sistema integrado de registro de eventos y errores (frontend y backend).

### Features Descartadas (Postergadas o Fuera de Alcance)
  - **Reseñas y calificaciones**
  - **Feed social y seguidores**
  - **Diarios (Journals) y Listas custom**

## 9. Seguridad y Autenticación (SSO Restringido)
Para asegurar el acceso al panel de administrador, se utilizará un flujo OAuth (Single Sign-On) estricto y sin almacenamiento de contraseñas, apoyado en proveedores como GitHub o Google.
  - **Flujo de Autorización:** El usuario intenta acceder a /admin y es redirigido a iniciar sesión vía GitHub/Google. Una vez autenticado, el proveedor devuelve un *Access Token* al backend.
  - **Validación por Identificador:** El backend recupera el correo electrónico del usuario desde el proveedor y lo compara exhaustivamente contra una variable de entorno segura (ADMIN_EMAIL) definida en el archivo .env. Si el correo coincide, se permite el acceso. En caso contrario, se devuelve un error 403 (Prohibido).
  - **Persistencia Segura (Cookies HttpOnly):** Tras una validación exitosa, el backend emite un JWT (JSON Web Token) firmado con JWT_SECRET, y lo almacena en el navegador mediante una cookie marcada como HttpOnly y Secure. Esto previene el acceso desde el frontend mediante JavaScript, protegiendo el sistema contra ataques XSS.

## 10. Logging de la App
  - **En el Backend (Bun/ElysiaJS):** Se configurará un middleware de logging que intercepte y registre por consola estándar (stdout) los tiempos de respuesta de cada request, errores 500 y eventos del proxy de autenticación con IGDB.
  - **En el Frontend (Vue 3):** Implementación de app.config.errorHandler a nivel global para registrar errores de montaje de componentes o fallos de red al consultar a la base de datos local, dejando constancia del estado de la interfaz de usuario en la consola del navegador.

## 11. Estrategia de Despliegue (Desacoplado)
  - **Frontend:** Vercel. Despliegues automáticos sobre cada push.
  - **Backend:** Fly.io o Render con volumen de almacenamiento persistente.

## 12. Requisitos Pendientes para Iniciar el Desarrollo
  - **Definición del Archivo .env:** Se debe crear el archivo de variables de entorno en la raíz del proyecto backend que incluya: TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ADMIN_EMAIL, y JWT_SECRET.
  - **Cliente HTTP (Frontend):** Evaluar **Eden Treaty** para el tipado estricto o utilizar la API fetch nativa configurada con credentials: 'include'.
  - **Manejo de Errores e Interfaz de Red:** Diseñar la estrategia visual (toasts, alertas o skeletons) para manejar tiempos de carga largos o rate-limiting si se excede la cuota de peticiones hacia la API de IGDB.

## El funcionamiento de Eden Treaty y los DTOs
Eden Treaty elimina por completo la necesidad de escribir DTOs o interfaces manuales en el frontend. A diferencia de arquitecturas tradicionales con Java o Spring Boot donde debés mantener las clases DTO sincronizadas manualmente entre el servidor y el cliente, Eden Treaty aprovecha la inferencia de tipos de TypeScript de extremo a extremo.
  - **Inferencia directa:** En tu backend de Bun, exportás el tipo de tu instancia principal (ej. export type App = typeof app). En tu frontend de Vue, importás ese tipo y se lo pasás al cliente de Eden.
  - **Autocompletado nativo:** Al escribir eden.api.games.get() en Vue, tu IDE ya sabe exactamente qué parámetros espera la ruta (query, params, body) y qué estructura exacta tiene la respuesta JSON. No hay que adivinar ni tipear de más.
  - **Sincronización estricta:** Si en el backend renombrás un campo de cover_url a image_url usando TypeBox, el frontend marcará un error de TypeScript inmediatamente si intentás acceder al campo viejo, evitando que la app se rompa en tiempo de ejecución.

## Estrategia dual de Manejo de Errores e Interfaz de Red
Para lograr una protección robusta de la API y un feedback impecable en el frontend, la implementación se dividirá en dos capas defensivas:

### 1. Prevención y Protección de la API (Capa Lógica)
  - **Debounce en búsquedas:** El input de texto en el buscador de juegos utilizará un retraso de 300 a 500 milisegundos. Si el usuario tipea rápido, se cancelan las peticiones intermedias y solo se envía el fetch hacia /api/search cuando hace una pausa, protegiendo tu límite de peticiones en IGDB.
  - **Caché local con Pinia:** Al cambiar entre estados (ej. de Backlog a Completados y viceversa), Pinia servirá los datos cacheados en memoria. El servidor solo se consultará para la carga inicial o tras una mutación (agregar o eliminar un juego).

### 2. Feedback Visual (Capa UI)
  - **Skeleton Loaders:** Durante las peticiones asíncronas de la base de datos o de IGDB, se renderizarán tarjetas vacías con animaciones de pulso de Tailwind (animate-pulse). Esto evita el "salto" de elementos en la pantalla y da percepción de velocidad.
  - **Toasts de Error Contextuales:** Se utilizarán notificaciones flotantes temporales en la esquina inferior.
      - Si el proxy con IGDB devuelve un 429 Too Many Requests, el toast mostrará: *"Límite de búsquedas alcanzado. Por favor, esperá unos segundos."*
      - Si falla la base de datos local (error 500), se mostrará el mensaje capturado por el manejador global.
  - **Fallbacks de Imágenes:** Si la API de Twitch devuelve un juego sin carátula (cover_url nulo), el componente de la tarjeta renderizará un gradiente oscuro con el título del juego centrado en texto, manteniendo la simetría de la grilla y la ruleta.
