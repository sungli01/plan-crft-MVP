/**
 * Slide Template Engine (v2)
 *
 * 순수 TypeScript 템플릿 엔진. Handlebars 없음.
 * 4 테마 × 9 레이아웃으로 GenSpark급 프레젠테이션을 밀리초 단위로 렌더링.
 */

import type { SlideJSON } from '../agents/slide-content-generator';

// ── Themes ─────────────────────────────────────────────

interface Theme {
  bg: string; bgAlt: string; text: string; textMuted: string;
  accent: string; accentAlt: string; cardBg: string; border: string;
}

const THEMES: Record<string, Theme> = {
  dark: {
    bg: '#0f172a', bgAlt: '#1e293b', text: '#f1f5f9', textMuted: '#94a3b8',
    accent: '#0ea5e9', accentAlt: '#06b6d4', cardBg: '#1e293b', border: '#334155'
  },
  light: {
    bg: '#ffffff', bgAlt: '#f8fafc', text: '#1e293b', textMuted: '#64748b',
    accent: '#2563eb', accentAlt: '#3b82f6', cardBg: '#f1f5f9', border: '#e2e8f0'
  },
  corporate: {
    bg: '#1a1a2e', bgAlt: '#16213e', text: '#eee', textMuted: '#a0a0b0',
    accent: '#e94560', accentAlt: '#0f3460', cardBg: '#16213e', border: '#2a2a4a'
  },
  modern: {
    bg: '#fafafa', bgAlt: '#f0f4f8', text: '#2d3748', textMuted: '#718096',
    accent: '#38b2ac', accentAlt: '#4fd1c5', cardBg: '#fff', border: '#e2e8f0'
  }
};

// ── Icon Map (FontAwesome 6) ───────────────────────────

const ICON_MAP: Record<string, string> = {
  'ai': 'fa-brain', 'chip': 'fa-microchip', 'microchip': 'fa-microchip',
  'cloud': 'fa-cloud', 'security': 'fa-shield-halved', 'data': 'fa-database',
  'api': 'fa-plug', 'market': 'fa-chart-line', 'chart-line': 'fa-chart-line',
  'revenue': 'fa-coins', 'coins': 'fa-coins', 'growth': 'fa-arrow-trend-up',
  'arrow-trend-up': 'fa-arrow-trend-up', 'team': 'fa-users', 'users': 'fa-users',
  'partner': 'fa-handshake', 'handshake': 'fa-handshake', 'target': 'fa-bullseye',
  'bullseye': 'fa-bullseye', 'health': 'fa-heart-pulse', 'hospital': 'fa-hospital',
  'sensor': 'fa-wave-square', 'check': 'fa-circle-check', 'circle-check': 'fa-circle-check',
  'warning': 'fa-triangle-exclamation', 'clock': 'fa-clock', 'globe': 'fa-globe',
  'rocket': 'fa-rocket', 'star': 'fa-star', 'flag': 'fa-flag', 'trophy': 'fa-trophy',
  'code': 'fa-code', 'server': 'fa-server', 'mobile': 'fa-mobile-screen',
  'chart-bar': 'fa-chart-bar', 'chart-pie': 'fa-chart-pie', 'money': 'fa-money-bill-wave',
  'lightbulb': 'fa-lightbulb', 'cog': 'fa-gear', 'gear': 'fa-gear',
  'link': 'fa-link', 'shield': 'fa-shield-halved', 'bolt': 'fa-bolt',
  'chart-area': 'fa-chart-area', 'diagram': 'fa-diagram-project',
};

function icon(name: string): string {
  const cls = ICON_MAP[name] || ICON_MAP[name.toLowerCase()] || `fa-${name}`;
  return `<i class="fa-solid ${cls}"></i>`;
}

function esc(s: string | undefined | null): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── QuickChart URL builder ─────────────────────────────

function buildChartUrl(chartData: any, theme: Theme): string {
  const config = {
    type: chartData.type || 'bar',
    data: { labels: chartData.labels, datasets: chartData.datasets },
    options: {
      plugins: { legend: { labels: { color: theme.text } } },
      scales: {
        x: { ticks: { color: theme.textMuted }, grid: { color: theme.border } },
        y: { ticks: { color: theme.textMuted }, grid: { color: theme.border } }
      }
    }
  };
  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(config))}&w=600&h=350&bkg=${encodeURIComponent(theme.bg)}`;
}

// ── Layout Renderers ───────────────────────────────────

function renderCoverHero(slide: SlideJSON, t: Theme): string {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;
      background:linear-gradient(135deg, ${t.bg} 0%, ${t.bgAlt} 50%, ${t.accent}22 100%);">
      <div style="font-size:52px;font-weight:800;color:${t.text};margin-bottom:16px;max-width:900px;line-height:1.2;">
        ${esc(slide.title)}
      </div>
      ${slide.subtitle ? `<div style="font-size:22px;color:${t.textMuted};margin-bottom:24px;">${esc(slide.subtitle)}</div>` : ''}
      ${slide.date ? `<div style="font-size:16px;color:${t.accent};margin-top:8px;">${esc(slide.date)}</div>` : ''}
      <div style="width:80px;height:4px;background:${t.accent};border-radius:2px;margin-top:32px;"></div>
    </div>`;
}

