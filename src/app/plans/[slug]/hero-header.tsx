"use client";

import Image from "next/image";
import type { ReactNode } from "react";

interface HeroHeaderProps {
  title: string;
  description?: string | null;
  photoSrc?: string | null;
  photoAlt?: string;
  artifactUrl?: string | null;
  backHref: string;
  backLabel: string;
  actions?: ReactNode;
  meta?: ReactNode;
}

export function HeroHeader({
  title,
  description,
  photoSrc,
  photoAlt,
  artifactUrl,
  backHref,
  backLabel,
  actions,
  meta,
}: HeroHeaderProps) {
  return (
    <header className="hero-header">
      {photoSrc ? (
        <Image
          src={photoSrc}
          alt={photoAlt ?? title}
          fill
          priority
          sizes="100vw"
          className="hero-header-image"
        />
      ) : (
        <div className="hero-header-image" style={{ background: "var(--ink)" }} />
      )}
      <div className="hero-header-overlay" />
      <div className="hero-header-topbar">
        <a href={backHref} className="hero-header-back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {backLabel}
        </a>
        {actions && <div className="hero-header-actions">{actions}</div>}
      </div>
      <div className="hero-header-content">
        <h1>{title}</h1>
        {(description || artifactUrl || meta) && (
          <div className="hero-header-meta">
            {description && <span>{description}</span>}
            {description && artifactUrl && <span className="meta-sep">·</span>}
            {artifactUrl && (
              <a href={artifactUrl}>Foto-przewodnik →</a>
            )}
            {meta}
          </div>
        )}
      </div>
    </header>
  );
}