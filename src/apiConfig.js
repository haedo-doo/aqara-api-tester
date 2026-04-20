import CryptoJS from 'crypto-js';
import axios from 'axios';

// ===== 설정값은 localStorage에서 읽어옴 (.env 미사용) =====
export const getConfig = () => {
  const raw = localStorage.getItem('aqara_config');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};
export const saveConfig = (config) => localStorage.setItem('aqara_config', JSON.stringify(config));
export const clearConfig = () => localStorage.removeItem('aqara_config');

// ===== 서명 생성 =====
const generateSign = (headers, appKey) => {
  const parts = [];
  if (headers.Accesstoken) parts.push(`accesstoken=${headers.Accesstoken}`);
  parts.push(`appid=${headers.Appid}`);
  parts.push(`keyid=${headers.Keyid}`);
  parts.push(`nonce=${headers.Nonce}`);
  parts.push(`time=${headers.Time}`);
  return CryptoJS.MD5((parts.join('&') + appKey).toLowerCase()).toString().toLowerCase();
};

// ===== API URL (로컬: vite proxy, Vercel: vercel.json rewrite) =====
const getApiUrl = () => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return '/aqara-api';
  }
  return '/api/aqara/v3.0/open/api';
};

// ===== API 호출 - 원본과 동일한 에러 처리 로직 =====
export const callApi = async (intent, data = {}, accessToken = '') => {
  const config = getConfig();
  if (!config) throw new Error('API 설정이 없습니다. ⚙️ 설정에서 키를 입력해 주세요.');

  const { appId, appKey, keyId } = config;
  const time = Date.now().toString();
  const nonce = Math.random().toString(36).substring(2, 17);

  const headers = { Appid: appId, Keyid: keyId, Nonce: nonce, Time: time, Lang: 'en' };
  if (accessToken && accessToken.trim()) headers.Accesstoken = accessToken;
  headers.Sign = generateSign(headers, appKey);

  try {
    const res = await axios.post(getApiUrl(), { intent, data }, {
      headers: { ...headers, 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    // 원본과 동일 - code !== 0이면 에러 로그 찍고 throw
    if (res.data.code !== 0) {
      console.log(`[callApi] API 에러 응답 (intent=${intent}):`, JSON.stringify(res.data, null, 2));
      throw new Error(`${res.data.message} (코드: ${res.data.code})`);
    }

    return res.data;
  } catch (err) {
    // 원본과 동일 - catch에서도 로그 찍기
    console.log(`[callApi] 호출 실패 (intent=${intent}):`, err.response?.data || err.message);
    throw new Error(err.response?.data?.message || err.message);
  }
};