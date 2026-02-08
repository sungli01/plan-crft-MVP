/**
 * Mockup Generator Agent
 *
 * Takes a business plan/idea and generates a complete responsive website mockup
 * using HTML + Tailwind CSS (CDN).
 *
 * Output: self-contained HTML file with all styles inline via Tailwind CDN
 */

import Anthropic from '@anthropic-ai/sdk';

interface MockupConfig {
  title: string;
  idea: string;
  style?: 'modern' | 'corporate' | 'startup' | 'minimal';
  sections?: string[];
  colorScheme?: string;
}

interface MockupResult {
  html: string;
  title: string;
  description: string;
  pages: { name: string; html: string }[];
  metadata: {
    style: string;
    sectionsGenerated: number;
    generatedAt: string;
  };
}

export class MockupGeneratorAgent {
  private anthropic: Anthropic;
  private model: string;

  constructor(config: any = {}) {
    this.anthropic = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
    });
    this.model = config.model || 'claude-sonnet-4-5-20250929';
  }

  async generate(config: MockupConfig): Promise<MockupResult> {
    console.log('[MockupGenerator] Generating mockup for:', config.title);

    const html = await this.generateLandingPage(config);

    return {
      html,
      title: config.title,
      description: config.idea.slice(0, 200),
      pages: [{ name: 'index', html }],
      metadata: {
        style: config.style || 'modern',
        sectionsGenerated: this.countSections(html),
        generatedAt: new Date().toISOString(),
      },
    };
  }

  private async generateLandingPage(config: MockupConfig): Promise<string> {
    const systemPrompt = `You are an expert web designer. Generate a COMPLETE, self-contained HTML landing page.

REQUIREMENTS:
- Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Modern, responsive design (mobile-first)
- Korean text for all content
- Professional color scheme
- Include these sections: Hero, Features (3-4), How It Works, Pricing, Testimonials, CTA, Footer
- All content must be realistic and relevant to the business
- Add smooth scroll behavior
- Use gradient backgrounds, subtle animations
- Include a sticky navigation header
- Add Font Awesome CDN for icons: <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
- Output ONLY the complete HTML (starting with <!DOCTYPE html>)
- NO explanations, NO markdown — pure HTML only`;

    const userPrompt = `Generate a landing page for:

Business: ${config.title}
Description: ${config.idea.slice(0, 500)}
Style: ${config.style || 'modern'}
${config.colorScheme ? `Color scheme: ${config.colorScheme}` : ''}
${config.sections ? `Key sections to highlight: ${config.sections.join(', ')}` : ''}`;

    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      let html = (response.content[0] as any).text;

      // Clean up - ensure it starts with <!DOCTYPE
      const doctypeIndex = html.indexOf('<!DOCTYPE');
      if (doctypeIndex > 0) html = html.slice(doctypeIndex);

      // Ensure it ends with </html>
      if (!html.includes('</html>')) html += '\n</html>';

      return html;
    } catch (e: any) {
      console.error('[MockupGenerator] Generation failed:', e.message);
      return this.getFallbackHtml(config);
    }
  }

  private getFallbackHtml(config: MockupConfig): string {
    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
  <header class="bg-white shadow-sm sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
      <h1 class="text-xl font-bold text-blue-600">${config.title}</h1>
      <nav class="flex gap-6 text-gray-600">
        <a href="#features" class="hover:text-blue-600">기능</a>
        <a href="#pricing" class="hover:text-blue-600">요금</a>
        <a href="#contact" class="hover:text-blue-600">문의</a>
      </nav>
    </div>
  </header>
  <main>
    <section class="py-20 text-center bg-gradient-to-br from-blue-600 to-purple-700 text-white">
      <h2 class="text-4xl font-bold mb-4">${config.title}</h2>
      <p class="text-xl opacity-90 max-w-2xl mx-auto">${config.idea.slice(0, 200)}</p>
      <button class="mt-8 bg-white text-blue-600 px-8 py-3 rounded-full font-bold hover:shadow-lg transition">시작하기</button>
    </section>
    <section id="features" class="py-16 max-w-6xl mx-auto px-4">
      <h3 class="text-2xl font-bold text-center mb-12">주요 기능</h3>
      <div class="grid md:grid-cols-3 gap-8">
        <div class="bg-white p-6 rounded-xl shadow-sm"><h4 class="font-bold mb-2">혁신적 기술</h4><p class="text-gray-600">최신 기술을 활용한 솔루션을 제공합니다.</p></div>
        <div class="bg-white p-6 rounded-xl shadow-sm"><h4 class="font-bold mb-2">사용자 중심</h4><p class="text-gray-600">직관적인 인터페이스로 쉽게 사용할 수 있습니다.</p></div>
        <div class="bg-white p-6 rounded-xl shadow-sm"><h4 class="font-bold mb-2">확장 가능</h4><p class="text-gray-600">비즈니스 성장에 맞춰 유연하게 확장됩니다.</p></div>
      </div>
    </section>
  </main>
  <footer class="bg-gray-900 text-gray-400 py-8 text-center"><p>© 2026 ${config.title}. All rights reserved.</p></footer>
</body>
</html>`;
  }

  private countSections(html: string): number {
    return (html.match(/<section/g) || []).length;
  }
}
