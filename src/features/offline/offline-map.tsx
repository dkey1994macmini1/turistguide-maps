"use client";

import { useState, useEffect } from "react";

interface OfflineMapProps {
  slug: string;
  alt?: string;
}

/**
 * Displays a static map image from IndexedDB when offline.
 * Falls back to a simple text placeholder if no image is available.
 */
export function OfflineMap({ slug, alt }: OfflineMapProps) {
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    // Dynamic import to avoid bundling IDB in server render
    import("./db").then(({ getMapImage }) => {
      getMapImage(slug).then((blob) => {
        if (blob) {
          setImageBlob(blob);
        }
      });
    });
  }, [slug]);

  // Create object URL for the blob
  useEffect(() => {
    if (imageBlob) {
      const url = URL.createObjectURL(imageBlob);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setImageUrl(null);
  }, [imageBlob]);

  if (!imageUrl) {
    return (
      <div className="offline-map-placeholder">
        <span>🗺️ Mapa offline niedostępna</span>
        <span className="offline-map-hint">
          Zapisz plan offline, aby mieć dostęp do mapy
        </span>
        <style>{`
          .offline-map-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            min-height: 300px;
            background: #f0f0f0;
            color: #666;
            font-size: 1rem;
            gap: 4px;
          }
          .offline-map-hint {
            font-size: 0.85rem;
            color: #999;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="offline-map-container">
      <img
        src={imageUrl}
        alt={alt ?? "Mapa offline"}
        className="offline-map-image"
      />
      <style>{`
        .offline-map-container {
          width: 100%;
          height: 100%;
          overflow: hidden;
          position: relative;
        }
        .offline-map-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
      `}</style>
    </div>
  );
}