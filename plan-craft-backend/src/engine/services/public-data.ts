/**
 * Korean public data APIs (no key needed for basic queries)
 * - KOSIS statistical data reference URLs
 * - Google Scholar search URL generation
 */

export class PublicDataService {
  // Generate Google Scholar search URL for reference
  getGoogleScholarUrl(query: string): string {
    return `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`;
  }

  // Generate KOSIS reference URL
  getKosisUrl(keyword: string): string {
    return `https://kosis.kr/search/search.do?query=${encodeURIComponent(keyword)}`;
  }

  // Generate data.go.kr reference URL
  getDataGoKrUrl(keyword: string): string {
    return `https://www.data.go.kr/tcs/dss/selectDataSetList.do?dType=TOTAL&keyword=${encodeURIComponent(keyword)}`;
  }

  // Generate reference links for a topic
  generateReferenceLinks(topic: string, keywords: string[]): any[] {
    const links = [];
    
    links.push({
      name: 'Google Scholar',
      url: this.getGoogleScholarUrl(topic),
      type: 'academic',
    });
    
    links.push({
      name: 'KOSIS 국가통계',
      url: this.getKosisUrl(keywords[0] || topic),
      type: 'statistics',
    });
    
    links.push({
      name: '공공데이터포털',
      url: this.getDataGoKrUrl(keywords[0] || topic),
      type: 'government',
    });
    
    return links;
  }
}
