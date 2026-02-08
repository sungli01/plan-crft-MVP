/**
 * Semantic Scholar API — free academic paper search
 * Rate limit: 100 requests per 5 minutes (no API key needed)
 * Docs: https://api.semanticscholar.org/api-docs/
 */

interface Paper {
  paperId: string;
  title: string;
  abstract: string | null;
  year: number | null;
  citationCount: number;
  authors: { name: string }[];
  url: string;
  venue: string | null;
  fieldsOfStudy: string[] | null;
}

interface SearchResult {
  papers: Paper[];
  total: number;
  query: string;
  source: 'semantic-scholar';
}

export class SemanticScholarService {
  private baseUrl = 'https://api.semanticscholar.org/graph/v1';
  private lastRequestTime = 0;
  private minInterval = 3100; // ~100 req per 5 min = 3s between requests

  private async throttle() {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minInterval) {
      await new Promise(r => setTimeout(r, this.minInterval - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  async searchPapers(query: string, limit: number = 10): Promise<SearchResult> {
    await this.throttle();
    
    try {
      const fields = 'paperId,title,abstract,year,citationCount,authors,url,venue,fieldsOfStudy';
      const url = `${this.baseUrl}/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=${fields}`;
      
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[SemanticScholar] Search failed: ${res.status}`);
        return { papers: [], total: 0, query, source: 'semantic-scholar' };
      }
      
      const data = await res.json() as any;
      return {
        papers: (data.data || []).map((p: any) => ({
          paperId: p.paperId,
          title: p.title,
          abstract: p.abstract,
          year: p.year,
          citationCount: p.citationCount || 0,
          authors: p.authors || [],
          url: p.url || `https://www.semanticscholar.org/paper/${p.paperId}`,
          venue: p.venue,
          fieldsOfStudy: p.fieldsOfStudy,
        })),
        total: data.total || 0,
        query,
        source: 'semantic-scholar',
      };
    } catch (e: any) {
      console.error('[SemanticScholar] Error:', e.message);
      return { papers: [], total: 0, query, source: 'semantic-scholar' };
    }
  }

  async getPaperDetails(paperId: string): Promise<Paper | null> {
    await this.throttle();
    try {
      const fields = 'paperId,title,abstract,year,citationCount,authors,url,venue,fieldsOfStudy,references,citations';
      const res = await fetch(`${this.baseUrl}/paper/${paperId}?fields=${fields}`);
      if (!res.ok) return null;
      return await res.json() as Paper;
    } catch {
      return null;
    }
  }

  // Generate APA-style citations
  formatCitation(paper: Paper): string {
    const authors = paper.authors.map(a => a.name).join(', ');
    const year = paper.year || 'n.d.';
    return `${authors} (${year}). ${paper.title}. ${paper.venue || ''}`.trim();
  }
}
