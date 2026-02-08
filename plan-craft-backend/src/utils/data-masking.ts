/**
 * 민감정보 마스킹 유틸리티
 * 개인정보, 회사 기밀, 금융 정보 등을 자동으로 감지하고 마스킹
 */

// 민감정보 패턴 정의
const SENSITIVE_PATTERNS = {
  // 이메일
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // 전화번호 (한국)
  phone_kr: /0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}/g,
  
  // 전화번호 (국제)
  phone_intl: /\+\d{1,3}[-\s]?\d{1,4}[-\s]?\d{1,4}[-\s]?\d{1,9}/g,
  
  // 주민등록번호
  ssn_kr: /\d{6}[-\s]?[1-4]\d{6}/g,
  
  // 신용카드번호
  credit_card: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  
  // IP 주소
  ip_address: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  
  // API 키 (일반적인 패턴)
  api_key: /\b[A-Za-z0-9_-]{20,}\b/g,
  
  // 비밀번호 관련 (password= 형태)
  password: /password\s*[:=]\s*[^\s,;]+/gi,
  
  // 은행 계좌번호 (한국)
  bank_account_kr: /\d{3,4}[-\s]?\d{2,6}[-\s]?\d{2,7}/g
};

// 마스킹 타입별 처리
const MASKING_STRATEGIES = {
  // 완전 마스킹: ***
  full: (match) => '*'.repeat(Math.min(match.length, 10)),
  
  // 부분 마스킹: 앞뒤 2자만 보이기
  partial: (match) => {
    if (match.length <= 4) return '*'.repeat(match.length);
    return match.substring(0, 2) + '*'.repeat(match.length - 4) + match.substring(match.length - 2);
  },
  
  // 이메일 마스킹: us***@ex***.com
  email: (match) => {
    const [local, domain] = match.split('@');
    const localMasked = local.length > 2 
      ? local.substring(0, 2) + '***' 
      : local;
    const [domainName, tld] = domain.split('.');
    const domainMasked = domainName.length > 2
      ? domainName.substring(0, 2) + '***'
      : domainName;
    return `${localMasked}@${domainMasked}.${tld}`;
  },
  
  // 전화번호 마스킹: 010-****-1234
  phone: (match) => {
    const cleaned = match.replace(/[-\s]/g, '');
    if (cleaned.length === 11) { // 한국 휴대폰
      return cleaned.substring(0, 3) + '-****-' + cleaned.substring(7);
    }
    return match.substring(0, Math.min(3, match.length)) + '****' + match.substring(Math.max(match.length - 4, 3));
  },
  
  // 주민등록번호 마스킹: 990101-*******
  ssn: (match) => {
    const cleaned = match.replace(/[-\s]/g, '');
    return cleaned.substring(0, 6) + '-*******';
  }
};

/**
 * 텍스트에서 민감정보를 감지하고 마스킹
 * @param {string} text - 원본 텍스트
 * @param {object} options - 마스킹 옵션
 * @returns {object} - {masked: 마스킹된 텍스트, detections: 감지된 항목들}
 */
