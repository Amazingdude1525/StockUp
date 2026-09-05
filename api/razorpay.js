// lib/razorpay.ts
function getRazorpayKeyId() {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_stockup2026";
}
function createTestOrderId() {
  return "order_" + Math.random().toString(36).substring(2, 15);
}

// app/api/razorpay/route.ts
function handleRazorpayPayload(body) {
  const { action, amountPaise, customerName } = body || {};
  if (action === "createRazorpayOrder") {
    if (!amountPaise || amountPaise <= 0) {
      throw new Error("Invalid order amount");
    }
    const razorpayOrderId = createTestOrderId();
    const keyId = getRazorpayKeyId();
    return {
      ok: true,
      razorpayOrderId,
      amountPaise,
      currency: "INR",
      keyId,
      customerName: customerName || "Demo Customer"
    };
  }
  if (action === "verifyPayment") {
    const { paymentId, orderId } = body || {};
    if (!paymentId || !orderId) {
      throw new Error("Missing payment parameters");
    }
    return {
      ok: true,
      verified: true,
      paymentId,
      orderId
    };
  }
  throw new Error("Unsupported action");
}
async function POST(req) {
  try {
    const body = await req.json();
    return Response.json(handleRazorpayPayload(body));
  } catch (err) {
    return Response.json(
      { error: err?.message || "Payment error" },
      { status: 400 }
    );
  }
}
export {
  POST,
  handleRazorpayPayload
};

export default async function handler(req, res) { try { if (req.method === 'POST') { const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); const data = handleRazorpayPayload(body); return res.status(200).json(data); } return res.status(405).json({ error: 'Method not allowed' }); } catch (err) { return res.status(400).json({ error: err?.message || 'Payment error' }); } }
