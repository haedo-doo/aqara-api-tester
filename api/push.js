import { kv } from '@vercel/kv';

// Aqara HTTP Push 수신 엔드포인트
// openId별로 메시지 분리 저장
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, token, time, nonce, appkey, sign');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ code: -1, message: '허용되지 않는 메서드' });

  try {
    const message = req.body;
    if (!message) return res.status(400).json({ code: -1, message: '빈 요청' });

    const openId = message.openId;
    if (!openId) {
      console.warn('openId 없는 메시지:', JSON.stringify(message));
      return res.status(200).json({ code: 0 });
    }

    const entry = { ...message, receivedAt: Date.now() };
    const key = `aqara:messages:${openId}`;

    await kv.lpush(key, JSON.stringify(entry));
    await kv.ltrim(key, 0, 99);

    // Aqara 공식 규격 응답
    return res.status(200).json({ code: 0 });
  } catch (err) {
    console.error('Push 수신 오류:', err);
    return res.status(500).json({ code: -1, message: err.message });
  }
}