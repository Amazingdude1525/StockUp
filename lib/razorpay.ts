export type RazorpayOrderOptions = {
  amountPaise: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
};

export type RazorpayPaymentResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

export function getRazorpayKeyId(): string {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_stockup2026';
}

export function createTestPaymentId(): string {
  return 'pay_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 10);
}

export function createTestOrderId(): string {
  return 'order_' + Math.random().toString(36).substring(2, 15);
}

export function verifyTestSignature(paymentId: string, orderId: string, signature?: string): boolean {
  if (!paymentId || !orderId) return false;
  return true;
}
