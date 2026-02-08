'use client';

// Document type icons - professional gradient SVG icons
export function GovernmentIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="url(#gov-grad)"/>
      <path d="M24 10L10 18v2h28v-2L24 10z" fill="white"/>
      <rect x="14" y="22" width="4" height="12" rx="1" fill="white" opacity="0.9"/>
      <rect x="22" y="22" width="4" height="12" rx="1" fill="white" opacity="0.9"/>
      <rect x="30" y="22" width="4" height="12" rx="1" fill="white" opacity="0.9"/>
      <rect x="10" y="34" width="28" height="3" rx="1" fill="white"/>
      <defs><linearGradient id="gov-grad" x1="0" y1="0" x2="48" y2="48"><stop stopColor="#3B82F6"/><stop offset="1" stopColor="#1D4ED8"/></linearGradient></defs>
    </svg>
  );
}

export function DevIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="url(#dev-grad)"/>
      <path d="M18 16l-8 8 8 8M30 16l8 8-8 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M26 12l-4 24" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
      <defs><linearGradient id="dev-grad" x1="0" y1="0" x2="48" y2="48"><stop stopColor="#8B5CF6"/><stop offset="1" stopColor="#6D28D9"/></linearGradient></defs>
    </svg>
  );
}

export function ResearchIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="url(#research-grad)"/>
      <circle cx="22" cy="22" r="8" stroke="white" strokeWidth="2.5"/>
      <path d="M28 28l7 7" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M19 22h6M22 19v6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <defs><linearGradient id="research-grad" x1="0" y1="0" x2="48" y2="48"><stop stopColor="#10B981"/><stop offset="1" stopColor="#059669"/></linearGradient></defs>
    </svg>
  );
}

export function BusinessIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="url(#biz-grad)"/>
      <path d="M12 34V20l6-4 6 8 6-12 6 8v14H12z" fill="white" opacity="0.3"/>
      <path d="M12 34L18 16l6 8 6-12 6 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <defs><linearGradient id="biz-grad" x1="0" y1="0" x2="48" y2="48"><stop stopColor="#F97316"/><stop offset="1" stopColor="#EA580C"/></linearGradient></defs>
    </svg>
  );
}

export function ProposalIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="url(#proposal-grad)"/>
      <rect x="12" y="10" width="24" height="28" rx="2" fill="white" opacity="0.2"/>
      <rect x="16" y="16" width="16" height="2" rx="1" fill="white"/>
      <rect x="16" y="22" width="12" height="2" rx="1" fill="white" opacity="0.8"/>
      <rect x="16" y="28" width="14" height="2" rx="1" fill="white" opacity="0.6"/>
      <path d="M30 32l4 4 6-8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <defs><linearGradient id="proposal-grad" x1="0" y1="0" x2="48" y2="48"><stop stopColor="#EF4444"/><stop offset="1" stopColor="#DC2626"/></linearGradient></defs>
    </svg>
  );
}

export function InvestIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="url(#invest-grad)"/>
      <circle cx="24" cy="24" r="10" stroke="white" strokeWidth="2"/>
      <path d="M24 18v12M21 21h6a2 2 0 010 4h-4a2 2 0 000 4h6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <defs><linearGradient id="invest-grad" x1="0" y1="0" x2="48" y2="48"><stop stopColor="#6366F1"/><stop offset="1" stopColor="#4F46E5"/></linearGradient></defs>
    </svg>
  );
}

export function TechIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="url(#tech-grad)"/>
      <rect x="14" y="12" width="20" height="16" rx="2" stroke="white" strokeWidth="2"/>
      <path d="M20 32h8M24 28v4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="24" cy="20" r="3" fill="white"/>
      <defs><linearGradient id="tech-grad" x1="0" y1="0" x2="48" y2="48"><stop stopColor="#14B8A6"/><stop offset="1" stopColor="#0D9488"/></linearGradient></defs>
    </svg>
  );
}

export function MarketingIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="url(#mkt-grad)"/>
      <circle cx="24" cy="24" r="4" fill="white"/>
      <circle cx="24" cy="24" r="10" stroke="white" strokeWidth="2" strokeDasharray="4 3"/>
      <path d="M32 16l2-2M16 32l-2 2M32 32l2 2M16 16l-2-2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <defs><linearGradient id="mkt-grad" x1="0" y1="0" x2="48" y2="48"><stop stopColor="#EC4899"/><stop offset="1" stopColor="#DB2777"/></linearGradient></defs>
    </svg>
  );
}

// Process step icons
export function ArchitectStepIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="url(#arch-step)"/>
      <path d="M12 28V16l8-5 8 5v12" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
      <rect x="17" y="22" width="6" height="6" stroke="white" strokeWidth="1.5"/>
      <defs><linearGradient id="arch-step" x1="0" y1="0" x2="40" y2="40"><stop stopColor="#3B82F6"/><stop offset="1" stopColor="#2563EB"/></linearGradient></defs>
    </svg>
  );
}

export function WriterStepIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="url(#writer-step)"/>
      <path d="M14 26l2-8 10-10 4 4-10 10-8 2 2 2z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" fill="white" fillOpacity="0.2"/>
      <defs><linearGradient id="writer-step" x1="0" y1="0" x2="40" y2="40"><stop stopColor="#8B5CF6"/><stop offset="1" stopColor="#7C3AED"/></linearGradient></defs>
    </svg>
  );
}

export function ImageStepIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="url(#img-step)"/>
      <rect x="10" y="12" width="20" height="16" rx="2" stroke="white" strokeWidth="1.5"/>
      <circle cx="17" cy="19" r="2.5" stroke="white" strokeWidth="1.5"/>
      <path d="M10 25l6-5 4 3 6-7 4 5v4a2 2 0 01-2 2H12a2 2 0 01-2-2v-2z" fill="white" fillOpacity="0.3"/>
      <defs><linearGradient id="img-step" x1="0" y1="0" x2="40" y2="40"><stop stopColor="#F97316"/><stop offset="1" stopColor="#EA580C"/></linearGradient></defs>
    </svg>
  );
}

export function ReviewerStepIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="url(#rev-step)"/>
      <circle cx="20" cy="18" r="6" stroke="white" strokeWidth="1.5"/>
      <path d="M24 22l5 5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <path d="M17 18l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <defs><linearGradient id="rev-step" x1="0" y1="0" x2="40" y2="40"><stop stopColor="#10B981"/><stop offset="1" stopColor="#059669"/></linearGradient></defs>
    </svg>
  );
}
