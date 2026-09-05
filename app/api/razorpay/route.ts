import { createTestOrderId, getRazorpayKeyId } from '../../../lib/razorpay';

export function handleRazorpayPayload(body: any) {
  const { action, amountPaise, customerName } = body || {};

  if (action === 'createRazorpayOrder') {
    if (!amountPaise || amountPaise <= 0) {
      throw new Error('Invalid order amount');
    }

    const razorpayOrderId = createTestOrderId();
    const keyId = getRazorpayKeyId();

    return {
      ok: true,
      razorpayOrderId,
      amountPaise,
      currency: 'INR',
      keyId,
      customerName: customerName || 'Demo Customer',
    };
  }

  if (action === 'verifyPayment') {
    const { paymentId, orderId } = body || {};
    if (!paymentId || !orderId) {
      throw new Error('Missing payment parameters');
    }

    return {
      ok: true,
      verified: true,
      paymentId,
      orderId,
    };
  }

  throw new Error('Unsupported action');
}

export async function POST(req: Request) {
  try {
    const body: any = await req.json();
    return Response.json(handleRazorpayPayload(body));
  } catch (err: any) {
    return Response.json(
      { error: err?.message || 'Payment error' },
      { status: 400 }
    );
  }
}
