/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

import React, { useEffect, useState, useRef, CSSProperties } from 'react';
import { ImageEditorService } from '../../core/image/image-editor';
import { getImageDimensions, resizeImage, calculateProportionalDimensions, scaleDimensions, cropImage, setTransparency, supportsTransparency } from '../../core/image/image-utils';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    background: '#1e1e1e',
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    gap: '8px',
    padding: '8px 12px',
    background: '#2d2d30',
    borderBottom: '1px solid #3e3e42',
    alignItems: 'center',
  },
  toolbarButton: {
    padding: '6px 12px',
    background: '#0e639c',
    color: '#ffffff',
    border: 'none',
    borderRadius: '2px',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: "'Segoe UI', sans-serif",
    transition: 'background 0.2s',
  },
  toolbarButtonDisabled: {
    padding: '6px 12px',
    background: '#3e3e42',
    color: '#858585',
    border: 'none',
    borderRadius: '2px',
    cursor: 'not-allowed',
    fontSize: '13px',
    fontFamily: "'Segoe UI', sans-serif",
  },
  toolbarSeparator: {
    width: '1px',
    height: '20px',
    background: '#3e3e42',
  },
  viewport: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'auto',
    background: '#1e1e1e',
    padding: '20px',
    position: 'relative' as const,
  },
  imageContainer: {
    position: 'relative' as const,
    display: 'inline-block',
  },
  cropOverlay: {
    position: 'absolute' as const,
    border: '2px solid #007acc',
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
    cursor: 'move',
    pointerEvents: 'auto' as const,
  },
  cropHandle: {
    position: 'absolute' as const,
    width: '10px',
    height: '10px',
    background: '#ffffff',
    border: '2px solid #007acc',
    borderRadius: '50%',
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
  modal: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dialog: {
    background: '#252526',
    border: '1px solid #3e3e42',
    borderRadius: '4px',
    padding: '20px',
    minWidth: '400px',
  },
  dialogTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#cccccc',
    marginBottom: '16px',
    fontFamily: "'Segoe UI', sans-serif",
  },
  dialogContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginBottom: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  label: {
    fontSize: '13px',
    color: '#cccccc',
    fontFamily: "'Segoe UI', sans-serif",
  },
  input: {
    background: '#3c3c3c',
    border: '1px solid #3e3e42',
    color: '#cccccc',
    padding: '6px 8px',
    fontSize: '13px',
    fontFamily: "'Segoe UI', sans-serif",
    borderRadius: '2px',
  },
  checkbox: {
    marginRight: '8px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '13px',
    color: '#cccccc',
    fontFamily: "'Segoe UI', sans-serif",
    cursor: 'pointer',
  },
  dialogActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
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
  const [originalDataUrl, setOriginalDataUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mimeType, setMimeType] = useState<string | null>(null);
  
  // Resize dialog state
  const [showResizeDialog, setShowResizeDialog] = useState(false);
  const [resizeWidth, setResizeWidth] = useState('');
  const [resizeHeight, setResizeHeight] = useState('');
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [isModified, setIsModified] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Crop state
  const [cropMode, setCropMode] = useState(false);
  const [cropRegion, setCropRegion] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [cropDragging, setCropDragging] = useState(false);
  const [cropDragStart, setCropDragStart] = useState<{ x: number; y: number } | null>(null);
  const [showCropPreview, setShowCropPreview] = useState(false);
  const [cropPreviewUrl, setCropPreviewUrl] = useState<string | null>(null);
  
  // Transparency state
  const [opacity, setOpacity] = useState(1.0); // 1.0 = fully opaque, 0.0 = fully transparent
  const [showTransparencyControls, setShowTransparencyControls] = useState(false);
  const [showCheckerboard, setShowCheckerboard] = useState(false);
  
  // Refs
  const imageRef = useRef<HTMLImageElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Load the image initially
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
          setOriginalDataUrl(url);
          
          // Get dimensions
          try {
            const dims = await getImageDimensions(url);
            if (mounted) {
              setDimensions(dims);
              setOriginalDimensions(dims);
              setResizeWidth(String(dims.width));
              setResizeHeight(String(dims.height));
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

  const handleResizeClick = () => {
    if (dimensions) {
      setResizeWidth(String(dimensions.width));
      setResizeHeight(String(dimensions.height));
      setShowResizeDialog(true);
    }
  };

  const handleQuickScale = async (scale: number) => {
    if (!dimensions || !originalDataUrl) return;

    try {
      setProcessing(true);
      const newDims = scaleDimensions(dimensions.width, dimensions.height, scale);
      const resized = await resizeImage(originalDataUrl, newDims.width, newDims.height);
      setImageUrl(resized);
      setDimensions(newDims);
      setIsModified(true);
      console.log(`[ImageEditor] Scaled to ${Math.round(scale * 100)}%: ${newDims.width}×${newDims.height}`);
    } catch (err) {
      console.error('[ImageEditor] Failed to scale image:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProcessing(false);
    }
  };

  const handleResizeApply = async () => {
    const width = parseInt(resizeWidth);
    const height = parseInt(resizeHeight);

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      alert('Please enter valid dimensions');
      return;
    }

    if (!originalDataUrl) return;

    try {
      setProcessing(true);
      setShowResizeDialog(false);

      const resized = await resizeImage(originalDataUrl, width, height);
      setImageUrl(resized);
      setDimensions({ width, height });
      setIsModified(true);
      console.log(`[ImageEditor] Resized to ${width}×${height}`);
    } catch (err) {
      console.error('[ImageEditor] Failed to resize image:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProcessing(false);
    }
  };

  const handleWidthChange = (value: string) => {
    setResizeWidth(value);
    if (maintainAspectRatio && originalDimensions) {
      const width = parseInt(value);
      if (!isNaN(width)) {
        const calculated = calculateProportionalDimensions(
          originalDimensions.width,
          originalDimensions.height,
          width,
          null
        );
        setResizeHeight(String(calculated.height));
      }
    }
  };

  const handleHeightChange = (value: string) => {
    setResizeHeight(value);
    if (maintainAspectRatio && originalDimensions) {
      const height = parseInt(value);
      if (!isNaN(height)) {
        const calculated = calculateProportionalDimensions(
          originalDimensions.width,
          originalDimensions.height,
          null,
          height
        );
        setResizeWidth(String(calculated.width));
      }
    }
  };

  const handleSave = async () => {
    if (!imageUrl || !window.api?.saveFile) {
      console.error('[ImageEditor] Cannot save: missing data or API');
      return;
    }

    try {
      setProcessing(true);

      // Convert data URL to base64
      const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
      
      // Show save dialog
      const result = await window.api.saveFile(filePath, base64Data);
      
      if (result.success) {
        console.log('[ImageEditor] Image saved successfully');
        setIsModified(false);
        // TODO: Update tab state to mark as not dirty
      }
    } catch (err) {
      console.error('[ImageEditor] Failed to save image:', err);
      alert('Failed to save image: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    if (originalDataUrl && originalDimensions) {
      setImageUrl(originalDataUrl);
      setDimensions(originalDimensions);
      setIsModified(false);
      setCropMode(false);
      setCropRegion(null);
      setOpacity(1.0); // Reset opacity
      setShowTransparencyControls(false);
      console.log('[ImageEditor] Reset to original');
    }
  };

  // Transparency handlers
  const handleToggleTransparency = () => {
    setShowTransparencyControls(!showTransparencyControls);
    // Show checkerboard when transparency controls are visible
    setShowCheckerboard(!showTransparencyControls);
  };

  const handleOpacityChange = async (newOpacity: number) => {
    if (!originalDataUrl) return;

    // Validate opacity
    const validOpacity = Math.max(0, Math.min(1, newOpacity));
    setOpacity(validOpacity);

    try {
      setProcessing(true);
      
      // Apply transparency
      const transparentImage = await setTransparency(originalDataUrl, validOpacity);
      setImageUrl(transparentImage);
      setIsModified(validOpacity !== 1.0);
      
      console.log(`[ImageEditor] Opacity set to ${Math.round(validOpacity * 100)}%`);
    } catch (err) {
      console.error('[ImageEditor] Failed to adjust transparency:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProcessing(false);
    }
  };

  // Crop handlers
  const handleCropClick = () => {
    if (dimensions && imageRef.current) {
      setCropMode(true);
      // Initialize crop region to center 50% of image
      const width = Math.floor(dimensions.width * 0.5);
      const height = Math.floor(dimensions.height * 0.5);
      const x = Math.floor((dimensions.width - width) / 2);
      const y = Math.floor((dimensions.height - height) / 2);
      setCropRegion({ x, y, width, height });
    }
  };

  const handleCropCancel = () => {
    setCropMode(false);
    setCropRegion(null);
  };

  const handleCropApply = async () => {
    if (!cropRegion || !originalDataUrl) return;

    try {
      setProcessing(true);
      
      // Generate preview
      const cropped = await cropImage(
        originalDataUrl,
        cropRegion.x,
        cropRegion.y,
        cropRegion.width,
        cropRegion.height
      );
      
      setCropPreviewUrl(cropped);
      setShowCropPreview(true);
    } catch (err) {
      console.error('[ImageEditor] Failed to generate crop preview:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProcessing(false);
    }
  };

  const handleCropConfirm = async () => {
    if (!cropPreviewUrl) return;

    try {
      setImageUrl(cropPreviewUrl);
      
      // Update dimensions
      const dims = await getImageDimensions(cropPreviewUrl);
      setDimensions(dims);
      
      setIsModified(true);
      setShowCropPreview(false);
      setCropMode(false);
      setCropRegion(null);
      console.log(`[ImageEditor] Cropped to ${dims.width}×${dims.height}`);
    } catch (err) {
      console.error('[ImageEditor] Failed to apply crop:', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // Mouse handlers for crop selection
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!cropMode || !imageRef.current || !imageContainerRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCropDragging(true);
    setCropDragStart({ x, y });
    
    // Start new selection
    setCropRegion({ x: Math.round(x), y: Math.round(y), width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cropDragging || !cropDragStart || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const x = Math.min(cropDragStart.x, currentX);
    const y = Math.min(cropDragStart.y, currentY);
    const width = Math.abs(currentX - cropDragStart.x);
    const height = Math.abs(currentY - cropDragStart.y);

    setCropRegion({ 
      x: Math.round(x), 
      y: Math.round(y), 
      width: Math.round(width), 
      height: Math.round(height) 
    });
  };

  const handleMouseUp = () => {
    if (cropDragging) {
      setCropDragging(false);
      setCropDragStart(null);
    }
  };

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
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <button
          style={dimensions ? styles.toolbarButton : styles.toolbarButtonDisabled}
          onClick={handleResizeClick}
          disabled={!dimensions || processing || cropMode}
        >
          Resize...
        </button>
        
        <button
          style={dimensions && !cropMode ? styles.toolbarButton : styles.toolbarButtonDisabled}
          onClick={handleCropClick}
          disabled={!dimensions || processing || cropMode}
        >
          Crop
        </button>
        
        {cropMode && (
          <>
            <button
              style={cropRegion && cropRegion.width > 0 && cropRegion.height > 0 ? styles.toolbarButton : styles.toolbarButtonDisabled}
              onClick={handleCropApply}
              disabled={!cropRegion || cropRegion.width === 0 || cropRegion.height === 0 || processing}
            >
              Apply Crop
            </button>
            <button
              style={styles.toolbarButton}
              onClick={handleCropCancel}
            >
              Cancel
            </button>
          </>
        )}
        
        <div style={styles.toolbarSeparator} />
        
        {/* Transparency Controls */}
        <button
          style={supportsTransparency(mimeType) && dimensions && !cropMode ? styles.toolbarButton : styles.toolbarButtonDisabled}
          onClick={handleToggleTransparency}
          disabled={!supportsTransparency(mimeType) || !dimensions || processing || cropMode}
          title={supportsTransparency(mimeType) ? 'Toggle transparency controls' : 'Transparency not supported for this format'}
        >
          {showTransparencyControls ? 'Hide' : 'Show'} Transparency
        </button>
        
        {showTransparencyControls && (
          <>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: '#cccccc',
              fontFamily: "'Segoe UI', sans-serif",
            }}>
              Opacity:
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(opacity * 100)}
                onChange={(e) => handleOpacityChange(parseInt(e.target.value) / 100)}
                disabled={processing}
                style={{
                  width: '120px',
                  cursor: processing ? 'not-allowed' : 'pointer',
                }}
              />
              <span style={{
                minWidth: '45px',
                textAlign: 'right',
              }}>
                {Math.round(opacity * 100)}%
              </span>
            </label>
            
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                style={styles.checkbox}
                checked={showCheckerboard}
                onChange={(e) => setShowCheckerboard(e.target.checked)}
              />
              Show checkerboard
            </label>
          </>
        )}
        
        <div style={styles.toolbarSeparator} />
        
        <button
          style={dimensions && !cropMode ? styles.toolbarButton : styles.toolbarButtonDisabled}
          onClick={() => handleQuickScale(0.5)}
          disabled={!dimensions || processing || cropMode}
        >
          50%
        </button>
        <button
          style={dimensions && !cropMode ? styles.toolbarButton : styles.toolbarButtonDisabled}
          onClick={() => handleQuickScale(0.75)}
          disabled={!dimensions || processing || cropMode}
        >
          75%
        </button>
        <button
          style={dimensions && !cropMode ? styles.toolbarButton : styles.toolbarButtonDisabled}
          onClick={() => handleQuickScale(1.5)}
          disabled={!dimensions || processing || cropMode}
        >
          150%
        </button>
        <button
          style={dimensions && !cropMode ? styles.toolbarButton : styles.toolbarButtonDisabled}
          onClick={() => handleQuickScale(2.0)}
          disabled={!dimensions || processing || cropMode}
        >
          200%
        </button>
        
        <div style={styles.toolbarSeparator} />
        
        <button
          style={isModified ? styles.toolbarButton : styles.toolbarButtonDisabled}
          onClick={handleSave}
          disabled={!isModified || processing}
        >
          Save
        </button>
        <button
          style={isModified ? styles.toolbarButton : styles.toolbarButtonDisabled}
          onClick={handleReset}
          disabled={!isModified || processing}
        >
          Reset
        </button>
      </div>

      {/* Image Viewport */}
      <div style={{
        ...styles.viewport,
        background: showCheckerboard 
          ? 'repeating-conic-gradient(#808080 0% 25%, #404040 0% 50%) 50% / 20px 20px'
          : '#1e1e1e',
      }}>
        <div 
          ref={imageContainerRef}
          style={styles.imageContainer}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {imageUrl && (
            <img 
              ref={imageRef}
              src={imageUrl} 
              alt={filePath} 
              style={{
                ...styles.image,
                cursor: cropMode ? 'crosshair' : 'default'
              }} 
            />
          )}
          
          {/* Crop overlay */}
          {cropMode && cropRegion && cropRegion.width > 0 && cropRegion.height > 0 && (
            <div
              style={{
                ...styles.cropOverlay,
                left: `${cropRegion.x}px`,
                top: `${cropRegion.y}px`,
                width: `${cropRegion.width}px`,
                height: `${cropRegion.height}px`,
              }}
            >
              {/* Crop region info */}
              <div style={{
                position: 'absolute',
                top: '-25px',
                left: '0',
                background: 'rgba(0, 0, 0, 0.7)',
                color: '#ffffff',
                padding: '4px 8px',
                fontSize: '12px',
                borderRadius: '2px',
                whiteSpace: 'nowrap',
              }}>
                {cropRegion.width} × {cropRegion.height} px
              </div>
            </div>
          )}
        </div>
        
        {processing && (
          <div style={{ position: 'absolute', ...styles.loadingMessage }}>
            Processing...
          </div>
        )}
        
        {cropMode && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: '4px',
            fontSize: '13px',
          }}>
            Click and drag to select crop region
          </div>
        )}
      </div>

      {/* Info Bar */}
      <div style={styles.infoBar}>
        <span style={styles.infoItem}>
          {filePath.split(/[/\\]/).pop()} {isModified && '(modified)'}
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

      {/* Resize Dialog */}
      {showResizeDialog && (
        <div style={styles.modal} onClick={() => setShowResizeDialog(false)}>
          <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <div style={styles.dialogTitle}>Resize Image</div>
            <div style={styles.dialogContent}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Width (pixels)</label>
                <input
                  type="number"
                  style={styles.input}
                  value={resizeWidth}
                  onChange={(e) => handleWidthChange(e.target.value)}
                  min="1"
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Height (pixels)</label>
                <input
                  type="number"
                  style={styles.input}
                  value={resizeHeight}
                  onChange={(e) => handleHeightChange(e.target.value)}
                  min="1"
                />
              </div>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  style={styles.checkbox}
                  checked={maintainAspectRatio}
                  onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                />
                Maintain aspect ratio
              </label>
            </div>
            <div style={styles.dialogActions}>
              <button
                style={styles.toolbarButton}
                onClick={() => setShowResizeDialog(false)}
              >
                Cancel
              </button>
              <button
                style={styles.toolbarButton}
                onClick={handleResizeApply}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Crop Preview Dialog */}
      {showCropPreview && cropPreviewUrl && (
        <div style={styles.modal} onClick={() => setShowCropPreview(false)}>
          <div style={{...styles.dialog, minWidth: '500px'}} onClick={(e) => e.stopPropagation()}>
            <div style={styles.dialogTitle}>Crop Preview</div>
            <div style={{
              ...styles.dialogContent,
              alignItems: 'center',
            }}>
              <img 
                src={cropPreviewUrl} 
                alt="Crop preview" 
                style={{
                  maxWidth: '450px',
                  maxHeight: '450px',
                  objectFit: 'contain',
                  border: '1px solid #3e3e42',
                }}
              />
              <div style={{
                fontSize: '13px',
                color: '#cccccc',
                marginTop: '12px',
              }}>
                Preview of cropped image
              </div>
            </div>
            <div style={styles.dialogActions}>
              <button
                style={styles.toolbarButton}
                onClick={() => setShowCropPreview(false)}
              >
                Cancel
              </button>
              <button
                style={styles.toolbarButton}
                onClick={handleCropConfirm}
              >
                Confirm Crop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

