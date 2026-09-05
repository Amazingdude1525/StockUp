import { GET as getHandler, POST as postHandler } from '../app/api/stockup/route';

export const config = {
  runtime: 'edge',
};

export async function GET(req: Request) {
  return getHandler();
}

export async function POST(req: Request) {
  return postHandler(req);
}
