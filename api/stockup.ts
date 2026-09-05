import { getStockUpDataState, handleStockUpActionPayload } from '../app/api/stockup/route';

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const data = await getStockUpDataState();
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const data = await handleStockUpActionPayload(body);
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('API StockUp Error:', err);
    return res.status(400).json({
      error: err?.message || 'Operation failed',
    });
  }
}
