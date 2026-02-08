/**
 * Unsplash 이미지 검색 서비스
 * Fallback chain: Unsplash API → Picsum Photos → SVG placeholder
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

export class UnsplashService {
  accessKey: string | undefined;
  baseUrl: string;

  constructor(accessKey?: string) {
    this.accessKey = accessKey;
    this.baseUrl = 'https://api.unsplash.com';
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
    const images: UnsplashPhoto[] = [];
    for (let i = 0; i < count; i++) {
      const seed = encodeURIComponent(`${query}-${i}`);
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
