/**
 * arXiv API — free preprint search
 * No rate limit (be respectful, ~3s between requests)
 * Returns Atom XML
 */

interface ArxivPaper {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  published: string;
  categories: string[];
  pdfUrl: string;
  link: string;
}

export class ArxivService {
  private baseUrl = 'http://export.arxiv.org/api/query';
  private lastRequestTime = 0;

  private async throttle() {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < 3000) {
      await new Promise(r => setTimeout(r, 3000 - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  async searchPapers(query: string, maxResults: number = 10): Promise<ArxivPaper[]> {
    await this.throttle();
    
    try {
      const url = `${this.baseUrl}?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${maxResults}&sortBy=relevance`;
      const res = await fetch(url);
      if (!res.ok) return [];
      
      const xml = await res.text();
      return this.parseAtomXml(xml);
    } catch (e: any) {
      console.error('[arXiv] Error:', e.message);
      return [];
    }
  }

  private parseAtomXml(xml: string): ArxivPaper[] {
    const papers: ArxivPaper[] = [];
    const entries = xml.split('<entry>').slice(1);
    
    for (const entry of entries) {
      const getTag = (tag: string) => {
        const match = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
        return match ? match[1].trim() : '';
      };
      
      const id = getTag('id');
      const title = getTag('title').replace(/\s+/g, ' ');
      const summary = getTag('summary').replace(/\s+/g, ' ');
      const published = getTag('published');
      
      // Extract authors
      const authorMatches = entry.match(/<name>([^<]+)<\/name>/g) || [];
      const authors = authorMatches.map(m => m.replace(/<\/?name>/g, ''));
      
      // Extract categories
      const catMatches = entry.match(/category term="([^"]+)"/g) || [];
      const categories = catMatches.map(m => m.match(/"([^"]+)"/)?.[1] || '');
      
      // PDF link
      const pdfMatch = entry.match(/href="([^"]*)"[^>]*title="pdf"/);
      const pdfUrl = pdfMatch ? pdfMatch[1] : id.replace('abs', 'pdf');
      
      papers.push({ id, title, summary, authors, published, categories, pdfUrl, link: id });
    }
    
    return papers;
  }

  formatCitation(paper: ArxivPaper): string {
    const year = paper.published ? new Date(paper.published).getFullYear() : 'n.d.';
    return `${paper.authors.join(', ')} (${year}). ${paper.title}. arXiv. ${paper.link}`;
  }
}
