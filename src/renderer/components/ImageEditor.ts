/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * ImageEditor - Image editing UI (vanilla TS)
 */

import { Component } from '../core/component.js';
import { el, clearChildren, setStyles } from '../core/dom.js';
import { ImageEditorService } from '../../core/image/image-editor.js';
import {
  getImageDimensions, resizeImage, calculateProportionalDimensions,
  scaleDimensions, cropImage, setTransparency, supportsTransparency,
  convertFormat,
} from '../../core/image/image-utils.js';

interface HistoryEntry {
  imageUrl: string;
  dimensions: { width: number; height: number };
  opacity: number;
}

export class ImageEditor extends Component {
  private filePath: string;
  private imageUrl: string | null = null;
  private originalDataUrl: string | null = null;
  private dims: { width: number; height: number } | null = null;
  private originalDims: { width: number; height: number } | null = null;
  private mimeType: string | null = null;
  private isModified = false;
  private processing = false;
  private loading = true;
  private errorMsg: string | null = null;

  // Crop state
  private cropMode = false;
  private cropRegion: { x: number; y: number; width: number; height: number } | null = null;
  private cropDragging = false;
  private cropDragStart: { x: number; y: number } | null = null;
  private cropPreviewUrl: string | null = null;

  // Transparency state
  private opacity = 1.0;
  private showTransparencyControls = false;
  private showCheckerboard = false;

  // Resize dialog state
  private resizeWidth = '';
  private resizeHeight = '';
  private maintainAspectRatio = true;

  // Save As state
  private saveAsFormat: 'png' | 'jpg' | 'webp' | 'gif' | 'avif' = 'png';
  private saveAsQuality = 0.92;

  // Undo/Redo
  private history: HistoryEntry[] = [];
  private historyIndex = -1;

  // DOM refs
  private toolbarEl: HTMLElement;
  private viewportEl: HTMLElement;
  private imageContainerEl: HTMLElement;
  private imgEl: HTMLImageElement;
  private cropOverlayEl: HTMLElement | null = null;
  private cropHintEl: HTMLElement | null = null;
  private processingEl: HTMLElement;
  private infoBarEl: HTMLElement;
  private modalEl: HTMLElement | null = null;

  constructor(filePath: string) {
    super('div');
    this.filePath = filePath;

    setStyles(this.el, {
      display: 'flex', flexDirection: 'column',
      width: '100%', height: '100%',
      background: '#1e1e1e', overflow: 'hidden',
    });

    // Toolbar
    this.toolbarEl = el('div');
    setStyles(this.toolbarEl, {
      display: 'flex', gap: '8px', padding: '8px 12px',
      background: '#2d2d30', borderBottom: '1px solid #3e3e42',
      alignItems: 'center', flexWrap: 'wrap',
    });

    // Viewport
    this.viewportEl = el('div');
    setStyles(this.viewportEl, {
      flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'auto', background: '#1e1e1e', padding: '20px', position: 'relative',
    });

    // Image container
    this.imageContainerEl = el('div');
    setStyles(this.imageContainerEl, { position: 'relative', display: 'inline-block' });

    // Image element
    this.imgEl = document.createElement('img');
    setStyles(this.imgEl, {
      maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    });

    this.imageContainerEl.appendChild(this.imgEl);
    this.viewportEl.appendChild(this.imageContainerEl);

    // Processing overlay
    this.processingEl = el('div', {}, 'Processing...');
    setStyles(this.processingEl, {
      position: 'absolute', color: '#cccccc', padding: '20px',
      textAlign: 'center', fontFamily: "'Consolas', 'Courier New', monospace",
      opacity: '0.6', display: 'none',
    });
    this.viewportEl.appendChild(this.processingEl);

    // Info bar
    this.infoBarEl = el('div');
    setStyles(this.infoBarEl, {
      padding: '8px 12px', background: '#252526', borderTop: '1px solid #3e3e42',
      fontFamily: "'Consolas', 'Courier New', monospace", fontSize: '12px',
      color: '#cccccc', display: 'flex', gap: '20px',
    });

    this.el.appendChild(this.toolbarEl);
    this.el.appendChild(this.viewportEl);
    this.el.appendChild(this.infoBarEl);

    // Mouse events for crop
    this.imageContainerEl.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.imageContainerEl.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.imageContainerEl.addEventListener('mouseup', () => this.handleMouseUp());
    this.imageContainerEl.addEventListener('mouseleave', () => this.handleMouseUp());
  }

