/**
 * Unsplash 이미지 검색 서비스
 * v4.0: 한글→영어 키워드 매핑으로 Picsum 이미지 품질 개선
 */

export interface UnsplashPhoto {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  credit: string;
  authorUrl: string;
  source: string;
}

export interface SearchOptions {
  count?: number;
  orientation?: string;
}

// 한글 키워드 → 영어 매핑 (Picsum seed용)
const KEYWORD_MAP: Record<string, string> = {
  // 비즈니스
  '사업': 'business', '시장': 'market', '분석': 'analysis', '전략': 'strategy',
  '마케팅': 'marketing', '투자': 'investment', '재무': 'finance', '예산': 'budget',
  '매출': 'revenue', '수익': 'profit', '성장': 'growth', '경쟁': 'competition',
  '고객': 'customer', '타겟': 'target', '브랜드': 'brand', '광고': 'advertising',
  // 기술
  '기술': 'technology', '시스템': 'system', '개발': 'development', '설계': 'design',
  '아키텍처': 'architecture', '데이터': 'data', '서버': 'server', '클라우드': 'cloud',
  '보안': 'security', '네트워크': 'network', '인공지능': 'ai', 'AI': 'ai',
  '소프트웨어': 'software', '플랫폼': 'platform', '앱': 'app', '웹': 'web',
  // 조직/관리
  '팀': 'team', '조직': 'organization', '인력': 'workforce', '관리': 'management',
  '프로젝트': 'project', '일정': 'schedule', '품질': 'quality', '운영': 'operations',
  // 연구
  '연구': 'research', '논문': 'paper', '실험': 'experiment', '결과': 'results',
  '방법론': 'methodology', '학술': 'academic',
  // 공공
  '정부': 'government', '정책': 'policy', '공공': 'public', '복지': 'welfare',
  '환경': 'environment', '교육': 'education', '의료': 'healthcare', '인프라': 'infrastructure',
  // 산업
  '제조': 'manufacturing', '물류': 'logistics', '유통': 'distribution', '농업': 'agriculture',
  '에너지': 'energy', '건설': 'construction', '부동산': 'realestate', '금융': 'banking',
};

export class UnsplashService {
  accessKey: string | undefined;
  baseUrl: string;

  constructor(accessKey?: string) {
    this.accessKey = accessKey;
    this.baseUrl = 'https://api.unsplash.com';
  }

  /**
   * 한글 query를 영어 키워드로 변환
   */
  _translateQuery(query: string): string {
    // Check if already English
    if (/^[a-zA-Z0-9\s]+$/.test(query.trim())) {
      return query.trim().toLowerCase();
    }

    const matched: string[] = [];
    for (const [kr, en] of Object.entries(KEYWORD_MAP)) {
      if (query.includes(kr)) {
        matched.push(en);
      }
    }

    if (matched.length > 0) {
      return matched.slice(0, 3).join('-');
    }

    // Fallback: use hash-based generic keywords
    const genericSeeds = ['business', 'technology', 'strategy', 'innovation', 'analytics', 'teamwork'];
    const idx = Math.abs(this.hashCode(query)) % genericSeeds.length;
    return genericSeeds[idx];
  }

  async searchPhotos(query: string, options: SearchOptions = {}): Promise<UnsplashPhoto[]> {
    const { count = 3, orientation = 'landscape' } = options;

    if (this.accessKey && this.accessKey !== 'undefined' && this.accessKey.trim() !== '') {
      try {
        const params = new URLSearchParams({
          query,
          per_page: String(count),
          orientation
        });

        const response = await fetch(`${this.baseUrl}/search/photos?${params}`, {
          headers: {
            'Authorization': `Client-ID ${this.accessKey}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            return data.results.map((photo: any) => ({
              id: photo.id,
              url: photo.urls.regular,
              thumb: photo.urls.thumb,
              alt: photo.alt_description || photo.description || query,
              credit: `Photo by ${photo.user.name} on Unsplash`,
              authorUrl: photo.user.links?.html || 'https://unsplash.com',
              source: 'unsplash'
            }));
          }
        } else {
          console.warn(`⚠️  Unsplash API 응답 오류: ${response.status}`);
        }
      } catch (e: any) {
        console.warn('⚠️  Unsplash API 호출 실패, 폴백 사용:', e.message);
      }
    } else {
      console.log('ℹ️  Unsplash API 키 없음 - 폴백 이미지 사용');
    }

    return this.getPicsumPhotos(query, count);
  }

  getPicsumPhotos(query: string, count: number): UnsplashPhoto[] {
    const englishQuery = this._translateQuery(query);
    const images: UnsplashPhoto[] = [];
    for (let i = 0; i < count; i++) {
      const seed = encodeURIComponent(`${englishQuery}-${i}`);
      images.push({
        id: `picsum-${seed}-${i}`,
        url: `https://picsum.photos/seed/${seed}/800/450`,
        thumb: `https://picsum.photos/seed/${seed}/400/225`,
        alt: query,
        credit: 'Photo from Lorem Picsum',
        authorUrl: 'https://picsum.photos',
        source: 'picsum'
      });
    }
    return images;
  }

  generateSvgPlaceholder(query: string, width: number = 800, height: number = 450): UnsplashPhoto {
    const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];
    const color = colors[Math.abs(this.hashCode(query)) % colors.length];
    const label = query.length > 40 ? query.slice(0, 37) + '...' : query;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="font-family:sans-serif">
      <rect width="${width}" height="${height}" fill="#F8FAFC" rx="12"/>
      <rect x="8" y="8" width="${width - 16}" height="${height - 16}" fill="white" rx="8" stroke="${color}" stroke-width="2" stroke-dasharray="8 4"/>
      <circle cx="${width / 2}" cy="${height / 2 - 30}" r="40" fill="${color}" opacity="0.15"/>
      <text x="${width / 2}" y="${height / 2 - 25}" text-anchor="middle" font-size="36" fill="${color}">🖼️</text>
      <text x="${width / 2}" y="${height / 2 + 30}" text-anchor="middle" font-size="16" font-weight="600" fill="#374151">${this.escapeXml(label)}</text>
      <text x="${width / 2}" y="${height / 2 + 55}" text-anchor="middle" font-size="12" fill="#9CA3AF">이미지 플레이스홀더</text>
    </svg>`;

    const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    return {
      id: `svg-placeholder-${Date.now()}`,
      url: dataUri,
      thumb: dataUri,
      alt: query,
      credit: 'SVG Placeholder',
      authorUrl: '',
      source: 'svg-placeholder'
    };
  }

  hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const chr = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return hash;
  }

  escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
