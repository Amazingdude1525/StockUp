import { createTestOrderId, getRazorpayKeyId } from '../../../lib/razorpay';

export async function POST(req: Request) {
  try {
    const body: any = await req.json();
    const { action, amountPaise, customerName } = body;

    if (action === 'createRazorpayOrder') {
      if (!amountPaise || amountPaise <= 0) {
        return Response.json({ error: 'Invalid order amount' }, { status: 400 });
      }

      const razorpayOrderId = createTestOrderId();
      const keyId = getRazorpayKeyId();

      return Response.json({
        ok: true,
        razorpayOrderId,
        amountPaise,
        currency: 'INR',
        keyId,
        customerName: customerName || 'Demo Customer',
      });
    }

    if (action === 'verifyPayment') {
      const { paymentId, orderId } = body;
      if (!paymentId || !orderId) {
        return Response.json({ error: 'Missing payment parameters' }, { status: 400 });
      }

      return Response.json({
        ok: true,
        verified: true,
        paymentId,
        orderId,
      });
    }

    return Response.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Payment error' },
      { status: 500 }
    );
  }
}
