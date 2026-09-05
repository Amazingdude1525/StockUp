import { handleRazorpayPayload } from '../app/api/razorpay/route';

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const data = handleRazorpayPayload(body);
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(400).json({
      error: err?.message || 'Payment error',
    });
  }
}
