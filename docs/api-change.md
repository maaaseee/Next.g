Barreras en el Frontend (Vue 3)

    Debounce Estricto: Implementa un retraso de 750 milisegundos en el input de búsqueda. El fetch solo debe dispararse cuando el usuario haya pausado su escritura de forma deliberada, ignorando las pulsaciones intermedias.

    Umbral de Disparo (Min Length): Bloquea las peticiones si la cadena de texto tiene menos de 4 caracteres. Consultar términos cortos o artículos genéricos a la API devuelve resultados irrelevantes y quema la cuota inútilmente.

    Caché de Sesión (Pinia): Utiliza un objeto Map o un diccionario en tu store de Pinia para almacenar las búsquedas de la sesión activa en la memoria RAM. Si el usuario busca un término, lo borra y vuelve a escribirlo exactamente igual, Vue debe renderizar los resultados cacheados sin tocar la red.

    Desactivar Refetch Automático: Evita el uso de listeners agresivos en tus peticiones. Desactiva comportamientos como refetchOnWindowFocus para impedir que la PWA consuma una petición nueva cada vez que cambias de ventana en Windows y vuelves a la aplicación.

Contención en el Backend (Bun + Elysia)

    Caché Persistente en SQLite: Implementa una tabla dedicada search_cache (query_text TEXT PRIMARY KEY, json_response TEXT, timestamp DATETIME). El endpoint /api/search debe consultar esta tabla obligatoriamente antes de usar tu API Key. Como los datos de los juegos son inmutables, un caché de 30 a 60 días es perfectamente seguro.

    Resolución Híbrida (Indexación Local): Antes de salir a internet, realiza un SELECT con el operador LIKE en tu tabla principal de games. Si tu base de datos ya cuenta con registros suficientes que coinciden con la búsqueda, puedes servirlos directamente.

    Almacenamiento de Resultados Vacíos: Si consultas un título extraño y RAWG devuelve un array vacío, debes guardar ese resultado vacío en el caché de SQLite. Esto evita que una búsqueda recurrente por un juego que no existe en la base de datos siga drenando tu cuota.

    Limitador de Tasa (Rate Limiting): Integra el plugin @elysiajs/rate-limit para restringir el endpoint a un máximo de 10 peticiones por minuto. Actúa como un cortacorriente vital por si tu componente de Vue entra accidentalmente en un bucle infinito de re-renderizado durante la fase de desarrollo.