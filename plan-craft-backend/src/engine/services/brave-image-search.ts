/**
 * Brave Search Image API 서비스
 * 섹션 내용 기반 고관련성 이미지 검색 (RAG)
 */

import Anthropic from '@anthropic-ai/sdk';

export interface BraveImageResult {
  url: string;
  thumbnail: string;
  title: string;
  source: string;
  sourceUrl: string;
  width: number;
  height: number;
}

export interface ScoredImage extends BraveImageResult {
  relevanceScore: number;
  caption: string;
}

export class BraveImageSearchService {
  private apiKey: string | undefined;
  private anthropicKey: string | undefined;
  private baseUrl = 'https://api.search.brave.com/res/v1/images/search';

  constructor(braveApiKey?: string, anthropicApiKey?: string) {
    this.apiKey = braveApiKey;
    this.anthropicKey = anthropicApiKey;
  }

  isAvailable(): boolean {
    return !!(this.apiKey && this.apiKey.trim() !== '' && this.apiKey !== 'undefined');
  }

  /**
   * AI로 섹션 제목+내용에서 최적의 영문 이미지 검색 쿼리 생성
   */
  async generateSearchQuery(sectionTitle: string, sectionContent: string): Promise<string> {
    if (!this.anthropicKey) {
      // Fallback: 제목 기반 간단 쿼리
      return sectionTitle.replace(/[^\w\s가-힣]/g, ' ').trim();
    }

    try {
      const anthropic = new Anthropic({ apiKey: this.anthropicKey });
      const snippet = sectionContent.length > 500 ? sectionContent.slice(0, 500) : sectionContent;

      const msg = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 100,
        temperature: 0,
        system: `You generate precise English image search queries for professional business documents. Output ONLY the search query, nothing else. The query should find a high-quality, professional photograph or infographic that directly illustrates the section topic. Be specific — avoid generic terms like "business" or "technology" alone.`,
        messages: [{
          role: 'user',
          content: `Section title: ${sectionTitle}\nContent excerpt: ${snippet}\n\nGenerate one precise English image search query:`
        }]
      });

