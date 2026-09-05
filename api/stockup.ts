export const runtime = 'nodejs';

import { GET as getHandler, POST as postHandler } from '../app/api/stockup/route';

export async function GET(req: Request) {
  return getHandler();
}

export async function POST(req: Request) {
  return postHandler(req);
}
