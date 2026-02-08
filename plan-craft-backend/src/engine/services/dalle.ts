/**
 * DALL-E 3 이미지 생성 서비스
 * Fallback chain: DALL-E 3 API → Professional SVG diagrams
 */

export class DalleService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.openai.com/v1';
  }

  async generateImage(prompt, options = {}) {
    const {
      size = '1024x1024',
      quality = 'standard',
      style = 'natural'
    } = options;

    // Try DALL-E 3 if key available
    if (this.apiKey && this.apiKey !== 'undefined' && this.apiKey.trim() !== '') {
      try {
        console.log(`🎨 DALL-E 3 이미지 생성 중...`);
        console.log(`   프롬프트: ${prompt.slice(0, 100)}...`);

        const response = await fetch(`${this.baseUrl}/images/generations`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt,
            n: 1,
            size,
            quality,
            style
          })
        });

        if (response.ok) {
          const data = await response.json();
          const imageUrl = data.data[0].url;
          const revisedPrompt = data.data[0].revised_prompt;

          console.log(`   ✅ DALL-E 생성 완료`);

          return {
            url: imageUrl,
            revisedPrompt,
            source: 'dalle-3',
            generatedAt: new Date().toISOString()
          };
        } else {
          const error = await response.json().catch(() => ({}));
          throw new Error(`DALL-E API 오류: ${error.error?.message || response.status}`);
        }
      } catch (error) {
        console.warn(`   ⚠️  DALL-E 실패, SVG 폴백 사용: ${error.message}`);
      }
    } else {
      console.log('ℹ️  OpenAI API 키 없음 - SVG 다이어그램 생성');
    }

    // Fallback: Generate professional SVG
    return this.generateSvgDiagram(prompt, 'default');
  }

  async generateDiagram(description, type = 'architecture') {
    // Try DALL-E if key available
    if (this.apiKey && this.apiKey !== 'undefined' && this.apiKey.trim() !== '') {
      const diagramPrompts = {
        architecture: `Professional system architecture diagram showing ${description}. Clean, minimal design with boxes, arrows, and labels. Technical illustration style.`,
        flowchart: `Professional flowchart diagram for ${description}. Clear flow with decision points, processes, and connectors. Business process style.`,
        chart: `Professional data visualization chart showing ${description}. Clean graph or chart with clear labels and legend. Infographic style.`,
        workflow: `Professional workflow diagram illustrating ${description}. Sequential steps with clear connections. Process flow style.`
      };

      const prompt = diagramPrompts[type] || diagramPrompts.architecture;

      try {
        const result = await this.generateImage(prompt, {
          size: '1792x1024',
          quality: 'hd',
          style: 'natural'
        });
        if (result.source === 'dalle-3') {
          return result;
        }
      } catch (e) {
        console.warn(`DALL-E 다이어그램 생성 실패, SVG 폴백: ${e.message}`);
      }
    }

    // Fallback: Professional SVG diagram
    return this.generateSvgDiagram(description, type);
  }

  generateSvgDiagram(prompt, type) {
    const colors = {
      architecture: { primary: '#3B82F6', secondary: '#DBEAFE', text: '#1E40AF', accent: '#93C5FD' },
      flowchart: { primary: '#8B5CF6', secondary: '#EDE9FE', text: '#5B21B6', accent: '#C4B5FD' },
      chart: { primary: '#10B981', secondary: '#D1FAE5', text: '#065F46', accent: '#6EE7B7' },
      workflow: { primary: '#F59E0B', secondary: '#FEF3C7', text: '#92400E', accent: '#FCD34D' },
      default: { primary: '#6366F1', secondary: '#E0E7FF', text: '#3730A3', accent: '#A5B4FC' },
    };
    const c = colors[type] || colors.default;
    const title = this._escapeXml(prompt.slice(0, 60));

    const typeLabel = {
      architecture: '시스템 아키텍처',
      flowchart: '프로세스 흐름도',
      chart: '데이터 분석',
      workflow: '워크플로우',
      default: '다이어그램'
    };

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" style="font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif">
      <defs>
        <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${c.secondary};stop-opacity:1"/>
          <stop offset="100%" style="stop-color:white;stop-opacity:1"/>
        </linearGradient>
        <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.1"/>
        </filter>
        <marker id="arrow-${type}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="${c.primary}"/>
        </marker>
      </defs>
      <rect width="800" height="400" fill="url(#bg-grad)" rx="16"/>
      <rect x="16" y="16" width="768" height="368" fill="white" rx="12" stroke="${c.primary}" stroke-width="1.5" filter="url(#shadow)"/>
      <rect x="16" y="16" width="768" height="52" fill="${c.primary}" rx="12 12 0 0"/>
      <rect x="16" y="56" width="768" height="12" fill="${c.primary}"/>
      <text x="400" y="50" text-anchor="middle" font-size="18" font-weight="bold" fill="white">${typeLabel[type] || typeLabel.default}</text>
      <text x="400" y="88" text-anchor="middle" font-size="13" fill="#6B7280">${title}</text>
      ${this._getDiagramContent(type, c)}
    </svg>`;

    const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    return {
      url: dataUri,
      revisedPrompt: prompt,
      source: 'svg-generated',
      generatedAt: new Date().toISOString()
    };
  }

  _getDiagramContent(type, c) {
    switch (type) {
      case 'architecture': return this._archDiagramContent(c);
      case 'flowchart': return this._flowchartContent(c);
      case 'chart': return this._chartContent(c);
      case 'workflow': return this._workflowContent(c);
      default: return this._archDiagramContent(c);
    }
  }

  _archDiagramContent(c) {
    return `
      <rect x="300" y="105" width="200" height="46" fill="${c.primary}" rx="8" filter="url(#shadow)"/>
      <text x="400" y="133" text-anchor="middle" fill="white" font-size="14" font-weight="bold">사용자 인터페이스</text>
      <line x1="400" y1="151" x2="400" y2="178" stroke="${c.primary}" stroke-width="2" marker-end="url(#arrow-architecture)"/>

      <rect x="130" y="180" width="160" height="42" fill="${c.primary}" rx="8" opacity="0.85" filter="url(#shadow)"/>
      <text x="210" y="206" text-anchor="middle" fill="white" font-size="13">API 서버</text>
      <rect x="510" y="180" width="160" height="42" fill="${c.primary}" rx="8" opacity="0.85" filter="url(#shadow)"/>
      <text x="590" y="206" text-anchor="middle" fill="white" font-size="13">AI 엔진</text>
      <line x1="290" y1="201" x2="510" y2="201" stroke="${c.primary}" stroke-width="2" stroke-dasharray="6 3"/>
      <text x="400" y="195" text-anchor="middle" font-size="10" fill="${c.text}">REST / gRPC</text>

      <line x1="210" y1="222" x2="210" y2="260" stroke="${c.primary}" stroke-width="2" marker-end="url(#arrow-architecture)"/>
      <line x1="590" y1="222" x2="590" y2="260" stroke="${c.primary}" stroke-width="2" marker-end="url(#arrow-architecture)"/>

      <rect x="130" y="262" width="160" height="42" fill="${c.secondary}" rx="8" stroke="${c.primary}" stroke-width="1.5" filter="url(#shadow)"/>
      <text x="210" y="288" text-anchor="middle" fill="${c.text}" font-size="13">데이터베이스</text>
      <rect x="510" y="262" width="160" height="42" fill="${c.secondary}" rx="8" stroke="${c.primary}" stroke-width="1.5" filter="url(#shadow)"/>
      <text x="590" y="288" text-anchor="middle" fill="${c.text}" font-size="13">외부 서비스</text>

      <rect x="320" y="320" width="160" height="42" fill="${c.accent}" rx="8" opacity="0.6" filter="url(#shadow)"/>
      <text x="400" y="346" text-anchor="middle" fill="${c.text}" font-size="13">모니터링</text>
      <line x1="290" y1="283" x2="320" y2="341" stroke="${c.accent}" stroke-width="1.5" stroke-dasharray="4"/>
      <line x1="510" y1="283" x2="480" y2="341" stroke="${c.accent}" stroke-width="1.5" stroke-dasharray="4"/>`;
  }

  _flowchartContent(c) {
    return `
      <rect x="320" y="105" width="160" height="38" fill="${c.primary}" rx="19" filter="url(#shadow)"/>
      <text x="400" y="129" text-anchor="middle" fill="white" font-size="13" font-weight="bold">시작</text>
      <line x1="400" y1="143" x2="400" y2="165" stroke="${c.primary}" stroke-width="2" marker-end="url(#arrow-flowchart)"/>

      <rect x="280" y="167" width="240" height="38" fill="${c.secondary}" rx="6" stroke="${c.primary}" stroke-width="1.5" filter="url(#shadow)"/>
      <text x="400" y="191" text-anchor="middle" fill="${c.text}" font-size="13">데이터 입력 및 분석</text>
      <line x1="400" y1="205" x2="400" y2="227" stroke="${c.primary}" stroke-width="2" marker-end="url(#arrow-flowchart)"/>

      <polygon points="400,229 455,260 400,291 345,260" fill="${c.secondary}" stroke="${c.primary}" stroke-width="1.5" filter="url(#shadow)"/>
      <text x="400" y="265" text-anchor="middle" fill="${c.text}" font-size="12" font-weight="600">검증</text>

      <line x1="455" y1="260" x2="520" y2="260" stroke="${c.primary}" stroke-width="2"/>
      <text x="485" y="253" text-anchor="middle" font-size="10" fill="#EF4444">실패</text>
      <rect x="520" y="241" width="120" height="38" fill="#FEE2E2" rx="6" stroke="#EF4444" stroke-width="1.5"/>
      <text x="580" y="265" text-anchor="middle" fill="#991B1B" font-size="12">오류 처리</text>
      <line x1="580" y1="241" x2="580" y2="191" stroke="#EF4444" stroke-width="1.5" stroke-dasharray="4"/>
      <line x1="580" y1="191" x2="520" y2="191" stroke="#EF4444" stroke-width="1.5" stroke-dasharray="4" marker-end="url(#arrow-flowchart)"/>

      <line x1="400" y1="291" x2="400" y2="315" stroke="${c.primary}" stroke-width="2" marker-end="url(#arrow-flowchart)"/>
      <text x="415" y="305" font-size="10" fill="#10B981">성공</text>

      <rect x="280" y="317" width="240" height="38" fill="${c.secondary}" rx="6" stroke="${c.primary}" stroke-width="1.5" filter="url(#shadow)"/>
      <text x="400" y="341" text-anchor="middle" fill="${c.text}" font-size="13">결과 출력</text>`;
  }

  _chartContent(c) {
    const bars = [
      { x: 120, h: 80, label: '1분기', pct: '40%' },
      { x: 230, h: 150, label: '2분기', pct: '75%' },
      { x: 340, h: 110, label: '3분기', pct: '55%' },
      { x: 450, h: 190, label: '4분기', pct: '95%' },
      { x: 560, h: 160, label: '목표', pct: '80%' },
    ];
    const baseY = 350;
    let content = `<line x1="100" y1="${baseY}" x2="680" y2="${baseY}" stroke="#CBD5E1" stroke-width="1.5"/>`;
    // grid lines
    for (let i = 0; i < 4; i++) {
      const y = baseY - (i + 1) * 50;
      content += `<line x1="100" y1="${y}" x2="680" y2="${y}" stroke="#F1F5F9" stroke-width="1"/>`;
      content += `<text x="90" y="${y + 4}" text-anchor="end" font-size="10" fill="#9CA3AF">${(i + 1) * 25}%</text>`;
    }
    bars.forEach(b => {
      content += `
        <rect x="${b.x}" y="${baseY - b.h}" width="70" height="${b.h}" fill="${c.primary}" rx="4" opacity="0.85" filter="url(#shadow)"/>
        <text x="${b.x + 35}" y="${baseY + 18}" text-anchor="middle" fill="${c.text}" font-size="12" font-weight="600">${b.label}</text>
        <text x="${b.x + 35}" y="${baseY - b.h - 8}" text-anchor="middle" fill="${c.text}" font-size="11">${b.pct}</text>`;
    });
    return content;
  }

  _workflowContent(c) {
    const steps = [
      { x: 80, label: '기획' },
      { x: 230, label: '설계' },
      { x: 380, label: '개발' },
      { x: 530, label: '테스트' },
      { x: 680, label: '배포' },
    ];
    const y = 210;
    let content = '';
    steps.forEach((s, i) => {
      content += `
        <circle cx="${s.x}" cy="${y}" r="30" fill="${i < 3 ? c.primary : c.secondary}" stroke="${c.primary}" stroke-width="2" filter="url(#shadow)"/>
        <text x="${s.x}" y="${y + 5}" text-anchor="middle" fill="${i < 3 ? 'white' : c.text}" font-size="12" font-weight="600">${s.label}</text>
        <text x="${s.x}" y="${y + 55}" text-anchor="middle" fill="#6B7280" font-size="11">Step ${i + 1}</text>`;
      if (i < steps.length - 1) {
        content += `<line x1="${s.x + 32}" y1="${y}" x2="${steps[i + 1].x - 32}" y2="${y}" stroke="${c.primary}" stroke-width="2" marker-end="url(#arrow-workflow)"/>`;
      }
    });
    // progress bar
    content += `
      <rect x="80" y="300" width="630" height="8" fill="#E5E7EB" rx="4"/>
      <rect x="80" y="300" width="378" height="8" fill="${c.primary}" rx="4"/>
      <text x="400" y="328" text-anchor="middle" font-size="11" fill="${c.text}">진행률: 60%</text>`;
    return content;
  }

  _escapeXml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
