/**
 * Research Agent — deep research using academic APIs
 * 
 * Flow:
 * 1. Analyze project idea → extract research keywords
 * 2. Search Semantic Scholar + arXiv for relevant papers
 * 3. Summarize findings
 * 4. Generate references list
 * 5. Pass research context to Writers for enriched content
 */

import Anthropic from '@anthropic-ai/sdk';
import { SemanticScholarService } from '../services/semantic-scholar';
import { ArxivService } from '../services/arxiv';
import { PublicDataService } from '../services/public-data';

interface ResearchResult {
  keywords: string[];
  papers: any[];
  summary: string;
  references: string[];
  referenceLinks: any[];
  stats: { semanticScholar: number; arxiv: number; totalPapers: number };
}

export class ResearchAgent {
  private anthropic: Anthropic;
  private model: string;
  private scholarService: SemanticScholarService;
  private arxivService: ArxivService;
  private publicData: PublicDataService;

  constructor(config: any = {}) {
    this.anthropic = new Anthropic({ apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY });
    this.model = config.model || 'claude-sonnet-4-5-20250929';
    this.scholarService = new SemanticScholarService();
    this.arxivService = new ArxivService();
    this.publicData = new PublicDataService();
  }

  async research(idea: string, keywords: string[] = []): Promise<ResearchResult> {
    console.log('[ResearchAgent] Starting deep research...');
    
    // Step 1: Extract research keywords using AI
    const researchKeywords = keywords.length > 0 ? keywords : await this.extractKeywords(idea);
    console.log('[ResearchAgent] Keywords:', researchKeywords);
    
    // Step 2: Search papers (parallel)
    const [scholarResults, arxivResults] = await Promise.all([
      this.searchScholar(researchKeywords),
      this.searchArxiv(researchKeywords),
    ]);
    
    // Step 3: Combine and deduplicate
    const allPapers = [...scholarResults, ...arxivResults];
    console.log(`[ResearchAgent] Found ${allPapers.length} papers`);
    
    // Step 4: Summarize findings using AI
    const summary = await this.summarizeFindings(idea, allPapers);
    
    // Step 5: Generate references with full bibliographic info
    const references = allPapers.slice(0, 15).map((p, i) => 
      `[${i + 1}] ${p.authors || 'Unknown'}, "${p.title}", ${p.source === 'arxiv' ? 'arXiv' : 'Semantic Scholar'}, ${p.year || 'n.d.'}${p.url ? ', ' + p.url : ''}`
    );
    const referenceLinks = this.publicData.generateReferenceLinks(idea, researchKeywords);
    
    return {
      keywords: researchKeywords,
      papers: allPapers.slice(0, 20),
      summary,
      references,
      referenceLinks,
      stats: {
        semanticScholar: scholarResults.length,
        arxiv: arxivResults.length,
        totalPapers: allPapers.length,
      },
    };
  }

  private async extractKeywords(idea: string): Promise<string[]> {
    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 200,
        system: 'Extract 3-5 academic search keywords from the business idea. Return ONLY a JSON array of strings in English. Example: ["smart farming", "IoT agriculture", "precision agriculture"]',
        messages: [{ role: 'user', content: idea.slice(0, 500) }],
      });
      
      const text = (response.content[0] as any).text;
      const match = text.match(/\[[\s\S]*\]/);
      return match ? JSON.parse(match[0]) : [idea.slice(0, 50)];
    } catch {
      return [idea.slice(0, 50)];
    }
  }

  private async searchScholar(keywords: string[]): Promise<any[]> {
    const results: any[] = [];
    for (const kw of keywords.slice(0, 3)) {
      const res = await this.scholarService.searchPapers(kw, 5);
      for (const paper of res.papers) {
        results.push({
          title: paper.title,
          abstract: paper.abstract,
          year: paper.year,
          authors: paper.authors.map((a: any) => a.name).join(', '),
          citation: this.scholarService.formatCitation(paper),
          url: paper.url,
          source: 'semantic-scholar',
          citationCount: paper.citationCount,
        });
      }
    }
    return results;
  }

  private async searchArxiv(keywords: string[]): Promise<any[]> {
    const results: any[] = [];
    for (const kw of keywords.slice(0, 2)) {
      const papers = await this.arxivService.searchPapers(kw, 5);
      for (const paper of papers) {
        results.push({
          title: paper.title,
          abstract: paper.summary,
          year: paper.published ? new Date(paper.published).getFullYear() : null,
          authors: paper.authors.join(', '),
          citation: this.arxivService.formatCitation(paper),
          url: paper.link,
          source: 'arxiv',
          citationCount: 0,
        });
      }
    }
    return results;
  }

  private async summarizeFindings(idea: string, papers: any[]): Promise<string> {
    if (papers.length === 0) return '관련 학술 자료를 찾지 못했습니다.';
    
    const paperSummaries = papers.slice(0, 10).map((p, i) => 
      `[${i + 1}] ${p.title} (${p.year || 'n.d.'}) - ${(p.abstract || '').slice(0, 150)}`
    ).join('\n');
    
    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 1000,
        system: '학술 논문 검색 결과를 바탕으로 사업 아이디어와 관련된 연구 동향을 한국어로 요약하세요. 3-5 문단으로 작성하고, 핵심 발견사항과 시사점을 포함하세요.',
        messages: [{ role: 'user', content: `사업 아이디어: ${idea.slice(0, 200)}\n\n검색된 논문:\n${paperSummaries}` }],
      });
      
      return (response.content[0] as any).text;
    } catch {
      return `${papers.length}개의 관련 논문을 발견했습니다.`;
    }
  }
}