      const query = ((msg.content[0] as any).text || '').trim();
      console.log(`   🔍 검색 쿼리 생성: "${query}"`);
      return query || sectionTitle;
    } catch (e: any) {
      console.warn(`   ⚠️ 쿼리 생성 실패: ${e.message}`);
      return sectionTitle;
    }
  }

  /**
   * Brave Search Images API 호출
   */
  async searchImages(query: string, count: number = 10): Promise<BraveImageResult[]> {
    if (!this.isAvailable()) {
      console.log('ℹ️  BRAVE_SEARCH_API_KEY 없음 — 이미지 검색 스킵');
      return [];
    }

    try {
      const params = new URLSearchParams({
        q: query,
        count: String(count),
        safesearch: 'strict',
        search_lang: 'en',
      });

      const response = await fetch(`${this.baseUrl}?${params}`, {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': this.apiKey!,
        }
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.warn(`   ⚠️ Brave API 오류 ${response.status}: ${errText.slice(0, 200)}`);
        return [];
      }

      const data = await response.json();
      const results: BraveImageResult[] = [];

      if (data.results && Array.isArray(data.results)) {
        for (const item of data.results) {
          const w = item.properties?.width || item.width || 0;
          const h = item.properties?.height || item.height || 0;

          // 최소 해상도 필터: 800x600
          if (w < 800 || h < 600) continue;

          results.push({
            url: item.properties?.url || item.url || '',
            thumbnail: item.thumbnail?.src || item.properties?.url || item.url || '',
            title: item.title || '',
            source: item.source || item.url || '',
            sourceUrl: item.url || '',
            width: w,
            height: h,
          });
        }
      }

      console.log(`   📷 Brave 검색 결과: ${results.length}개 (${data.results?.length || 0}개 중 해상도 통과)`);
      return results;
    } catch (e: any) {
      console.warn(`   ⚠️ Brave 이미지 검색 실패: ${e.message}`);
      return [];
    }
  }

  /**
   * AI 기반 이미지 관련성 평가 (0-100)
   */
  async scoreImages(
    sectionTitle: string,
    sectionContent: string,
    candidates: BraveImageResult[]
  ): Promise<ScoredImage[]> {
    if (!this.anthropicKey || candidates.length === 0) {
      return [];
    }

    try {
      const anthropic = new Anthropic({ apiKey: this.anthropicKey });
      const snippet = sectionContent.length > 400 ? sectionContent.slice(0, 400) : sectionContent;

      const candidateList = candidates.slice(0, 8).map((c, i) => 
        `[${i}] title="${c.title}" source="${c.source}" ${c.width}x${c.height}`
      ).join('\n');

      const msg = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 600,
        temperature: 0,
        system: `You evaluate image relevance for professional business documents. Score each image candidate 0-100 based on:
1. Topic match with section content (50%)
2. Professional/business document suitability (30%)  
3. Image quality indicators (resolution, source credibility) (20%)

Return ONLY a JSON array: [{"index":0,"score":85,"caption":"Short descriptive caption in Korean"},...]
Only include images scoring 90+. If none qualify, return [].`,
        messages: [{
          role: 'user',
          content: `Section: ${sectionTitle}\nContent: ${snippet}\n\nCandidates:\n${candidateList}`
        }]
      });

      const text = ((msg.content[0] as any).text || '').trim();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const scores: Array<{ index: number; score: number; caption: string }> = JSON.parse(jsonMatch[0]);
      
      const scoredImages: ScoredImage[] = [];
      for (const s of scores) {
        if (s.score >= 95 && s.index >= 0 && s.index < candidates.length) {
          const candidate = candidates[s.index];
          scoredImages.push({
            ...candidate,
            relevanceScore: s.score,
            caption: s.caption || candidate.title,
          });
        }
      }

      // Sort by score descending
      scoredImages.sort((a, b) => b.relevanceScore - a.relevanceScore);

      console.log(`   🎯 관련성 평가: ${scoredImages.length}개 통과 (95점+ / ${candidates.length}개 후보)`);
      return scoredImages;
    } catch (e: any) {
      console.warn(`   ⚠️ 이미지 평가 실패: ${e.message}`);
      return [];
    }
  }

  /**
   * 전체 파이프라인: 쿼리 생성 → 검색 → 평가 → 최고 이미지 반환
   */
  async findBestImage(
    sectionTitle: string,
    sectionContent: string
  ): Promise<ScoredImage | null> {
    if (!this.isAvailable()) return null;

    console.log(`\n🔎 [BraveImageRAG] "${sectionTitle}" 이미지 검색 시작`);

    // Wrap entire pipeline in 15s timeout (reduced from 30s)
    const timeoutMs = 15000;
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        console.warn(`   ⏰ [BraveImageRAG] "${sectionTitle}" 타임아웃 (${timeoutMs}ms) — fallback`);
        resolve(null);
      }, timeoutMs);
    });

    const searchPromise = (async (): Promise<ScoredImage | null> => {
      try {
        // 1. Generate query
        const query = await this.generateSearchQuery(sectionTitle, sectionContent);

        // 2. Search
        const candidates = await this.searchImages(query, 10);
        if (candidates.length === 0) {
          console.log(`   ℹ️ 검색 결과 없음 — fallback`);
          return null;
        }

        // 3. Score
        const scored = await this.scoreImages(sectionTitle, sectionContent, candidates);
        if (scored.length === 0) {
          console.log(`   ℹ️ 95점+ 이미지 없음 — fallback`);
          return null;
        }

        console.log(`   ✅ 최고 이미지: score=${scored[0].relevanceScore}, "${scored[0].title.slice(0, 50)}"`);
        return scored[0];
      } catch (error: any) {
        console.error(`   ❌ [BraveImageRAG] "${sectionTitle}" 검색 실패: ${error.message}`);
        return null;
      }
    })();

    return Promise.race([searchPromise, timeoutPromise]);
  }
}
