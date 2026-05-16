// Subline v3 design system primitives — ported from the design system ZIP.
// Inline styles preserved 1:1 so the runtime output matches the reference pixel-for-pixel.

import type { CSSProperties, ReactNode, MouseEventHandler } from 'react';
import { C, FONT } from './tokens';
import { I } from './icons';
import logoImg from '@/assets/logo.png';

// ── Mark ───────────────────────────────────────────────────────────────────
export const SublineMark = ({ size = 64 }: { size?: number }) => (
  <img src={logoImg} width={size} height={size} alt="Subline" style={{ display: 'block', objectFit: 'contain' }} />
);

// ── Icon ───────────────────────────────────────────────────────────────────
export const Icon = ({
  d,
  size = 22,
  color,
  stroke = 1.8,
  fill = 'none',
}: {
  d: ReactNode;
  size?: number;
  color?: string;
  stroke?: number;
  fill?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={color || 'currentColor'}
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {d}
  </svg>
);

// ── Screen ─────────────────────────────────────────────────────────────────
export const Screen = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      width: '100%',
      minHeight: '100vh',
      background: C.bg,
      color: C.text,
      fontFamily: FONT,
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    {children}
  </div>
);

export const ScrollBody = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', ...style }}>{children}</div>
);

// ── PageHeader ─────────────────────────────────────────────────────────────
export const PageHeader = ({
  title,
  actions,
  back,
  onBack,
}: {
  title?: string;
  actions?: ReactNode;
  back?: boolean;
  onBack?: () => void;
}) => (
  <div style={{ padding: '50px 20px 10px', flexShrink: 0, background: C.bg }}>
    {(back || actions) && (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: title ? 14 : 0,
          minHeight: 28,
        }}
      >
        {back ? (
          <button
            onClick={onBack}
            style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: C.text }}
          >
            <Icon d={I.back} size={22} />
          </button>
        ) : (
          <div />
        )}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>{actions}</div>
      </div>
    )}
    {title && (
      <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1.1, margin: 0 }}>{title}</h1>
    )}
  </div>
);

// ── SectionHeader ──────────────────────────────────────────────────────────
export const SectionHeader = ({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0 20px',
      marginBottom: 12,
      marginTop: 8,
    }}
  >
    <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: -0.2 }}>{title}</h2>
    {action && (
      <button
        onClick={onAction}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: C.blue,
          fontFamily: FONT,
          fontSize: 13,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <span>{action}</span> <Icon d={I.arrowRight} size={14} stroke={2.2} />
      </button>
    )}
  </div>
);

// ── SearchBar ──────────────────────────────────────────────────────────────
export const SearchBar = ({
  placeholder = 'Pesquisar barbeiros, serviços',
  value,
  onChange,
  onClick,
}: {
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
  onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    style={{
      margin: '0 20px',
      height: 48,
      borderRadius: 999,
      background: C.surface,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '0 18px',
      cursor: onClick ? 'pointer' : 'text',
    }}
  >
    <Icon d={I.search} size={20} color={C.muted} stroke={2} />
    {onChange ? (
      <input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1,
          border: 'none',
          background: 'transparent',
          outline: 'none',
          fontSize: 15,
          fontWeight: 500,
          color: C.text,
          fontFamily: FONT,
        }}
      />
    ) : (
      <span style={{ fontSize: 15, color: value ? C.text : C.muted, fontWeight: 500 }}>{value || placeholder}</span>
    )}
  </div>
);

// ── Chip ───────────────────────────────────────────────────────────────────
export const Chip = ({
  label,
  active,
  disabled,
  onClick,
  icon,
  tone = 'ink',
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  tone?: 'ink' | 'brand';
}) => {
  const activeStyles =
    tone === 'brand'
      ? { background: C.blue, color: '#fff', border: `1px solid ${C.blue}` }
      : { background: C.ctaSurface, color: C.ctaInk, border: `1px solid ${C.ctaSurface}` };
  const restStyles = disabled
    ? {
        background: C.bg,
        color: '#C8C8C8',
        border: `1px solid ${C.border}`,
        textDecoration: 'line-through' as const,
        cursor: 'not-allowed' as const,
      }
    : { background: C.chip, color: C.text, border: `1px solid ${C.chipBorder}`, cursor: 'pointer' as const };
  return (
    <div
      onClick={() => !disabled && onClick && onClick()}
      style={{
        height: 36,
        padding: '0 16px',
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 13,
        fontWeight: 500,
        fontFamily: FONT,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        ...(active ? activeStyles : restStyles),
      }}
    >
      {icon && <Icon d={icon} size={14} stroke={2} />}
      {label}
    </div>
  );
};

export const ChipRow = ({ children, padding = '0 20px' }: { children: ReactNode; padding?: string }) => (
  <div
    style={{
      display: 'flex',
      gap: 8,
      overflowX: 'auto',
      padding,
      paddingBottom: 4,
      scrollbarWidth: 'none',
    }}
  >
    {children}
  </div>
);

