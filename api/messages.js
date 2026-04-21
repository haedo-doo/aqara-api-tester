import { kv } from '@vercel/kv';

// 저장된 Push 메시지 조회/삭제 엔드포인트
// openId를 쿼리 파라미터로 받아서 해당 사용자의 메시지만 반환
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { openId } = req.query;
  if (!openId) return res.status(400).json({ code: -1, message: 'openId 파라미터 필요' });

  const key = `aqara:messages:${openId}`;

  if (req.method === 'DELETE') {
    try {
      await kv.del(key);
      return res.status(200).json({ code: 0, message: '삭제 완료' });
    } catch (err) {
      return res.status(500).json({ code: -1, message: err.message });
    }
  }

  if (req.method !== 'GET') return res.status(405).json({ code: -1, message: '허용되지 않는 메서드' });

  try {
    const raw = await kv.lrange(key, 0, 99);
    const messages = raw.map(item => typeof item === 'string' ? JSON.parse(item) : item);
    return res.status(200).json({ code: 0, messages });
  } catch (err) {
    console.error('메시지 조회 오류:', err);
    return res.status(500).json({ code: -1, message: err.message });
  }
}