  protected onMount(): void {
    this.loadImage();

    // Keyboard shortcuts
    const keyHandler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault(); this.handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault(); this.handleRedo();
      }
    };
    window.addEventListener('keydown', keyHandler);
    this.addCleanup(() => window.removeEventListener('keydown', keyHandler));
  }

  // --- Public API ---

  get isDirty(): boolean { return this.isModified; }

  // --- Image Loading ---

  private async loadImage(): Promise<void> {
    try {
      this.loading = true;
      this.errorMsg = null;
      this.showLoading();

      this.mimeType = ImageEditorService.getMimeType(this.filePath);
      const url = await ImageEditorService.openImage(this.filePath);
      this.imageUrl = url;
      this.originalDataUrl = url;

      try {
        const dims = await getImageDimensions(url);
        this.dims = dims;
        this.originalDims = { ...dims };
        this.resizeWidth = String(dims.width);
        this.resizeHeight = String(dims.height);
        this.history = [{ imageUrl: url, dimensions: dims, opacity: 1.0 }];
        this.historyIndex = 0;
      } catch (dimErr) {
        console.warn('[ImageEditor] Could not get dimensions:', dimErr);
      }

      this.loading = false;
      this.render();
    } catch (err) {
      this.loading = false;
      this.errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[ImageEditor] Failed to load image:', this.errorMsg);
      this.render();
    }
  }

  // --- Render ---

  private render(): void {
    if (this.loading) { this.showLoading(); return; }
    if (this.errorMsg) { this.showError(); return; }

    this.imgEl.src = this.imageUrl || '';
    this.imgEl.alt = this.filePath;
    this.imgEl.style.cursor = this.cropMode ? 'crosshair' : 'default';
    this.imgEl.style.display = this.imageUrl ? '' : 'none';

    // Viewport background
    this.viewportEl.style.background = this.showCheckerboard
      ? 'repeating-conic-gradient(#808080 0% 25%, #404040 0% 50%) 50% / 20px 20px'
      : '#1e1e1e';

    this.processingEl.style.display = this.processing ? '' : 'none';

    this.renderToolbar();
    this.renderInfoBar();
    this.renderCropOverlay();
    this.renderCropHint();
  }

  private showLoading(): void {
    clearChildren(this.viewportEl);
    const msg = el('div', {}, 'Loading image...');
    setStyles(msg, {
      color: '#cccccc', padding: '20px', textAlign: 'center',
      fontFamily: "'Consolas', 'Courier New', monospace", opacity: '0.6',
    });
    this.viewportEl.appendChild(msg);
  }

  private showError(): void {
    clearChildren(this.viewportEl);
    const msg = el('div', {}, `Error loading image: ${this.errorMsg}`);
    setStyles(msg, {
      color: '#f48771', padding: '20px', textAlign: 'center',
      fontFamily: "'Consolas', 'Courier New', monospace",
    });
    this.viewportEl.appendChild(msg);
  }

  // --- Toolbar ---

  private renderToolbar(): void {
    clearChildren(this.toolbarEl);

    const canEdit = !!this.dims && !this.processing;
    const canEditNoCrop = canEdit && !this.cropMode;

    // Undo / Redo
    this.toolbarEl.appendChild(this.makeBtn('\u2190 Undo', () => this.handleUndo(), this.historyIndex > 0 && !this.processing, 'Undo (Ctrl+Z)'));
    this.toolbarEl.appendChild(this.makeBtn('Redo \u2192', () => this.handleRedo(), this.historyIndex < this.history.length - 1 && !this.processing, 'Redo (Ctrl+Y)'));
    this.toolbarEl.appendChild(this.makeSep());

    // Resize / Crop
    this.toolbarEl.appendChild(this.makeBtn('Resize...', () => this.showResizeDialog(), canEditNoCrop));
    this.toolbarEl.appendChild(this.makeBtn('Crop', () => this.handleCropClick(), canEditNoCrop));

    if (this.cropMode) {
      const validCrop = this.cropRegion && this.cropRegion.width > 0 && this.cropRegion.height > 0;
      this.toolbarEl.appendChild(this.makeBtn('Apply Crop', () => this.handleCropApply(), !!validCrop && !this.processing));
      this.toolbarEl.appendChild(this.makeBtn('Cancel', () => this.handleCropCancel(), true));
    }

    this.toolbarEl.appendChild(this.makeSep());

    // Transparency
    const canTransparency = supportsTransparency(this.mimeType) && canEditNoCrop;
    const transpLabel = this.showTransparencyControls ? 'Hide Transparency' : 'Show Transparency';
    const transpTitle = supportsTransparency(this.mimeType)
      ? 'Toggle transparency controls'
      : 'Transparency not supported for this format';
    this.toolbarEl.appendChild(this.makeBtn(transpLabel, () => this.handleToggleTransparency(), canTransparency, transpTitle));

    if (this.showTransparencyControls) {
      // Opacity slider
      const opacityLabel = el('label');
      setStyles(opacityLabel, {
        display: 'flex', alignItems: 'center', gap: '8px',
        fontSize: '13px', color: '#cccccc', fontFamily: "'Segoe UI', sans-serif",
      });
      opacityLabel.textContent = 'Opacity:';

      const slider = document.createElement('input');
      slider.type = 'range'; slider.min = '0'; slider.max = '100';
      slider.value = String(Math.round(this.opacity * 100));
      slider.disabled = this.processing;
      setStyles(slider, { width: '120px', cursor: this.processing ? 'not-allowed' : 'pointer' });
      slider.addEventListener('change', () => this.handleOpacityChange(parseInt(slider.value) / 100));

      const pctSpan = el('span', {}, `${Math.round(this.opacity * 100)}%`);
      setStyles(pctSpan, { minWidth: '45px', textAlign: 'right' });

      opacityLabel.appendChild(slider);
      opacityLabel.appendChild(pctSpan);
      this.toolbarEl.appendChild(opacityLabel);

      // Checkerboard toggle
      const cbLabel = el('label');
      setStyles(cbLabel, {
        display: 'flex', alignItems: 'center', fontSize: '13px',
        color: '#cccccc', fontFamily: "'Segoe UI', sans-serif", cursor: 'pointer',
      });
      const cbCheck = document.createElement('input');
      cbCheck.type = 'checkbox';
      cbCheck.checked = this.showCheckerboard;
      setStyles(cbCheck, { marginRight: '8px' });
      cbCheck.addEventListener('change', () => { this.showCheckerboard = cbCheck.checked; this.render(); });
      cbLabel.appendChild(cbCheck);
      cbLabel.appendChild(document.createTextNode('Show checkerboard'));
      this.toolbarEl.appendChild(cbLabel);
    }

    this.toolbarEl.appendChild(this.makeSep());

    // Quick scale
    for (const [label, scale] of [['50%', 0.5], ['75%', 0.75], ['150%', 1.5], ['200%', 2.0]] as [string, number][]) {
      this.toolbarEl.appendChild(this.makeBtn(label, () => this.handleQuickScale(scale), canEditNoCrop));
    }

    this.toolbarEl.appendChild(this.makeSep());

    // Save / Save As / Reset
    this.toolbarEl.appendChild(this.makeBtn('Save', () => this.handleSave(), this.isModified && !this.processing));
    this.toolbarEl.appendChild(this.makeBtn('Save As...', () => this.showSaveAsDialog(), canEditNoCrop));
    this.toolbarEl.appendChild(this.makeBtn('Reset', () => this.handleReset(), this.isModified && !this.processing));
  }

  private makeBtn(text: string, handler: () => void, enabled: boolean, title?: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.disabled = !enabled;
    if (title) btn.title = title;
    const s = enabled
      ? { padding: '6px 12px', background: '#0e639c', color: '#ffffff', border: 'none', borderRadius: '2px', cursor: 'pointer', fontSize: '13px', fontFamily: "'Segoe UI', sans-serif" }
      : { padding: '6px 12px', background: '#3e3e42', color: '#858585', border: 'none', borderRadius: '2px', cursor: 'not-allowed', fontSize: '13px', fontFamily: "'Segoe UI', sans-serif" };
    setStyles(btn, s);
    if (enabled) btn.addEventListener('click', handler);
    return btn;
  }

  private makeSep(): HTMLElement {
    const sep = el('div');
    setStyles(sep, { width: '1px', height: '20px', background: '#3e3e42' });
    return sep;
  }

  // --- Info Bar ---

  private renderInfoBar(): void {
    clearChildren(this.infoBarEl);
    const fileName = this.filePath.split(/[/\\]/).pop() || '';
    const nameSpan = el('span', {}, fileName + (this.isModified ? ' (modified)' : ''));
    setStyles(nameSpan, { opacity: '0.8' });
    this.infoBarEl.appendChild(nameSpan);

    if (this.dims) {
      const dimSpan = el('span', {}, `${this.dims.width} \u00d7 ${this.dims.height} px`);
      setStyles(dimSpan, { opacity: '0.8' });
      this.infoBarEl.appendChild(dimSpan);
    }

    if (this.mimeType) {
      const mimeSpan = el('span', {}, this.mimeType);
      setStyles(mimeSpan, { opacity: '0.8' });
      this.infoBarEl.appendChild(mimeSpan);
    }
  }

  // --- Crop Overlay ---

  private renderCropOverlay(): void {
    if (this.cropOverlayEl) { this.cropOverlayEl.remove(); this.cropOverlayEl = null; }

    if (this.cropMode && this.cropRegion && this.cropRegion.width > 0 && this.cropRegion.height > 0) {
      this.cropOverlayEl = el('div');
      setStyles(this.cropOverlayEl, {
        position: 'absolute',
        border: '2px solid #007acc',
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
        cursor: 'move',
        pointerEvents: 'auto',
        left: `${this.cropRegion.x}px`,
        top: `${this.cropRegion.y}px`,
        width: `${this.cropRegion.width}px`,
        height: `${this.cropRegion.height}px`,
      });

      const info = el('div', {}, `${this.cropRegion.width} \u00d7 ${this.cropRegion.height} px`);
      setStyles(info, {
        position: 'absolute', top: '-25px', left: '0',
        background: 'rgba(0, 0, 0, 0.7)', color: '#ffffff',
        padding: '4px 8px', fontSize: '12px', borderRadius: '2px', whiteSpace: 'nowrap',
      });
      this.cropOverlayEl.appendChild(info);
      this.imageContainerEl.appendChild(this.cropOverlayEl);
    }
  }

  private renderCropHint(): void {
    if (this.cropHintEl) { this.cropHintEl.remove(); this.cropHintEl = null; }

    if (this.cropMode) {
      this.cropHintEl = el('div', {}, 'Click and drag to select crop region');
      setStyles(this.cropHintEl, {
        position: 'absolute', bottom: '20px', left: '50%',
        transform: 'translateX(-50%)', background: 'rgba(0, 0, 0, 0.8)',
        color: '#ffffff', padding: '8px 16px', borderRadius: '4px', fontSize: '13px',
      });
      this.viewportEl.appendChild(this.cropHintEl);
    }
  }

  // --- History ---

  private saveToHistory(newImageUrl: string, newDims: { width: number; height: number }, newOpacity: number): void {
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push({ imageUrl: newImageUrl, dimensions: newDims, opacity: newOpacity });
    if (this.history.length > 50) this.history.shift();
    this.historyIndex = this.history.length - 1;
  }

  private handleUndo(): void {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    const state = this.history[this.historyIndex];
    this.imageUrl = state.imageUrl;
    this.dims = state.dimensions;
    this.opacity = state.opacity;
    this.isModified = this.historyIndex > 0;
    this.render();
  }

  private handleRedo(): void {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    const state = this.history[this.historyIndex];
    this.imageUrl = state.imageUrl;
    this.dims = state.dimensions;
    this.opacity = state.opacity;
    this.isModified = this.historyIndex > 0;
    this.render();
  }

  // --- Resize ---

  private showResizeDialog(): void {
    if (!this.dims) return;
    this.resizeWidth = String(this.dims.width);
    this.resizeHeight = String(this.dims.height);
    this.maintainAspectRatio = true;
    this.showModal('Resize Image', (content, actions) => {
      // Width
      const wGroup = this.makeInputGroup('Width (pixels)');
      const wInput = document.createElement('input');
      wInput.type = 'number'; wInput.min = '1'; wInput.value = this.resizeWidth;
      this.styleInput(wInput);
      wInput.addEventListener('input', () => {
        this.resizeWidth = wInput.value;
        if (this.maintainAspectRatio && this.originalDims) {
          const w = parseInt(wInput.value);
          if (!isNaN(w)) {
            const calc = calculateProportionalDimensions(this.originalDims.width, this.originalDims.height, w, null);
            this.resizeHeight = String(calc.height);
            hInput.value = this.resizeHeight;
          }
        }
      });
      wGroup.appendChild(wInput);
      content.appendChild(wGroup);

      // Height
      const hGroup = this.makeInputGroup('Height (pixels)');
      const hInput = document.createElement('input');
      hInput.type = 'number'; hInput.min = '1'; hInput.value = this.resizeHeight;
      this.styleInput(hInput);
      hInput.addEventListener('input', () => {
        this.resizeHeight = hInput.value;
        if (this.maintainAspectRatio && this.originalDims) {
          const h = parseInt(hInput.value);
          if (!isNaN(h)) {
            const calc = calculateProportionalDimensions(this.originalDims.width, this.originalDims.height, null, h);
            this.resizeWidth = String(calc.width);
            wInput.value = this.resizeWidth;
          }
        }
      });
      hGroup.appendChild(hInput);
      content.appendChild(hGroup);

      // Aspect ratio checkbox
      const arLabel = el('label');
      setStyles(arLabel, {
        display: 'flex', alignItems: 'center', fontSize: '13px',
        color: '#cccccc', fontFamily: "'Segoe UI', sans-serif", cursor: 'pointer',
      });
      const arCheck = document.createElement('input');
      arCheck.type = 'checkbox'; arCheck.checked = this.maintainAspectRatio;
      setStyles(arCheck, { marginRight: '8px' });
      arCheck.addEventListener('change', () => { this.maintainAspectRatio = arCheck.checked; });
      arLabel.appendChild(arCheck);
      arLabel.appendChild(document.createTextNode('Maintain aspect ratio'));
      content.appendChild(arLabel);

      // Actions
      actions.appendChild(this.makeBtn('Cancel', () => this.hideModal(), true));
      actions.appendChild(this.makeBtn('Apply', () => this.handleResizeApply(), true));
    });
  }

  private async handleResizeApply(): Promise<void> {
    const w = parseInt(this.resizeWidth);
    const h = parseInt(this.resizeHeight);
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return;
    if (!this.imageUrl) return;

    this.hideModal();
    try {
      this.processing = true; this.render();
      const resized = await resizeImage(this.imageUrl, w, h);
      this.imageUrl = resized;
      this.dims = { width: w, height: h };
      this.isModified = true;
      this.saveToHistory(resized, { width: w, height: h }, this.opacity);
    } catch (err) {
      console.error('[ImageEditor] Failed to resize:', err);
      this.errorMsg = err instanceof Error ? err.message : String(err);
    } finally {
      this.processing = false; this.render();
    }
  }

  private async handleQuickScale(scale: number): Promise<void> {
    if (!this.dims || !this.imageUrl) return;
    try {
      this.processing = true; this.render();
      const newDims = scaleDimensions(this.dims.width, this.dims.height, scale);
      const resized = await resizeImage(this.imageUrl, newDims.width, newDims.height);
      this.imageUrl = resized;
      this.dims = newDims;
      this.isModified = true;
      this.saveToHistory(resized, newDims, this.opacity);
    } catch (err) {
      console.error('[ImageEditor] Failed to scale:', err);
      this.errorMsg = err instanceof Error ? err.message : String(err);
    } finally {
      this.processing = false; this.render();
    }
  }

  // --- Crop ---

  private handleCropClick(): void {
    if (!this.dims) return;
    this.cropMode = true;
    const w = Math.floor(this.dims.width * 0.5);
    const h = Math.floor(this.dims.height * 0.5);
    const x = Math.floor((this.dims.width - w) / 2);
    const y = Math.floor((this.dims.height - h) / 2);
    this.cropRegion = { x, y, width: w, height: h };
    this.render();
  }

  private handleCropCancel(): void {
    this.cropMode = false;
    this.cropRegion = null;
    this.render();
  }

  private async handleCropApply(): Promise<void> {
    if (!this.cropRegion || !this.originalDataUrl) return;
    try {
      this.processing = true; this.render();
      const cropped = await cropImage(this.originalDataUrl, this.cropRegion.x, this.cropRegion.y, this.cropRegion.width, this.cropRegion.height);
      this.cropPreviewUrl = cropped;
      this.showCropPreviewDialog();
    } catch (err) {
      console.error('[ImageEditor] Failed to crop:', err);
      this.errorMsg = err instanceof Error ? err.message : String(err);
    } finally {
      this.processing = false; this.render();
    }
  }

  private showCropPreviewDialog(): void {
    if (!this.cropPreviewUrl) return;
    this.showModal('Crop Preview', (content, actions) => {
      setStyles(content, { alignItems: 'center' });
      const preview = document.createElement('img');
      preview.src = this.cropPreviewUrl!;
      preview.alt = 'Crop preview';
      setStyles(preview, {
        maxWidth: '450px', maxHeight: '450px', objectFit: 'contain', border: '1px solid #3e3e42',
      });
      content.appendChild(preview);

      const note = el('div', {}, 'Preview of cropped image');
      setStyles(note, { fontSize: '13px', color: '#cccccc', marginTop: '12px' });
      content.appendChild(note);

      actions.appendChild(this.makeBtn('Cancel', () => this.hideModal(), true));
      actions.appendChild(this.makeBtn('Confirm Crop', () => this.handleCropConfirm(), true));
    }, '500px');
  }

  private async handleCropConfirm(): Promise<void> {
    if (!this.cropPreviewUrl) return;
    this.hideModal();
    try {
      this.imageUrl = this.cropPreviewUrl;
      const dims = await getImageDimensions(this.cropPreviewUrl);
      this.dims = dims;
      this.isModified = true;
      this.cropMode = false;
      this.cropRegion = null;
      this.saveToHistory(this.cropPreviewUrl, dims, this.opacity);
    } catch (err) {
      console.error('[ImageEditor] Failed to apply crop:', err);
      this.errorMsg = err instanceof Error ? err.message : String(err);
    }
    this.render();
  }

  // --- Crop Mouse Handlers ---

  private handleMouseDown(e: MouseEvent): void {
    if (!this.cropMode) return;
    const rect = this.imgEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.cropDragging = true;
    this.cropDragStart = { x, y };
    this.cropRegion = { x: Math.round(x), y: Math.round(y), width: 0, height: 0 };
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.cropDragging || !this.cropDragStart) return;
    const rect = this.imgEl.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    this.cropRegion = {
      x: Math.round(Math.min(this.cropDragStart.x, cx)),
      y: Math.round(Math.min(this.cropDragStart.y, cy)),
      width: Math.round(Math.abs(cx - this.cropDragStart.x)),
      height: Math.round(Math.abs(cy - this.cropDragStart.y)),
    };
    this.renderCropOverlay();
  }

  private handleMouseUp(): void {
    if (this.cropDragging) {
      this.cropDragging = false;
      this.cropDragStart = null;
      this.renderToolbar(); // Update Apply Crop button state
    }
  }

  // --- Transparency ---

  private handleToggleTransparency(): void {
    this.showTransparencyControls = !this.showTransparencyControls;
    this.showCheckerboard = this.showTransparencyControls;
    this.render();
  }

  private async handleOpacityChange(newOpacity: number): Promise<void> {
    if (!this.imageUrl || !this.dims) return;
    const valid = Math.max(0, Math.min(1, newOpacity));
    this.opacity = valid;
    try {
      this.processing = true; this.render();
      const transparentImage = await setTransparency(this.imageUrl, valid);
      this.imageUrl = transparentImage;
      this.isModified = valid !== 1.0;
      this.saveToHistory(transparentImage, this.dims, valid);
    } catch (err) {
      console.error('[ImageEditor] Failed to adjust transparency:', err);
      this.errorMsg = err instanceof Error ? err.message : String(err);
    } finally {
      this.processing = false; this.render();
    }
  }

  // --- Save ---

  private async handleSave(): Promise<void> {
    if (!this.imageUrl || !window.api?.saveFile) return;
    try {
      this.processing = true; this.render();
      const base64Data = this.imageUrl.replace(/^data:image\/\w+;base64,/, '');
      const result = await window.api.saveFile(this.filePath, base64Data);
      if (result.success) {
        this.isModified = false;
      }
    } catch (err) {
      console.error('[ImageEditor] Failed to save:', err);
    } finally {
      this.processing = false; this.render();
    }
  }

  private showSaveAsDialog(): void {
    if (this.mimeType) {
      const ext = this.mimeType.replace('image/', '');
      if (ext === 'jpeg') this.saveAsFormat = 'jpg';
      else if (['png', 'webp', 'gif', 'avif'].includes(ext)) this.saveAsFormat = ext as any;
      else this.saveAsFormat = 'png';
    }

    this.showModal('Save As...', (content, actions) => {
      // Format select
      const fmtGroup = this.makeInputGroup('Format');
      const select = document.createElement('select');
      this.styleInput(select);
      for (const [val, label] of [
        ['png', 'PNG (Lossless, supports transparency)'],
        ['jpg', 'JPG (Lossy, smaller files)'],
        ['webp', 'WebP (Modern, efficient)'],
        ['gif', 'GIF (Animated, legacy)'],
        ['avif', 'AVIF (Next-gen, high compression)'],
      ] as [string, string][]) {
        const opt = document.createElement('option');
        opt.value = val; opt.textContent = label;
        select.appendChild(opt);
      }
      select.value = this.saveAsFormat;

      // Quality slider container (shown/hidden based on format)
      const qualGroup = this.makeInputGroup(`Quality: ${Math.round(this.saveAsQuality * 100)}%`);
      const qualSlider = document.createElement('input');
      qualSlider.type = 'range'; qualSlider.min = '0'; qualSlider.max = '100';
      qualSlider.value = String(Math.round(this.saveAsQuality * 100));
      setStyles(qualSlider, { width: '100%', cursor: 'pointer' });
      qualSlider.addEventListener('input', () => {
        this.saveAsQuality = parseInt(qualSlider.value) / 100;
        qualLabel.textContent = `Quality: ${Math.round(this.saveAsQuality * 100)}%`;
      });
      const qualLabel = qualGroup.querySelector('label')!;
      const qualNote = el('div', {}, 'Higher quality = larger file size');
      setStyles(qualNote, { fontSize: '12px', color: '#999', marginTop: '4px' });
      qualGroup.appendChild(qualSlider);
      qualGroup.appendChild(qualNote);

      // Warning for JPEG transparency
      const warnEl = el('div');
      setStyles(warnEl, {
        fontSize: '12px', color: '#f48771', marginTop: '8px', padding: '8px',
        background: 'rgba(244, 135, 113, 0.1)', borderRadius: '2px', display: 'none',
      });
      warnEl.textContent = '\u26a0\ufe0f Warning: JPEG does not support transparency. Transparent areas will be filled with white.';

      const updateVisibility = () => {
        const fmt = select.value;
        qualGroup.style.display = (fmt === 'jpg' || fmt === 'webp') ? '' : 'none';
        warnEl.style.display = (fmt === 'jpg' && supportsTransparency(this.mimeType) && this.opacity < 1.0) ? '' : 'none';
      };

      select.addEventListener('change', () => {
        this.saveAsFormat = select.value as any;
        updateVisibility();
      });

      fmtGroup.appendChild(select);
      content.appendChild(fmtGroup);
      content.appendChild(qualGroup);
      content.appendChild(warnEl);
      updateVisibility();

      actions.appendChild(this.makeBtn('Cancel', () => this.hideModal(), true));
      actions.appendChild(this.makeBtn('Save As...', () => this.handleSaveAsConfirm(), true));
    });
  }

  private async handleSaveAsConfirm(): Promise<void> {
    if (!this.imageUrl || !window.api?.saveFileAs) return;
    this.hideModal();
    try {
      this.processing = true; this.render();

      let finalUrl = this.imageUrl;
      const currentFmt = this.mimeType?.replace('image/', '') || 'png';
      const targetFmt = this.saveAsFormat === 'jpg' ? 'jpeg' : this.saveAsFormat;
      if (currentFmt !== targetFmt) {
        finalUrl = await convertFormat(this.imageUrl, this.saveAsFormat, this.saveAsQuality);
      }

      const base64Data = finalUrl.replace(/^data:image\/\w+;base64,/, '');
      const result = await window.api.saveFileAs(base64Data);
      if (result) {
        this.isModified = false;
        try {
          const dir = result.path.substring(0, result.path.lastIndexOf('\\') || result.path.lastIndexOf('/'));
          await window.api.setSetting('imageEditor.lastSaveDirectory', dir);
          await window.api.setSetting('imageEditor.lastSaveFormat', this.saveAsFormat);
        } catch (_) { /* ignore */ }
      }
    } catch (err) {
      console.error('[ImageEditor] Failed to save:', err);
    } finally {
      this.processing = false; this.render();
    }
  }

  // --- Reset ---

  private handleReset(): void {
    if (!this.originalDataUrl || !this.originalDims) return;
    this.imageUrl = this.originalDataUrl;
    this.dims = { ...this.originalDims };
    this.isModified = false;
    this.cropMode = false;
    this.cropRegion = null;
    this.opacity = 1.0;
    this.showTransparencyControls = false;
    this.showCheckerboard = false;
    this.history = [{ imageUrl: this.originalDataUrl, dimensions: { ...this.originalDims }, opacity: 1.0 }];
    this.historyIndex = 0;
    this.render();
  }

  // --- Modal Helpers ---

  private showModal(title: string, build: (content: HTMLElement, actions: HTMLElement) => void, minWidth = '400px'): void {
    this.hideModal();

    const overlay = el('div');
    setStyles(overlay, {
      position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
      background: 'rgba(0, 0, 0, 0.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: '1000',
    });
    overlay.addEventListener('click', () => this.hideModal());

    const dialog = el('div');
    setStyles(dialog, {
      background: '#252526', border: '1px solid #3e3e42', borderRadius: '4px',
      padding: '20px', minWidth,
    });
    dialog.addEventListener('click', (e) => e.stopPropagation());

    const titleEl = el('div', {}, title);
    setStyles(titleEl, {
      fontSize: '16px', fontWeight: '600', color: '#cccccc',
      marginBottom: '16px', fontFamily: "'Segoe UI', sans-serif",
    });

    const content = el('div');
    setStyles(content, { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' });

    const actions = el('div');
    setStyles(actions, { display: 'flex', gap: '8px', justifyContent: 'flex-end' });

    build(content, actions);

    dialog.appendChild(titleEl);
    dialog.appendChild(content);
    dialog.appendChild(actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    this.modalEl = overlay;
  }

  private hideModal(): void {
    if (this.modalEl) { this.modalEl.remove(); this.modalEl = null; }
  }

  private makeInputGroup(labelText: string): HTMLElement {
    const group = el('div');
    setStyles(group, { display: 'flex', flexDirection: 'column', gap: '4px' });
    const label = el('label', {}, labelText);
    setStyles(label, { fontSize: '13px', color: '#cccccc', fontFamily: "'Segoe UI', sans-serif" });
    group.appendChild(label);
    return group;
  }

  private styleInput(input: HTMLElement): void {
    setStyles(input, {
      background: '#3c3c3c', border: '1px solid #3e3e42', color: '#cccccc',
      padding: '6px 8px', fontSize: '13px', fontFamily: "'Segoe UI', sans-serif", borderRadius: '2px',
    });
  }

  // --- Cleanup ---

  protected onDestroy(): void {
    this.hideModal();
  }
}
