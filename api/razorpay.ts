import { POST as postHandler } from '../app/api/razorpay/route';

export const config = {
  runtime: 'edge',
};

export async function POST(req: Request) {
  return postHandler(req);
}
