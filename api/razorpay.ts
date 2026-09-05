export const runtime = 'nodejs';

import { POST as postHandler } from '../app/api/razorpay/route';

export async function POST(req: Request) {
  return postHandler(req);
}
