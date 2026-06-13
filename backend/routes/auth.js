Dame el contenido completo final de:

backend/routes/auth.js

Solo código completo, sin explicaciones, sin markdown.

Verificá antes:
- No importa authMiddleware desde otro archivo.
- Define authMiddleware dentro del mismo auth.js.
- Usa const db = require('../db');
- No usa require('../db/database');
- No usa require('../utils/email');
- Todas las rutas router.get/router.post tienen callbacks reales.
- /login busca en professionals.
- /register inserta en professionals.
- /me usa el authMiddleware inline.