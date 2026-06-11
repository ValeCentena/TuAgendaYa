const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'tuagendaya-secret-dev-change-in-prod';

function adminAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de administrador requerido' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token de administrador inválido o expirado' });
  }
}

function signAdminToken(payload) {
  return jwt.sign({ ...payload, role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
}

module.exports = { adminAuthMiddleware, signAdminToken };