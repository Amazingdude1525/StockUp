import { NextResponse } from 'next/server';
import { createTestOrderId, getRazorpayKeyId } from '@/lib/razorpay';

export async function POST(req: Request) {
  try {
    const body: any = await req.json();
    const { action, amountPaise, customerName } = body;

    if (action === 'createRazorpayOrder') {
      if (!amountPaise || amountPaise <= 0) {
        return NextResponse.json({ error: 'Invalid order amount' }, { status: 400 });
      }

      const razorpayOrderId = createTestOrderId();
      const keyId = getRazorpayKeyId();

      return NextResponse.json({
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
        return NextResponse.json({ error: 'Missing payment parameters' }, { status: 400 });
      }

      return NextResponse.json({
        ok: true,
        verified: true,
        paymentId,
        orderId,
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Payment error' },
      { status: 500 }
    );
  }
}
