/**
 * Unsplash 이미지 검색 서비스
 */

export class UnsplashService {
  constructor(accessKey) {
    this.accessKey = accessKey;
    this.baseUrl = 'https://api.unsplash.com';
  }

  async searchPhotos(query, options = {}) {
    const { count = 3, orientation = 'landscape' } = options;

    if (!this.accessKey) {
      console.log('⚠️  Unsplash API 키 없음 - 모의 데이터 반환');
      return this.getMockPhotos(query, count);
    }

    try {
      const params = new URLSearchParams({
        query,
        per_page: count,
        orientation
      });

      const response = await fetch(`${this.baseUrl}/search/photos?${params}`, {
        headers: {
          'Authorization': `Client-ID ${this.accessKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Unsplash API 오류: ${response.status}`);
      }

      const data = await response.json();

      return data.results.map(photo => ({
        id: photo.id,
        url: photo.urls.regular,
        thumbnailUrl: photo.urls.thumb,
        description: photo.description || photo.alt_description,
        author: photo.user.name,
        authorUrl: photo.user.links.html,
        downloadUrl: photo.links.download,
        source: 'unsplash'
      }));

    } catch (error) {
      console.error(`Unsplash 검색 오류: ${error.message}`);
      return this.getMockPhotos(query, count);
    }
  }

  getMockPhotos(query, count) {
    // 모의 데이터 (개발/테스트용)
    return Array.from({ length: count }, (_, i) => ({
      id: `mock-${i + 1}`,
      url: `https://source.unsplash.com/800x600/?${encodeURIComponent(query)}&sig=${i}`,
      thumbnailUrl: `https://source.unsplash.com/400x300/?${encodeURIComponent(query)}&sig=${i}`,
      description: `${query} 관련 이미지 ${i + 1}`,
      author: 'Unsplash',
      authorUrl: 'https://unsplash.com',
      source: 'unsplash-mock'
    }));
  }
}
