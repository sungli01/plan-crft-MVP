import React from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  Megaphone,
  FileCode,
  Terminal,
  TrendingUp,
  Search,
  Building2,
  Edit2,
  Trash2,
  Clock,
  ArrowRight,
  FileText,
  Lock
} from "lucide-react";
import { 
  DocumentCategory, 
  Document, 
  cn, 
  formatDate, 
  getCategoryById 
} from "@/lib/index";
import { IMAGES } from "@/assets/images";

const ICON_MAP: Record<string, React.ElementType> = {
  Briefcase,
  Megaphone,
  FileCode,
  Terminal,
  TrendingUp,
  Search,
  Building2,
};

/**
 * CategoryCard: 문서 카테고리를 시각적으로 표현하는 카드
 * PRO 카테고리의 경우 강조된 디자인과 배지를 표시함
 */
export function CategoryCard({ category, onClick }: { category: DocumentCategory; onClick: () => void }) {
  const Icon = ICON_MAP[category.iconName] || FileText;

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      onClick={onClick}
      className={cn(
        "relative group cursor-pointer overflow-hidden rounded-3xl border bg-card p-8 h-full transition-all duration-300",
        category.isPro 
          ? "border-accent/20 hover:border-accent shadow-[0_8px_30px_-6px_rgba(157,78,221,0.1)] hover:shadow-[0_20px_40px_-12px_rgba(157,78,221,0.2)]"
          : "border-border hover:border-primary shadow-[0_8px_30px_-6px_rgba(82,108,255,0.05)] hover:shadow-[0_20px_40px_-12px_rgba(82,108,255,0.1)]"
      )}
    >
      {/* 배경 장식 패턴 (PRO 전용) */}
      {category.isPro && (
        <div className="absolute -right-4 -top-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
           <TrendingUp size={160} />
        </div>
      )}

      <div className="flex items-start justify-between mb-8">
        <div className={cn(
          "p-4 rounded-2xl transition-colors",
          category.isPro ? "bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground" : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
        )}>
          <Icon size={28} />
        </div>
        {category.isPro && (
          <div className="flex items-center gap-1.5 bg-accent text-accent-foreground text-[11px] font-bold px-3 py-1 rounded-full shadow-sm">
            <Lock size={12} />
            <span>PRO</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-2xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
          {category.label}
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
          {category.description}
        </p>
      </div>

      <div className="mt-8 flex items-center text-sm font-semibold text-primary opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
        <span>생성하기</span>
        <ArrowRight size={16} className="ml-2" />
      </div>
    </motion.div>
  );
}

/**
 * FeatureCard: 서비스의 주요 기능을 설명하는 카드
 */
export function FeatureCard({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="p-8 rounded-3xl border border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-colors"
    >
      <div className="mb-5 w-12 h-12 flex items-center justify-center rounded-xl bg-primary/5 text-primary">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </motion.div>
  );
}

/**
 * DocumentCard: 생성된 문서 목록을 대시보드에 표시하는 카드
 */
export function DocumentCard({ document, onEdit, onDelete }: { document: Document; onEdit: () => void; onDelete: () => void }) {
  const category = getCategoryById(document.categoryId);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative bg-card border border-border rounded-2xl p-6 hover:shadow-xl transition-all duration-300"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-1">
          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground mb-2">
            {category?.label || "기타"}
          </span>
          <h4 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {document.title}
          </h4>
        </div>
        
        <div className="flex gap-1">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            title="편집"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-2 hover:bg-destructive/10 rounded-lg text-destructive transition-colors"
            title="삭제"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="h-24 w-full bg-muted/30 rounded-lg mb-4 overflow-hidden relative">
        {/* 문서 미리보기 시각화 - 실제 콘텐츠의 일부 또는 더미 이미지 */}
        <div className="p-3 text-[8px] text-muted-foreground/60 leading-tight font-mono overflow-hidden">
          {document.content.substring(0, 150)}...
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-4">
        <div className="flex items-center">
          <Clock size={14} className="mr-1.5" />
          {formatDate(document.updatedAt)}
        </div>
        <div className={cn(
          "px-2 py-1 rounded-full font-medium",
          document.status === "completed" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
        )}>
          {document.status === "completed" ? "완료" : "초안"}
        </div>
      </div>
    </motion.div>
  );
}