function renderLeftRightSplit(slide: SlideJSON, t: Theme): string {
  const points = (slide.points || []).slice(0, 6);
  return `
    <div style="display:flex;height:100%;">
      <div style="width:35%;background:${t.accent}15;display:flex;flex-direction:column;justify-content:center;padding:48px 32px;">
        <div style="font-size:32px;font-weight:700;color:${t.text};line-height:1.3;">${esc(slide.title)}</div>
        <div style="width:48px;height:3px;background:${t.accent};margin-top:16px;border-radius:2px;"></div>
      </div>
      <div style="width:65%;padding:40px 36px;display:flex;flex-direction:column;justify-content:center;gap:16px;">
        ${points.map(p => `
          <div style="display:flex;align-items:flex-start;gap:14px;">
            <div style="min-width:40px;height:40px;background:${t.accent}20;border-radius:10px;display:flex;align-items:center;justify-content:center;color:${t.accent};font-size:18px;">
              ${icon(p.icon)}
            </div>
            <div>
              <div style="font-size:16px;font-weight:600;color:${t.text};">${esc(p.title)}</div>
              <div style="font-size:13px;color:${t.textMuted};margin-top:2px;">${esc(p.desc)}</div>
            </div>
          </div>`).join('')}
        ${slide.content ? `<div style="font-size:14px;color:${t.textMuted};margin-top:8px;line-height:1.6;">${esc(slide.content)}</div>` : ''}
      </div>
    </div>`;
}

function renderChartWithMetrics(slide: SlideJSON, t: Theme): string {
  const metrics = (slide.keyMetrics || slide.metrics || []).slice(0, 4);
  const chartUrl = slide.chartData ? buildChartUrl(slide.chartData, t) : '';
  return `
    <div style="display:flex;flex-direction:column;height:100%;padding:36px 40px;">
      <div style="font-size:28px;font-weight:700;color:${t.text};margin-bottom:20px;">${esc(slide.title)}</div>
      ${chartUrl ? `<div style="flex:1;display:flex;align-items:center;justify-content:center;">
        <img src="${chartUrl}" alt="chart" style="max-width:100%;max-height:320px;border-radius:8px;" />
      </div>` : ''}
      <div style="display:flex;gap:16px;margin-top:20px;">
        ${metrics.map(m => `
          <div style="flex:1;background:${t.cardBg};border:1px solid ${t.border};border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:12px;color:${t.textMuted};text-transform:uppercase;">${esc(m.label)}</div>
            <div style="font-size:24px;font-weight:700;color:${t.accent};margin-top:4px;">${esc(m.value)}</div>
            ${m.growth ? `<div style="font-size:12px;color:#22c55e;margin-top:2px;">${esc(m.growth)}</div>` : ''}
          </div>`).join('')}
      </div>
    </div>`;
}

function renderIconGrid(slide: SlideJSON, t: Theme): string {
  const points = (slide.points || []).slice(0, 6);
  const cols = points.length <= 4 ? 2 : 3;
  return `
    <div style="display:flex;flex-direction:column;height:100%;padding:40px 48px;">
      <div style="font-size:28px;font-weight:700;color:${t.text};margin-bottom:28px;">${esc(slide.title)}</div>
      <div style="flex:1;display:grid;grid-template-columns:repeat(${cols},1fr);gap:20px;align-content:center;">
        ${points.map(p => `
          <div style="background:${t.cardBg};border:1px solid ${t.border};border-radius:14px;padding:24px;text-align:center;">
            <div style="font-size:28px;color:${t.accent};margin-bottom:12px;">${icon(p.icon)}</div>
            <div style="font-size:15px;font-weight:600;color:${t.text};">${esc(p.title)}</div>
            <div style="font-size:12px;color:${t.textMuted};margin-top:6px;line-height:1.5;">${esc(p.desc)}</div>
          </div>`).join('')}
      </div>
    </div>`;
}

