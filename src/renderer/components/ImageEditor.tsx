/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

import React, { useEffect, useState, useRef, CSSProperties } from 'react';
import { ImageEditorService } from '../../core/image/image-editor';
import { getImageDimensions, resizeImage, calculateProportionalDimensions, scaleDimensions, cropImage, setTransparency, supportsTransparency, convertFormat, getExtensionForFormat, getMimeTypeForFormat } from '../../core/image/image-utils';

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
  
  // Save As state
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
  const [saveAsFormat, setSaveAsFormat] = useState<'png' | 'jpg' | 'webp' | 'gif' | 'avif'>('png');
  const [saveAsQuality, setSaveAsQuality] = useState(0.92);
  
  // Undo/Redo state
  const [history, setHistory] = useState<Array<{ imageUrl: string; dimensions: { width: number; height: number }; opacity: number }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
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
              
              // Initialize history with the original image
              setHistory([{ imageUrl: url, dimensions: dims, opacity: 1.0 }]);
              setHistoryIndex(0);
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

  // Helper function to save current state to history
  const saveToHistory = (newImageUrl: string, newDimensions: { width: number; height: number }, newOpacity: number) => {
    setHistory(prevHistory => {
      // Remove any history after current index (when making new change after undo)
      const newHistory = prevHistory.slice(0, historyIndex + 1);
      
      // Add new state
      newHistory.push({
        imageUrl: newImageUrl,
        dimensions: newDimensions,
        opacity: newOpacity,
      });
      
      // Limit history to 50 states to prevent memory issues
      if (newHistory.length > 50) {
        newHistory.shift();
        setHistoryIndex(prevIndex => prevIndex); // Keep index at same relative position
        return newHistory;
      }
      
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
  };

  // Undo function
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      
      setImageUrl(state.imageUrl);
      setDimensions(state.dimensions);
      setOpacity(state.opacity);
      setHistoryIndex(newIndex);
      setIsModified(newIndex > 0); // Modified if not at original state
      
      console.log(`[ImageEditor] Undo to state ${newIndex + 1}/${history.length}`);
    }
  };

  // Redo function
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      
      setImageUrl(state.imageUrl);
      setDimensions(state.dimensions);
      setOpacity(state.opacity);
      setHistoryIndex(newIndex);
      setIsModified(newIndex > 0); // Modified if not at original state
      
      console.log(`[ImageEditor] Redo to state ${newIndex + 1}/${history.length}`);
    }
  };

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z for redo
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]); // Re-attach when history changes

  const handleResizeClick = () => {
    if (dimensions) {
      setResizeWidth(String(dimensions.width));
      setResizeHeight(String(dimensions.height));
      setShowResizeDialog(true);
    }
  };

  const handleQuickScale = async (scale: number) => {
    if (!dimensions || !imageUrl) return;

    try {
      setProcessing(true);
      const newDims = scaleDimensions(dimensions.width, dimensions.height, scale);
      const resized = await resizeImage(imageUrl, newDims.width, newDims.height);
      setImageUrl(resized);
      setDimensions(newDims);
      setIsModified(true);
      
      // Save to history
      saveToHistory(resized, newDims, opacity);
      
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

    if (!imageUrl) return;

    try {
      setProcessing(true);
      setShowResizeDialog(false);

      const resized = await resizeImage(imageUrl, width, height);
      setImageUrl(resized);
      setDimensions({ width, height });
      setIsModified(true);
      
      // Save to history
      saveToHistory(resized, { width, height }, opacity);
      
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

  const handleSaveAs = () => {
    // Open Save As dialog
    setShowSaveAsDialog(true);
    
    // Set default format based on current MIME type
    if (mimeType) {
      const ext = mimeType.replace('image/', '');
      if (ext === 'jpeg') {
        setSaveAsFormat('jpg');
      } else if (['png', 'webp', 'gif', 'avif'].includes(ext)) {
        setSaveAsFormat(ext as 'png' | 'webp' | 'gif' | 'avif');
      } else {
        setSaveAsFormat('png');
      }
    }
  };

  const handleSaveAsConfirm = async () => {
    if (!imageUrl || !window.api?.saveFileAs) {
      console.error('[ImageEditor] Cannot save: missing data or API');
      return;
    }

    try {
      setProcessing(true);
      setShowSaveAsDialog(false);

      // Convert format if needed
      let finalImageUrl = imageUrl;
      const currentFormat = mimeType?.replace('image/', '') || 'png';
      const targetFormat = saveAsFormat === 'jpg' ? 'jpeg' : saveAsFormat;
      
      if (currentFormat !== targetFormat) {
        console.log(`[ImageEditor] Converting from ${currentFormat} to ${targetFormat}`);
        finalImageUrl = await convertFormat(imageUrl, saveAsFormat, saveAsQuality);
      }

      // Convert data URL to base64
      const base64Data = finalImageUrl.replace(/^data:image\/\w+;base64,/, '');
      
      // Show save dialog (user chooses location)
      const result = await window.api.saveFileAs(base64Data);
      
      if (result) {
        console.log('[ImageEditor] Image saved as:', result.path);
        setIsModified(false);
        
        // Remember the chosen format and directory in settings
        try {
          const directory = result.path.substring(0, result.path.lastIndexOf('\\') || result.path.lastIndexOf('/'));
          await window.api.setSetting('imageEditor.lastSaveDirectory', directory);
          await window.api.setSetting('imageEditor.lastSaveFormat', saveAsFormat);
          console.log('[ImageEditor] Saved preferences:', { directory, format: saveAsFormat });
        } catch (err) {
          console.warn('[ImageEditor] Could not save preferences:', err);
        }
      } else {
        console.log('[ImageEditor] Save As canceled');
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
      
      // Reset history to original state
      setHistory([{ imageUrl: originalDataUrl, dimensions: originalDimensions, opacity: 1.0 }]);
      setHistoryIndex(0);
      
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
    if (!imageUrl || !dimensions) return;

    // Validate opacity
    const validOpacity = Math.max(0, Math.min(1, newOpacity));
    setOpacity(validOpacity);

    try {
      setProcessing(true);
      
      // Apply transparency to current image (not original)
      const transparentImage = await setTransparency(imageUrl, validOpacity);
      setImageUrl(transparentImage);
      setIsModified(validOpacity !== 1.0);
      
      // Save to history
      saveToHistory(transparentImage, dimensions, validOpacity);
      
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
      
      // Save to history
      saveToHistory(cropPreviewUrl, dims, opacity);
      
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
          style={historyIndex > 0 ? styles.toolbarButton : styles.toolbarButtonDisabled}
          onClick={handleUndo}
          disabled={historyIndex <= 0 || processing}
          title="Undo (Ctrl+Z)"
        >
          ← Undo
        </button>
        <button
          style={historyIndex < history.length - 1 ? styles.toolbarButton : styles.toolbarButtonDisabled}
          onClick={handleRedo}
          disabled={historyIndex >= history.length - 1 || processing}
          title="Redo (Ctrl+Y)"
        >
          Redo →
        </button>
        
        <div style={styles.toolbarSeparator} />
        
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
          style={dimensions ? styles.toolbarButton : styles.toolbarButtonDisabled}
          onClick={handleSaveAs}
          disabled={!dimensions || processing}
        >
          Save As...
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
      
      {/* Save As Dialog */}
      {showSaveAsDialog && (
        <div style={styles.modal} onClick={() => setShowSaveAsDialog(false)}>
          <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <div style={styles.dialogTitle}>Save As...</div>
            <div style={styles.dialogContent}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Format</label>
                <select
                  style={styles.input}
                  value={saveAsFormat}
                  onChange={(e) => setSaveAsFormat(e.target.value as 'png' | 'jpg' | 'webp' | 'gif' | 'avif')}
                >
                  <option value="png">PNG (Lossless, supports transparency)</option>
                  <option value="jpg">JPG (Lossy, smaller files)</option>
                  <option value="webp">WebP (Modern, efficient)</option>
                  <option value="gif">GIF (Animated, legacy)</option>
                  <option value="avif">AVIF (Next-gen, high compression)</option>
                </select>
              </div>
              
              {(saveAsFormat === 'jpg' || saveAsFormat === 'webp') && (
                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    Quality: {Math.round(saveAsQuality * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(saveAsQuality * 100)}
                    onChange={(e) => setSaveAsQuality(parseInt(e.target.value) / 100)}
                    style={{
                      width: '100%',
                      cursor: 'pointer',
                    }}
                  />
                  <div style={{
                    fontSize: '12px',
                    color: '#999',
                    marginTop: '4px',
                  }}>
                    Higher quality = larger file size
                  </div>
                </div>
              )}
              
              {saveAsFormat === 'jpg' && supportsTransparency(mimeType) && opacity < 1.0 && (
                <div style={{
                  fontSize: '12px',
                  color: '#f48771',
                  marginTop: '8px',
                  padding: '8px',
                  background: 'rgba(244, 135, 113, 0.1)',
                  borderRadius: '2px',
                }}>
                  ⚠️ Warning: JPEG does not support transparency. Transparent areas will be filled with white.
                </div>
              )}
            </div>
            <div style={styles.dialogActions}>
              <button
                style={styles.toolbarButton}
                onClick={() => setShowSaveAsDialog(false)}
              >
                Cancel
              </button>
              <button
                style={styles.toolbarButton}
                onClick={handleSaveAsConfirm}
              >
                Save As...
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

