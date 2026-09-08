import { app } from '../backend/src/index';

export default async function handler(req: Request) {
  return app.fetch(req);
}