function renderTimelineHorizontal(slide: SlideJSON, t: Theme): string {
  const items = (slide.milestones || []).slice(0, 5);
  return `
    <div style="display:flex;flex-direction:column;height:100%;padding:40px 48px;">
      <div style="font-size:28px;font-weight:700;color:${t.text};margin-bottom:36px;">${esc(slide.title)}</div>
      <div style="flex:1;display:flex;align-items:center;position:relative;">
        <div style="position:absolute;top:50%;left:0;right:0;height:3px;background:${t.border};"></div>
        <div style="display:flex;width:100%;justify-content:space-between;position:relative;">
          ${items.map((m, i) => `
            <div style="display:flex;flex-direction:column;align-items:center;width:${Math.floor(100/items.length)}%;z-index:1;">
              <div style="font-size:12px;color:${t.accent};font-weight:600;margin-bottom:8px;">${esc(m.date)}</div>
              <div style="width:16px;height:16px;background:${t.accent};border-radius:50%;border:3px solid ${t.bg};"></div>
              <div style="margin-top:12px;text-align:center;">
                <div style="font-size:14px;font-weight:600;color:${t.text};">${esc(m.title)}</div>
                <div style="font-size:11px;color:${t.textMuted};margin-top:4px;max-width:140px;">${esc(m.desc)}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>
    </div>`;
}

function renderQaCards(slide: SlideJSON, t: Theme): string {
  const qs = (slide.questions || []).slice(0, 5);
  return `
    <div style="display:flex;flex-direction:column;height:100%;padding:40px 48px;">
      <div style="font-size:28px;font-weight:700;color:${t.text};margin-bottom:24px;">${esc(slide.title)}</div>
      <div style="flex:1;display:flex;flex-direction:column;gap:14px;justify-content:center;">
        ${qs.map(q => `
          <div style="background:${t.cardBg};border:1px solid ${t.border};border-radius:12px;padding:18px 22px;">
            <div style="font-size:15px;font-weight:600;color:${t.accent};margin-bottom:6px;">Q. ${esc(q.q)}</div>
            <div style="font-size:13px;color:${t.textMuted};line-height:1.5;">A. ${esc(q.a)}</div>
          </div>`).join('')}
      </div>
    </div>`;
}

function renderDataCards(slide: SlideJSON, t: Theme): string {
  const metrics = (slide.keyMetrics || slide.metrics || []).slice(0, 4);
  return `
    <div style="display:flex;flex-direction:column;height:100%;padding:40px 48px;">
      <div style="font-size:28px;font-weight:700;color:${t.text};margin-bottom:28px;">${esc(slide.title)}</div>
      <div style="flex:1;display:grid;grid-template-columns:repeat(${Math.min(metrics.length, 4)},1fr);gap:20px;align-content:center;">
        ${metrics.map(m => `
          <div style="background:${t.cardBg};border:1px solid ${t.border};border-radius:16px;padding:32px 24px;text-align:center;">
            <div style="font-size:14px;color:${t.textMuted};text-transform:uppercase;letter-spacing:1px;">${esc(m.label)}</div>
            <div style="font-size:36px;font-weight:800;color:${t.accent};margin:12px 0;">${esc(m.value)}</div>
            ${m.growth ? `<div style="font-size:14px;color:#22c55e;font-weight:600;">${esc(m.growth)}</div>` : ''}
          </div>`).join('')}
      </div>
    </div>`;
}

function renderComparison(slide: SlideJSON, t: Theme): string {
  const left = slide.left || { label: 'Before', points: [] };
  const right = slide.right || { label: 'After', points: [] };
  return `
    <div style="display:flex;flex-direction:column;height:100%;padding:40px 48px;">
      <div style="font-size:28px;font-weight:700;color:${t.text};margin-bottom:28px;">${esc(slide.title)}</div>
      <div style="flex:1;display:flex;gap:24px;">
        ${[left, right].map((side, i) => `
          <div style="flex:1;background:${i === 0 ? t.bgAlt : t.accent + '15'};border:1px solid ${t.border};border-radius:16px;padding:28px;">
            <div style="font-size:18px;font-weight:700;color:${i === 0 ? t.textMuted : t.accent};margin-bottom:16px;text-align:center;">${esc(side.label)}</div>
            <div style="display:flex;flex-direction:column;gap:10px;">
              ${(side.points || []).slice(0, 6).map(p => `
                <div style="display:flex;align-items:center;gap:8px;">
                  <div style="color:${i === 0 ? t.textMuted : t.accent};">${i === 0 ? '▸' : '✓'}</div>
                  <div style="font-size:14px;color:${t.text};">${esc(p)}</div>
                </div>`).join('')}
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

function renderClosingSummary(slide: SlideJSON, t: Theme): string {
  const points = (slide.summary || []).slice(0, 3);
  return `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;
      background:linear-gradient(135deg, ${t.bg} 0%, ${t.accent}18 100%);">
      <div style="font-size:44px;font-weight:800;color:${t.text};margin-bottom:36px;">${esc(slide.title)}</div>
      <div style="display:flex;flex-direction:column;gap:16px;max-width:700px;margin-bottom:40px;">
        ${points.map((p, i) => `
          <div style="display:flex;align-items:center;gap:14px;text-align:left;">
            <div style="min-width:36px;height:36px;background:${t.accent};border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:16px;">${i + 1}</div>
            <div style="font-size:18px;color:${t.text};">${esc(p)}</div>
          </div>`).join('')}
      </div>
      <div style="width:80px;height:4px;background:${t.accent};border-radius:2px;"></div>
    </div>`;
}

// ── Layout dispatcher ──────────────────────────────────

const LAYOUT_RENDERERS: Record<string, (slide: SlideJSON, theme: Theme) => string> = {
  'cover-hero': renderCoverHero,
  'left-right-split': renderLeftRightSplit,
  'chart-with-metrics': renderChartWithMetrics,
  'icon-grid': renderIconGrid,
  'timeline-horizontal': renderTimelineHorizontal,
  'qa-cards': renderQaCards,
  'data-cards': renderDataCards,
  'comparison': renderComparison,
  'closing-summary': renderClosingSummary,
};

function renderSlide(slide: SlideJSON, theme: Theme): string {
  const renderer = LAYOUT_RENDERERS[slide.layout] || renderLeftRightSplit;
  return renderer(slide, theme);
}

// ── Main render function ───────────────────────────────

export function renderPresentation(
  slides: SlideJSON[],
  options: { theme: 'dark' | 'light' | 'corporate' | 'modern'; ratio: '16:9'; title: string }
): string {
  const t = THEMES[options.theme] || THEMES.dark;
  const totalSlides = slides.length;

  const slidesHtml = slides.map((slide, idx) => `
    <section class="slide" data-slide="${idx + 1}" style="display:${idx === 0 ? 'block' : 'none'};">
      ${renderSlide(slide, t)}
      <div class="slide-number">${idx + 1} / ${totalSlides}</div>
    </section>`).join('\n');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1280">
<title>${esc(options.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{width:100%;height:100%;overflow:hidden;background:#000;font-family:'Noto Sans KR',sans-serif;}
  .presentation{width:1280px;height:720px;margin:0 auto;position:relative;overflow:hidden;background:${t.bg};}
  .slide{width:1280px;height:720px;position:absolute;top:0;left:0;overflow:hidden;background:${t.bg};}
  .slide-number{position:absolute;bottom:16px;right:24px;font-size:12px;color:${t.textMuted};opacity:0.7;}
  .nav-btn{position:absolute;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:50%;
    background:${t.cardBg}cc;border:1px solid ${t.border};color:${t.textMuted};font-size:18px;cursor:pointer;
    display:flex;align-items:center;justify-content:center;z-index:100;transition:all .2s;}
  .nav-btn:hover{background:${t.accent};color:#fff;border-color:${t.accent};}
  #prevBtn{left:12px;}
  #nextBtn{right:12px;}

  @media print{
    html,body{overflow:visible!important;background:#fff!important;width:auto!important;height:auto!important;}
    .presentation{width:auto!important;height:auto!important;overflow:visible!important;background:none!important;}
    .slide{position:relative!important;display:block!important;page-break-after:always;
      width:1280px!important;height:720px!important;margin:0 auto;}
    .nav-btn,.slide-number{display:none!important;}
  }
</style>
</head>
<body>
<div class="presentation" id="deck">
  ${slidesHtml}
  <button class="nav-btn" id="prevBtn" onclick="navigate(-1)"><i class="fa-solid fa-chevron-left"></i></button>
  <button class="nav-btn" id="nextBtn" onclick="navigate(1)"><i class="fa-solid fa-chevron-right"></i></button>
</div>
<script>
(function(){
  let cur=0;const total=${totalSlides};
  const slides=document.querySelectorAll('.slide');
  function show(n){slides.forEach((s,i)=>s.style.display=i===n?'block':'none');cur=n;}
  window.navigate=function(d){let n=cur+d;if(n>=0&&n<total)show(n);};
  document.addEventListener('keydown',function(e){
    if(e.key==='ArrowRight'||e.key===' ')navigate(1);
    if(e.key==='ArrowLeft')navigate(-1);
    if(e.key==='Home')show(0);
    if(e.key==='End')show(total-1);
  });
  // Touch support
  let tx=0;
  document.addEventListener('touchstart',function(e){tx=e.touches[0].clientX;});
  document.addEventListener('touchend',function(e){const dx=e.changedTouches[0].clientX-tx;if(Math.abs(dx)>50){dx>0?navigate(-1):navigate(1);}});
})();
</script>
</body>
</html>`;
}
