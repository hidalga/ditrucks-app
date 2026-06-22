"use client";

import React from "react";
import { cn } from "@/lib/utils";

// ─── BUTTON ──────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";
  const variants = {
    primary: "bg-brand-accent text-brand-dark hover:bg-brand-accent-hover",
    secondary: "bg-brand-surface2 text-brand-text border border-brand-border hover:border-brand-border-hover hover:bg-brand-border",
    danger: "bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30",
    ghost: "text-brand-text-muted hover:text-brand-text hover:bg-brand-surface2",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-6 py-2.5 text-base gap-2",
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}

// ─── INPUT ──────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, ...props }, ref) => (
    <div className="space-y-1">
      {label && (
        <label className="block text-xs font-medium text-brand-text-muted uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={cn(
          "w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder:text-brand-text-dim",
          "focus:outline-none focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent/50",
          "transition-colors duration-150",
          error && "border-red-500/50 focus:ring-red-500/30",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-brand-text-dim">{hint}</p>}
    </div>
  )
);
Input.displayName = "Input";

// ─── TEXTAREA ────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="space-y-1">
      {label && (
        <label className="block text-xs font-medium text-brand-text-muted uppercase tracking-wide">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={cn(
          "w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder:text-brand-text-dim",
          "focus:outline-none focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent/50",
          "transition-colors duration-150 min-h-[80px] resize-y",
          error && "border-red-500/50",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
);
Textarea.displayName = "Textarea";

// ─── SELECT ──────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, ...props }, ref) => (
    <div className="space-y-1">
      {label && (
        <label className="block text-xs font-medium text-brand-text-muted uppercase tracking-wide">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={cn(
          "w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text",
          "focus:outline-none focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent/50",
          "transition-colors duration-150",
          error && "border-red-500/50",
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="" className="text-brand-text-dim">
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
);
Select.displayName = "Select";

// ─── BADGE ──────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  dot?: string;
}

export function Badge({ children, className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
        className
      )}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />}
      {children}
    </span>
  );
}

// ─── CARD ──────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hover, onClick }: CardProps) {
  return (
    <div
      className={cn(
        "bg-brand-surface border border-brand-border rounded-xl",
        hover && "hover:border-brand-border-hover transition-colors cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ─── STAT CARD ──────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  accent?: string;
  subtitle?: string;
}

export function StatCard({ label, value, icon, accent, subtitle }: StatCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-brand-text-muted uppercase tracking-wider font-medium">{label}</p>
          <p className={cn("text-2xl font-bold mt-1", accent || "text-brand-text")}>{value}</p>
          {subtitle && <p className="text-xs text-brand-text-dim mt-0.5">{subtitle}</p>}
        </div>
        {icon && (
          <div className="p-2 bg-brand-surface2 rounded-lg text-brand-text-muted">{icon}</div>
        )}
      </div>
    </Card>
  );
}

// ─── MODAL ──────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-brand-surface border border-brand-border rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-brand-border">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-brand-text-muted hover:text-brand-text p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// ─── CONFIRM MODAL ──────────────────────────────────
interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
  loading?: boolean;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  danger,
  loading,
}: ConfirmModalProps) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-brand-text-muted mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant={danger ? "danger" : "primary"}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}

// ─── EMPTY STATE ─────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="text-brand-text-dim mb-4">{icon}</div>}
      <h3 className="text-base font-medium text-brand-text-muted mb-1">{title}</h3>
      {description && <p className="text-sm text-brand-text-dim mb-4 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}

// ─── TABS ──────────────────────────────────────────
interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 border-b border-brand-border overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer",
            activeTab === tab.id
              ? "border-brand-accent text-brand-accent"
              : "border-transparent text-brand-text-muted hover:text-brand-text"
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── SCORE GAUGE ─────────────────────────────────────
interface ScoreGaugeProps {
  score: number | null;
  label: string;
  size?: "sm" | "md";
  light?: boolean;
}

export function ScoreGauge({ score, label, size = "md", light = false }: ScoreGaugeProps) {
  if (score === null) return null;

  const getColor = (s: number) => {
    if (s >= 85) return "#22c55e";
    if (s >= 70) return "#3b82f6";
    if (s >= 50) return "#f59e0b";
    if (s >= 30) return "#f97316";
    return "#ef4444";
  };

  const radius = size === "sm" ? 28 : 40;
  const stroke = size === "sm" ? 5 : 6;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const dim = (radius + stroke) * 2;
  const trackColor = light ? "#e2e8f0" : "#2a2a2a";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={dim} height={dim} className="-rotate-90">
        <circle cx={radius + stroke} cy={radius + stroke} r={radius} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle cx={radius + stroke} cy={radius + stroke} r={radius} fill="none" stroke={getColor(score)} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={circumference - progress} strokeLinecap="round" className="transition-all duration-700" />
        <text x={radius + stroke} y={radius + stroke} textAnchor="middle" dominantBaseline="central" className="rotate-90 origin-center"
          fill={getColor(score)} fontSize={size === "sm" ? 14 : 18} fontWeight="bold">{score}</text>
      </svg>
      <span className={cn("font-medium", size === "sm" ? "text-xs" : "text-sm", light ? "text-slate-500" : "text-brand-text-muted")}>{label}</span>
    </div>
  );
}

// ─── PAGE HEADER ─────────────────────────────────────
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export function PageHeader({ title, description, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {breadcrumbs && (
        <nav className="flex items-center gap-2 text-xs text-brand-text-dim mb-2">
          {breadcrumbs.map((bc, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span>/</span>}
              {bc.href ? (
                <a href={bc.href} className="hover:text-brand-text transition-colors">
                  {bc.label}
                </a>
              ) : (
                <span className="text-brand-text-muted">{bc.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-brand-text-muted mt-1">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-3 flex-shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

// ─── LOADING ─────────────────────────────────────────
export function Loading() {
  return (
    <div className="flex items-center justify-center py-16">
      <svg className="animate-spin h-8 w-8 text-brand-accent" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}
