const { db } = require('../config/db');

async function getAuthenticatedUser(req) {
  // 1. Check Express session
  if (req.session && req.session.user) {
    const user = await db.oneOrNone('SELECT * FROM users WHERE id = $1', [req.session.user.id]);
    if (user) return user;
  }

  // 2. Check Authorization Bearer token header
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const session = await db.oneOrNone(
        'SELECT u.* FROM login_sessions ls JOIN users u ON u.id = ls.user_id WHERE ls.token = $1',
        [token]
      );
      if (session) return session;
    }
  }

  return null;
}

async function requireAuth(req, res, next) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ detail: 'Please log in to continue.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ detail: 'Your account has been suspended. Please contact the administrator.' });
    }

    req.user = user;
    if (req.session) {
      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        status: user.status
      };
    }
    next();
  } catch (err) {
    next(err);
  }
}

async function requireAdmin(req, res, next) {
  try {
    const user = await getAuthenticatedUser(req);
    const isApi = (req.originalUrl && req.originalUrl.startsWith('/api')) || (req.baseUrl && req.baseUrl.startsWith('/api'));

    if (!user) {
      if (!isApi && req.accepts('html')) {
        return res.redirect('/login.html?admin_required=1');
      }
      return res.status(401).json({ detail: 'Authentication required. Please log in as an administrator.' });
    }

    if (user.role !== 'admin') {
      if (!isApi && req.accepts('html')) {
        return res.status(403).render('index', { error: 'Access forbidden. Administrator privileges required.' });
      }
      return res.status(403).json({ detail: 'Access denied. Administrator privileges required.' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

async function optionalAuth(req, res, next) {
  try {
    req.user = await getAuthenticatedUser(req);
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  requireAuth,
  requireAdmin,
  optionalAuth,
  getAuthenticatedUser
};
