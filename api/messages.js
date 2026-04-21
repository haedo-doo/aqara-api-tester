import { Redis } from '@upstash/redis';

// 저장된 Push 메시지 조회/삭제 엔드포인트
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { openId } = req.query;
  if (!openId) return res.status(400).json({ code: -1, message: 'openId 파라미터 필요' });

  try {
    const redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });

    const key = `aqara:messages:${openId}`;

    if (req.method === 'DELETE') {
      await redis.del(key);
      return res.status(200).json({ code: 0, message: '삭제 완료' });
    }

    if (req.method !== 'GET') return res.status(405).json({ code: -1, message: '허용되지 않는 메서드' });

    const raw = await redis.lrange(key, 0, 99);
    const messages = raw.map(item => typeof item === 'string' ? JSON.parse(item) : item);
    return res.status(200).json({ code: 0, messages });

  } catch (err) {
    console.error('메시지 처리 오류:', err.message);
    return res.status(500).json({ code: -1, message: err.message });
  }
}