export function maskSensitiveData(text, options = {}) {
  if (!text || typeof text !== 'string') {
    return { masked: text, detections: [] };
  }

  const {
    enableEmail = true,
    enablePhone = true,
    enableSSN = true,
    enableCreditCard = true,
    enableIP = false, // IP는 선택적
    enableAPIKey = true,
    enablePassword = true,
    enableBankAccount = true,
    strategy = 'partial' // 기본 전략
  } = options;

  let masked = text;
  const detections = [];

  // 이메일 마스킹
  if (enableEmail) {
    masked = masked.replace(SENSITIVE_PATTERNS.email, (match) => {
      detections.push({ type: 'email', original: match });
      return MASKING_STRATEGIES.email(match);
    });
  }

  // 전화번호 마스킹
  if (enablePhone) {
    masked = masked.replace(SENSITIVE_PATTERNS.phone_kr, (match) => {
      detections.push({ type: 'phone', original: match });
      return MASKING_STRATEGIES.phone(match);
    });
    masked = masked.replace(SENSITIVE_PATTERNS.phone_intl, (match) => {
      detections.push({ type: 'phone', original: match });
      return MASKING_STRATEGIES.phone(match);
    });
  }

  // 주민등록번호 마스킹
  if (enableSSN) {
    masked = masked.replace(SENSITIVE_PATTERNS.ssn_kr, (match) => {
      detections.push({ type: 'ssn', original: match });
      return MASKING_STRATEGIES.ssn(match);
    });
  }

  // 신용카드번호 마스킹
  if (enableCreditCard) {
    masked = masked.replace(SENSITIVE_PATTERNS.credit_card, (match) => {
      detections.push({ type: 'credit_card', original: match });
      const cleaned = match.replace(/[-\s]/g, '');
      return '****-****-****-' + cleaned.substring(cleaned.length - 4);
    });
  }

  // IP 주소 마스킹 (선택적)
  if (enableIP) {
    masked = masked.replace(SENSITIVE_PATTERNS.ip_address, (match) => {
      detections.push({ type: 'ip', original: match });
      const parts = match.split('.');
      return parts[0] + '.***.***.***';
    });
  }

  // API 키 마스킹 (매우 긴 문자열만)
  if (enableAPIKey) {
    // password, token, key 등의 키워드가 있는 경우만
    const apiKeyPattern = /\b(api[_-]?key|token|secret|password|auth[_-]?key)[:\s=]+([A-Za-z0-9_-]{20,})\b/gi;
    masked = masked.replace(apiKeyPattern, (match, keyword, value) => {
      detections.push({ type: 'api_key', original: value });
      return keyword + ': ' + MASKING_STRATEGIES.partial(value);
    });
  }

  // 비밀번호 마스킹
  if (enablePassword) {
    masked = masked.replace(SENSITIVE_PATTERNS.password, (match) => {
      detections.push({ type: 'password', original: match });
      return 'password: ********';
    });
  }

  // 은행 계좌번호 마스킹
  if (enableBankAccount) {
    // 숫자만으로 이루어진 10-14자리 (한국 은행 계좌)
    const accountPattern = /\b\d{10,14}\b/g;
    masked = masked.replace(accountPattern, (match) => {
      // 계좌번호일 가능성이 있는 경우만 (너무 많이 매칭되지 않도록)
      if (match.length >= 10 && match.length <= 14) {
        detections.push({ type: 'bank_account', original: match });
        return '****-**-' + match.substring(match.length - 4);
      }
      return match;
    });
  }

  return {
    masked,
    detections,
    hasSensitiveData: detections.length > 0
  };
}

/**
 * 회사명/프로젝트명 마스킹 (선택적)
 * @param {string} text - 원본 텍스트
 * @param {array} companyNames - 마스킹할 회사명 목록
 * @returns {string} - 마스킹된 텍스트
 */
export function maskCompanyNames(text, companyNames = []) {
  if (!text || !companyNames.length) return text;

  let masked = text;
  companyNames.forEach((name, index) => {
    const regex = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    masked = masked.replace(regex, `[회사${index + 1}]`);
  });

  return masked;
}

/**
 * 로그 출력용 안전한 텍스트 생성
 * @param {string} text - 원본 텍스트
 * @returns {string} - 마스킹된 텍스트
 */
export function sanitizeForLogging(text) {
  const { masked } = maskSensitiveData(text, {
    enableEmail: true,
    enablePhone: true,
    enableSSN: true,
    enableCreditCard: true,
    enableAPIKey: true,
    enablePassword: true,
    enableBankAccount: true
  });
  return masked;
}

// 테스트용 함수
export function testMasking() {
  const testCases = [
    'Contact me at john.doe@example.com or call 010-1234-5678',
    'My SSN is 990101-1234567 and credit card is 1234-5678-9012-3456',
    'Server IP: 192.168.1.100, API Key: sk-ant-api03-ORkGlLIpNpxZsf6cKP7A',
    'password: mySecretPass123',
    'Bank account: 110-123-456789'
  ];

  console.log('\n===== 민감정보 마스킹 테스트 =====\n');
  testCases.forEach((test, i) => {
    const result = maskSensitiveData(test);
    console.log(`Test ${i + 1}:`);
    console.log(`  원본: ${test}`);
    console.log(`  마스킹: ${result.masked}`);
    console.log(`  감지: ${result.detections.length}개\n`);
  });
}
