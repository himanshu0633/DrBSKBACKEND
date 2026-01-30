const rateLimits = {};

const facebookRateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  
  if (!rateLimits[ip]) rateLimits[ip] = [];
  rateLimits[ip] = rateLimits[ip].filter(time => now - time < windowMs);
  
  if (rateLimits[ip].length >= 100) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  
  rateLimits[ip].push(now);
  next();
};

module.exports = facebookRateLimiter;
