import { app } from '../server';

export default function handler(req: any, res: any) {
  console.log(`[Vercel Handler] Invoking for ${req.url}`);
  return app(req, res);
}