// ── CTA ────────────────────────────────────────────────────────────────────
type CTAVariant = 'primary' | 'brand' | 'ghost' | 'danger';
export const CTA = ({
  children,
  variant = 'primary',
  icon,
  onClick,
  style,
  full = true,
  type = 'button',
  disabled,
}: {
  children: ReactNode;
  variant?: CTAVariant;
  icon?: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  style?: CSSProperties;
  full?: boolean;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) => {
  const variants: Record<CTAVariant, CSSProperties> = {
    primary: {
      background: C.ctaSurface,
      color: C.ctaInk,
      border: 'none',
      boxShadow: '0 5px 14px rgba(0,0,0,0.14), 0 1px 3px rgba(0,0,0,0.08)',
    },
    brand: {
      background: C.blue,
      color: '#fff',
      border: 'none',
      boxShadow: '0 6px 18px rgba(43,142,240,0.22), 0 1px 4px rgba(43,142,240,0.14)',
    },
    ghost: {
      background: 'transparent',
      color: C.text,
      border: `1px solid ${C.chipBorder}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
    },
    danger: {
      background: 'transparent',
      color: C.danger,
      border: `1px solid ${C.danger}`,
      boxShadow: '0 4px 12px rgba(226,75,74,0.14), 0 1px 3px rgba(226,75,74,0.08)',
    },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...variants[variant],
        height: 52,
        padding: '0 24px',
        borderRadius: 999,
        fontSize: 15,
        fontWeight: 600,
        fontFamily: FONT,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: full ? '100%' : 'auto',
        opacity: disabled ? 0.6 : 1,
        transition: 'box-shadow .18s, transform .12s',
        ...style,
      }}
    >
      {icon}
      {children}
    </button>
  );
};

// ── PlanBadge ──────────────────────────────────────────────────────────────
export const PlanBadge = ({ children = 'Premium' }: { children?: ReactNode }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: 999,
      background: C.blueDim,
      color: C.blue,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    }}
  >
    {children}
  </span>
);

// ── Card ───────────────────────────────────────────────────────────────────
export const Card = ({
  children,
  style,
  soft,
  padding = 16,
}: {
  children: ReactNode;
  style?: CSSProperties;
  soft?: boolean;
  padding?: number | string;
}) => (
  <div
    style={{
      background: soft ? C.cardSoft : C.card,
      borderRadius: 16,
      padding,
      ...style,
    }}
  >
    {children}
  </div>
);

// ── ImagePlaceholder ───────────────────────────────────────────────────────
export const ImagePlaceholder = ({
  ratio = '16/9',
  radius = 16,
  style,
}: {
  ratio?: string;
  radius?: number;
  style?: CSSProperties;
}) => (
  <div
    style={{
      aspectRatio: ratio,
      borderRadius: radius,
      background: `repeating-linear-gradient(135deg, ${C.cardSoft} 0 10px, ${C.surface} 10px 20px)`,
      width: '100%',
      ...style,
    }}
  />
);

// ── Avatar ─────────────────────────────────────────────────────────────────
export const Avatar = ({
  initials,
  size = 40,
  bg,
}: {
  initials: string;
  size?: number;
  bg?: string;
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: 999,
      background: bg || C.surface,
      color: C.text,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 600,
      fontSize: size * 0.36,
      flexShrink: 0,
    }}
  >
    {initials}
  </div>
);

// ── TabBar ─────────────────────────────────────────────────────────────────
export type ClientTabId = 'home' | 'cal' | 'plans' | 'shop' | 'profile';

export const TabBar = ({
  active = 'home',
  onChange,
  tabs,
}: {
  active?: string;
  onChange?: (id: string) => void;
  tabs?: { id: string; label: string; icon: ReactNode }[];
}) => {
  const defaultTabs = [
    { id: 'home', label: 'Início', icon: I.home },
    { id: 'cal', label: 'Marcações', icon: I.cal },
    { id: 'plans', label: 'Plano', icon: I.card },
    { id: 'shop', label: 'Loja', icon: I.bag },
    { id: 'profile', label: 'Conta', icon: I.user },
  ];
  const ts = tabs || defaultTabs;
  return (
    <div
      style={{
        display: 'flex',
        borderTop: `1px solid ${C.border}`,
        background: C.bg,
        padding: '10px 4px 22px',
        flexShrink: 0,
        position: 'sticky',
        bottom: 0,
      }}
    >
      {ts.map((t) => {
        const on = t.id === active;
        return (
          <div
            key={t.id}
            onClick={() => onChange && onChange(t.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '4px 0',
              position: 'relative',
              cursor: onChange ? 'pointer' : 'default',
            }}
          >
            <Icon d={t.icon} size={22} stroke={on ? 2.2 : 1.8} color={on ? C.blue : C.faint} />
            <div style={{ fontSize: 10.5, fontWeight: on ? 700 : 500, color: on ? C.text : C.faint }}>
              {t.label}
            </div>
            {on && (
              <span
                style={{
                  position: 'absolute',
                  top: -6,
                  width: 4,
                  height: 4,
                  borderRadius: 999,
                  background: C.text,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
