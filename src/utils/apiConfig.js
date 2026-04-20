import CryptoJS from 'crypto-js';
import axios from 'axios';

// ===== 설정값은 .env가 아닌 localStorage에서 읽어옴 =====
export const getConfig = () => {
  const raw = localStorage.getItem('aqara_config');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const saveConfig = (config) => {
  localStorage.setItem('aqara_config', JSON.stringify(config));
};

export const clearConfig = () => {
  localStorage.removeItem('aqara_config');
};

// ===== 서명 생성 =====
const generateSign = (headers, appKey) => {
  const parts = [];
  if (headers.Accesstoken) parts.push(`accesstoken=${headers.Accesstoken}`);
  parts.push(`appid=${headers.Appid}`);
  parts.push(`keyid=${headers.Keyid}`);
  parts.push(`nonce=${headers.Nonce}`);
  parts.push(`time=${headers.Time}`);

  const raw = parts.join('&') + appKey;
  return CryptoJS.MD5(raw.toLowerCase()).toString().toLowerCase();
};

// ===== API 엔드포인트 (로컬: vite proxy, Vercel: vercel.json rewrite) =====
const getApiUrl = () => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return '/aqara-api'; // vite.config.js 프록시
  }
  return '/api/aqara/v3.0/open/api'; // vercel.json rewrite
};

// ===== API 호출 =====
export const callApi = async (intent, data = {}, accessToken = '') => {
  const config = getConfig();
  if (!config) throw new Error('API 설정이 없습니다. 먼저 설정 화면에서 키를 입력해 주세요.');

  const { appId, appKey, keyId } = config;
  const time = Date.now().toString();
  const nonce = Math.random().toString(36).substring(2, 17);

  const headers = {
    Appid: appId,
    Keyid: keyId,
    Nonce: nonce,
    Time: time,
    Lang: 'en',
  };

  if (accessToken && accessToken.trim()) {
    headers.Accesstoken = accessToken;
  }

  headers.Sign = generateSign(headers, appKey);

  try {
    const res = await axios.post(getApiUrl(), { intent, data }, {
      headers: { ...headers, 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    if (res.data.code !== 0) {
      throw new Error(`${res.data.message} (코드: ${res.data.code})`);
    }
    return res.data.result;
  } catch (err) {
    if (err.response?.data?.message) {
      throw new Error(`${err.response.data.message} (코드: ${err.response.data.code})`);
    }
    throw new Error(err.message);
  }
};
