/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

import React, { useEffect, useState, CSSProperties } from 'react';
import { ImageEditorService } from '../../core/image/image-editor';
import { getImageDimensions } from '../../core/image/image-utils';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    background: '#1e1e1e',
    overflow: 'hidden',
  },
  viewport: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'auto',
    background: 'repeating-conic-gradient(#808080 0% 25%, #404040 0% 50%) 50% / 20px 20px',
    padding: '20px',
  },
  image: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain' as const,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  },
  infoBar: {
    padding: '8px 12px',
    background: '#252526',
    borderTop: '1px solid #3e3e42',
    fontFamily: "'Consolas', 'Courier New', monospace",
    fontSize: '12px',
    color: '#cccccc',
    display: 'flex',
    gap: '20px',
  },
  infoItem: {
    opacity: 0.8,
  },
  errorMessage: {
    color: '#f48771',
    padding: '20px',
    textAlign: 'center' as const,
    fontFamily: "'Consolas', 'Courier New', monospace",
  },
  loadingMessage: {
    color: '#cccccc',
    padding: '20px',
    textAlign: 'center' as const,
    fontFamily: "'Consolas', 'Courier New', monospace",
    opacity: 0.6,
  },
};

interface ImageEditorProps {
  filePath: string;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ filePath }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mimeType, setMimeType] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get MIME type
        const mime = ImageEditorService.getMimeType(filePath);
        if (mounted) {
          setMimeType(mime);
        }

        // Open the image
        const url = await ImageEditorService.openImage(filePath);
        
        if (mounted) {
          setImageUrl(url);
          
          // Get dimensions
          try {
            const dims = await getImageDimensions(url);
            if (mounted) {
              setDimensions(dims);
            }
          } catch (dimError) {
            console.warn('[ImageEditor] Could not get dimensions:', dimError);
          }
        }
      } catch (err) {
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          setError(errorMessage);
          console.error('[ImageEditor] Failed to load image:', errorMessage);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      mounted = false;
    };
  }, [filePath]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.viewport}>
          <div style={styles.loadingMessage}>Loading image...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.viewport}>
          <div style={styles.errorMessage}>Error loading image: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.viewport}>
        {imageUrl && <img src={imageUrl} alt={filePath} style={styles.image} />}
      </div>
      <div style={styles.infoBar}>
        <span style={styles.infoItem}>
          {filePath.split(/[/\\]/).pop()}
        </span>
        {dimensions && (
          <span style={styles.infoItem}>
            {dimensions.width} × {dimensions.height} px
          </span>
        )}
        {mimeType && (
          <span style={styles.infoItem}>
            {mimeType}
          </span>
        )}
      </div>
    </div>
  );
};

