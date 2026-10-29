import app from '../backend/src/app';

export default function handler(req: any, res: any) {
  // Restore original request path if Vercel router rewrote it to the destination file
  const originalPath = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || req.headers['x-now-route-matches'];
  if (originalPath && typeof originalPath === 'string' && (req.url === '/api/index' || req.url === '/src/app' || req.url.startsWith('/api/index?'))) {
    req.url = originalPath;
  }
  return app(req, res);
}
