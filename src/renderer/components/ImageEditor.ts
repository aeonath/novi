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
  cropImage, setTransparency, supportsTransparency,
  convertFormat, computeCropHandleDrag, clampZoom,
} from '../../core/image/image-utils.js';
import type { CropHandleMode, CropRegion } from '../../core/image/image-utils.js';

interface HistoryEntry {
  imageUrl: string;
  dimensions: { width: number; height: number };
  opacity: number;
}

interface CropInteraction {
  mode: CropHandleMode;
  startClientX: number;
  startClientY: number;
  startRegion: CropRegion;
}

// Corner handles: small visible squares, exact grab points for diagonal resize.
const CROP_CORNER_HANDLES: { mode: CropHandleMode; cursor: string; top: string; left: string }[] = [
  { mode: 'nw', cursor: 'nwse-resize', top: '0%', left: '0%' },
  { mode: 'ne', cursor: 'nesw-resize', top: '0%', left: '100%' },
  { mode: 'sw', cursor: 'nesw-resize', top: '100%', left: '0%' },
  { mode: 'se', cursor: 'nwse-resize', top: '100%', left: '100%' },
];

// Edge handles: the grabbable area spans the *entire* edge (like an OS window
// border), not just a small dot at the midpoint — a small square at the
// midpoint is easy to miss, and any miss on the plain border fell through to
// the "move" drag instead of resizing, which made resizing feel broken.
const CROP_EDGE_HANDLES: { mode: CropHandleMode; cursor: string; style: Partial<CSSStyleDeclaration> }[] = [
  { mode: 'n', cursor: 'ns-resize', style: { top: '-5px', left: '0', right: '0', height: '10px' } },
  { mode: 's', cursor: 'ns-resize', style: { bottom: '-5px', left: '0', right: '0', height: '10px' } },
  { mode: 'w', cursor: 'ew-resize', style: { left: '-5px', top: '0', bottom: '0', width: '10px' } },
  { mode: 'e', cursor: 'ew-resize', style: { right: '-5px', top: '0', bottom: '0', width: '10px' } },
];

const CROP_MIN_SIZE = 1;

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

  // Crop state — handles are always shown around the current image bounds
  // (mspaint canvas-resize style), not gated behind a separate "Crop" mode.
  // cropRegion always mirrors the full current image except mid-drag.
  private cropRegion: CropRegion | null = null;
  private cropInteraction: CropInteraction | null = null;

  // View zoom (display-only, does not touch the underlying image data)
  private viewZoom = 1.0;
  // True until the user manually changes zoom (+/-/typing a %); while true,
  // the viewport is kept auto-fitted to the window so scrollbars don't
  // appear until the user actually zooms in past the fitted size.
  private autoFit = true;
  private static readonly ZOOM_MIN = 0.1;
  private static readonly ZOOM_MAX = 4.0;
  private static readonly ZOOM_STEP = 0.25;
  private static readonly VIEWPORT_PADDING = 20; // must match viewportEl's CSS padding

  // Pan state (left-click-drag scrolls the viewport when zoomed in)
  private panDrag: { startClientX: number; startClientY: number; startScrollLeft: number; startScrollTop: number } | null = null;

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
    this.viewportEl.classList.add('image-viewport-scroll');
    setStyles(this.viewportEl, {
      flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'auto', background: '#1e1e1e', padding: '20px', position: 'relative',
    });

    // Image container
    this.imageContainerEl = el('div');
    setStyles(this.imageContainerEl, { position: 'relative', display: 'inline-block' });

    // Image element
    this.imgEl = document.createElement('img');
    this.imgEl.draggable = false;
    setStyles(this.imgEl, {
      display: 'block',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    });

    this.imageContainerEl.appendChild(this.imgEl);
    this.viewportEl.appendChild(this.imageContainerEl);

    // Left-click-drag pans the viewport (only takes effect where the crop
    // overlay/handles don't already stopPropagation for their own drag).
    this.imageContainerEl.addEventListener('mousedown', (e) => this.startPanDrag(e));

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

    // Crop handle dragging and image panning are both tracked at the window
    // level so a fast drag that leaves the small handle/image elements
    // doesn't drop the interaction.
    const moveHandler = (e: MouseEvent) => {
      this.handleCropInteractionMove(e);
      this.handlePanDragMove(e);
    };
    const upHandler = () => {
      this.handleCropInteractionUp();
      this.handlePanDragUp();
    };
    window.addEventListener('mousemove', moveHandler);
    window.addEventListener('mouseup', upHandler);
    this.addCleanup(() => window.removeEventListener('mousemove', moveHandler));
    this.addCleanup(() => window.removeEventListener('mouseup', upHandler));

    // Re-fit the image to the window on resize (sidebar toggle, window
    // resize, or the tab becoming visible after being hidden) as long as
    // the user hasn't manually zoomed. Guarded for test environments
    // (jsdom) where ResizeObserver doesn't exist.
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => this.applyAutoFit());
      ro.observe(this.viewportEl);
      this.addCleanup(() => ro.disconnect());
    }
  }

  // --- Public API ---

  get isDirty(): boolean { return this.isModified; }

  // --- Image Loading ---

  private async loadImage(): Promise<void> {
    try {
      this.loading = true;
      this.errorMsg = null;
      this.viewZoom = 1.0;
      this.autoFit = true;
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
        this.resetCropRegion();
        this.applyAutoFit();
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

    // Re-attach image container and processing overlay if removed by showLoading/showError
    if (!this.viewportEl.contains(this.imageContainerEl)) {
      clearChildren(this.viewportEl);
      this.viewportEl.appendChild(this.imageContainerEl);
      this.viewportEl.appendChild(this.processingEl);
    }

    this.imgEl.src = this.imageUrl || '';
    this.imgEl.alt = this.filePath;
    if (!this.panDrag) this.imgEl.style.cursor = this.imageUrl ? 'grab' : 'default';
    this.imgEl.style.display = this.imageUrl ? 'block' : 'none';
    if (this.dims) {
      this.imgEl.style.width = `${Math.round(this.dims.width * this.viewZoom)}px`;
      this.imgEl.style.height = `${Math.round(this.dims.height * this.viewZoom)}px`;
    } else {
      this.imgEl.style.width = '';
      this.imgEl.style.height = '';
    }

    // When the zoomed image is larger than the viewport, anchor it to the
    // top-left instead of centering — centering an overflowing flex child
    // makes part of the overflow unreachable by scrolling.
    const displayW = this.dims ? this.dims.width * this.viewZoom : 0;
    const displayH = this.dims ? this.dims.height * this.viewZoom : 0;
    const overflowsViewport = displayW > this.viewportEl.clientWidth || displayH > this.viewportEl.clientHeight;
    this.viewportEl.style.alignItems = overflowsViewport ? 'flex-start' : 'center';
    this.viewportEl.style.justifyContent = overflowsViewport ? 'flex-start' : 'center';

    // Viewport background
    this.viewportEl.style.background = this.showCheckerboard
      ? 'repeating-conic-gradient(#808080 0% 25%, #404040 0% 50%) 50% / 20px 20px'
      : '#1e1e1e';

    this.processingEl.style.display = this.processing ? '' : 'none';

    this.renderToolbar();
    this.renderInfoBar();
    this.renderCropOverlay();
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

    const canEdit = !!this.dims && !this.processing && !this.cropInteraction;

    // Undo / Redo
    this.toolbarEl.appendChild(this.makeBtn('\u2190 Undo', () => this.handleUndo(), this.historyIndex > 0 && !this.processing, 'Undo (Ctrl+Z)'));
    this.toolbarEl.appendChild(this.makeBtn('Redo \u2192', () => this.handleRedo(), this.historyIndex < this.history.length - 1 && !this.processing, 'Redo (Ctrl+Y)'));
    this.toolbarEl.appendChild(this.makeSep());

    // Resize (drag the handles on the image itself to crop \u2014 see renderCropOverlay)
    this.toolbarEl.appendChild(this.makeBtn('Resize...', () => this.showResizeDialog(), canEdit));

    this.toolbarEl.appendChild(this.makeSep());

    // Transparency
    const canTransparency = supportsTransparency(this.mimeType) && canEdit;
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

    // Zoom (view-only; does not modify the underlying image data)
    this.toolbarEl.appendChild(this.makeBtn('−', () => this.handleZoomStep(-1), canEdit, 'Zoom out'));

    const zoomInput = document.createElement('input');
    zoomInput.type = 'text';
    zoomInput.inputMode = 'numeric';
    zoomInput.value = String(Math.round(this.viewZoom * 100));
    zoomInput.disabled = !canEdit;
    zoomInput.title = 'Zoom percentage';
    setStyles(zoomInput, {
      width: '48px', textAlign: 'center', background: '#3c3c3c', border: '1px solid #3e3e42',
      color: '#cccccc', padding: '5px 4px', fontSize: '13px', fontFamily: "'Segoe UI', sans-serif", borderRadius: '2px',
    });
    zoomInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') zoomInput.blur(); });
    zoomInput.addEventListener('change', () => this.handleZoomInput(zoomInput.value));
    this.toolbarEl.appendChild(zoomInput);

    const pctSpan = el('span', {}, '%');
    setStyles(pctSpan, { color: '#cccccc', fontSize: '13px', fontFamily: "'Segoe UI', sans-serif" });
    this.toolbarEl.appendChild(pctSpan);

    this.toolbarEl.appendChild(this.makeBtn('+', () => this.handleZoomStep(1), canEdit, 'Zoom in'));

    this.toolbarEl.appendChild(this.makeSep());

    // Save / Save As / Reset
    this.toolbarEl.appendChild(this.makeBtn('Save', () => this.handleSave(), this.isModified && !this.processing));
    this.toolbarEl.appendChild(this.makeBtn('Save As...', () => this.showSaveAsDialog(), canEdit));
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

  /**
   * Renders the always-on-canvas crop handles (mspaint canvas-resize style):
   * 8 handles sit on the image's border at all times — no separate "Crop"
   * mode to enter first. Dragging a handle live-previews a smaller region
   * (border + dimming appear only while it differs from the full image);
   * releasing the mouse commits the crop immediately (see
   * handleCropInteractionUp / commitCrop). The overlay's own box never
   * captures pointer events — only the handles/strips do — so plain
   * click-drag on the image still pans it (see startPanDrag).
   */
  private renderCropOverlay(): void {
    if (this.cropOverlayEl) { this.cropOverlayEl.remove(); this.cropOverlayEl = null; }
    if (!this.dims || !this.cropRegion || this.processing) return;

    // cropRegion is stored in natural image pixels; scale to display pixels for layout.
    const z = this.viewZoom;
    const region = this.cropRegion;
    const isFullImage = region.x === 0 && region.y === 0
      && region.width === this.dims.width && region.height === this.dims.height;

    this.cropOverlayEl = el('div');
    this.cropOverlayEl.classList.add('crop-overlay');
    setStyles(this.cropOverlayEl, {
      position: 'absolute',
      border: isFullImage ? '1px dashed rgba(255, 255, 255, 0.5)' : '2px solid #007acc',
      boxShadow: isFullImage ? 'none' : '0 0 0 9999px rgba(0, 0, 0, 0.5)',
      pointerEvents: 'none',
      left: `${region.x * z}px`,
      top: `${region.y * z}px`,
      width: `${region.width * z}px`,
      height: `${region.height * z}px`,
    });

    if (!isFullImage) {
      const info = el('div', {}, `${region.width} \u00d7 ${region.height} px`);
      setStyles(info, {
        position: 'absolute', top: '-25px', left: '0',
        background: 'rgba(0, 0, 0, 0.7)', color: '#ffffff',
        padding: '4px 8px', fontSize: '12px', borderRadius: '2px', whiteSpace: 'nowrap',
      });
      this.cropOverlayEl.appendChild(info);
    }

    // Edge handles: the grabbable strip spans the entire edge (z-index 1),
    // with a small visible marker at its midpoint (pointer-events: none,
    // purely a visual cue) - the strip beneath it is what's actually clickable.
    for (const h of CROP_EDGE_HANDLES) {
      const strip = el('div');
      strip.dataset.cropHandle = h.mode;
      setStyles(strip, {
        position: 'absolute', cursor: h.cursor, pointerEvents: 'auto', zIndex: '1',
        ...h.style,
      });
      strip.addEventListener('mousedown', (e) => this.startCropInteraction(h.mode, e));
      this.cropOverlayEl.appendChild(strip);

      const isVertical = h.mode === 'n' || h.mode === 's';
      const marker = el('div');
      setStyles(marker, {
        position: 'absolute', width: '10px', height: '10px',
        background: '#ffffff', border: '1px solid #007acc', borderRadius: '1px',
        top: isVertical ? (h.mode === 'n' ? '0%' : '100%') : '50%',
        left: isVertical ? '50%' : (h.mode === 'w' ? '0%' : '100%'),
        transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: '1',
      });
      this.cropOverlayEl.appendChild(marker);
    }

    // Corner handles: small squares, exact grab points, rendered last so
    // they win over any overlapping edge strip right at the corners.
    for (const h of CROP_CORNER_HANDLES) {
      const handle = el('div');
      handle.dataset.cropHandle = h.mode;
      setStyles(handle, {
        position: 'absolute', width: '12px', height: '12px',
        background: '#ffffff', border: '1px solid #007acc', borderRadius: '1px',
        top: h.top, left: h.left, transform: 'translate(-50%, -50%)',
        cursor: h.cursor, pointerEvents: 'auto', zIndex: '2',
      });
      handle.addEventListener('mousedown', (e) => this.startCropInteraction(h.mode, e));
      this.cropOverlayEl.appendChild(handle);
    }

    this.imageContainerEl.appendChild(this.cropOverlayEl);
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
    this.resetCropRegion();
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
    this.resetCropRegion();
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
      this.resetCropRegion();
    } catch (err) {
      console.error('[ImageEditor] Failed to resize:', err);
      this.errorMsg = err instanceof Error ? err.message : String(err);
    } finally {
      this.processing = false; this.render();
    }
  }

  // --- Zoom (view-only) ---

  private handleZoomStep(direction: 1 | -1): void {
    const next = Math.round((this.viewZoom + direction * ImageEditor.ZOOM_STEP) * 100) / 100;
    this.setZoom(next);
  }

  private handleZoomInput(raw: string): void {
    const pct = parseInt(raw, 10);
    if (isNaN(pct)) { this.render(); return; }
    this.setZoom(pct / 100);
  }

  private setZoom(zoom: number): void {
    this.autoFit = false; // user took manual control — stop re-fitting on resize
    this.viewZoom = clampZoom(zoom, ImageEditor.ZOOM_MIN, ImageEditor.ZOOM_MAX);
    this.render();
  }

  /** Shrinks (never enlarges) the image to fit inside the viewport so no
   * scrollbars appear, unless the user has manually zoomed. Re-run whenever
   * the viewport resizes (see the ResizeObserver in onMount) so switching
   * tabs, toggling the sidebar, or resizing the window keeps it fitted. */
  private applyAutoFit(): void {
    if (!this.autoFit || !this.dims) return;
    const pad = ImageEditor.VIEWPORT_PADDING * 2;
    const availW = this.viewportEl.clientWidth - pad;
    const availH = this.viewportEl.clientHeight - pad;
    if (availW <= 0 || availH <= 0) return; // not visible/laid out yet

    const fit = Math.min(1, availW / this.dims.width, availH / this.dims.height);
    if (!Number.isFinite(fit) || fit <= 0) return;

    const rounded = Math.round(fit * 100) / 100;
    if (rounded === this.viewZoom) return;
    this.viewZoom = rounded;
    this.render();
  }

  // --- Crop (mspaint-style: always-on canvas handles, no separate mode) ---

  /** Snaps cropRegion back to covering the whole current image. Call this any
   * time this.dims changes (load, resize, crop commit, undo/redo, reset). */
  private resetCropRegion(): void {
    this.cropRegion = this.dims ? { x: 0, y: 0, width: this.dims.width, height: this.dims.height } : null;
  }

  private startCropInteraction(mode: CropHandleMode, e: MouseEvent): void {
    if (!this.cropRegion || this.processing) return;
    e.preventDefault();
    e.stopPropagation();
    this.cropInteraction = {
      mode,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startRegion: { ...this.cropRegion },
    };
  }

  private handleCropInteractionMove(e: MouseEvent): void {
    if (!this.cropInteraction || !this.dims) return;
    const { mode, startRegion } = this.cropInteraction;
    const z = this.viewZoom || 1;
    const dx = (e.clientX - this.cropInteraction.startClientX) / z;
    const dy = (e.clientY - this.cropInteraction.startClientY) / z;

    this.cropRegion = computeCropHandleDrag(mode, startRegion, dx, dy, this.dims.width, this.dims.height, CROP_MIN_SIZE);
    this.renderCropOverlay();
  }

  /** Releasing a handle commits the crop immediately, like mspaint's canvas
   * resize — no separate "Apply" step. Undo (Ctrl+Z) reverts it. */
  private handleCropInteractionUp(): void {
    if (!this.cropInteraction) return;
    this.cropInteraction = null;

    const region = this.cropRegion;
    const isNoOp = !region || !this.dims
      || (region.x === 0 && region.y === 0 && region.width === this.dims.width && region.height === this.dims.height);
    if (isNoOp) {
      this.renderToolbar();
      return;
    }
    void this.commitCrop(region);
  }

  private async commitCrop(region: CropRegion): Promise<void> {
    if (!this.imageUrl) return;
    try {
      this.processing = true; this.render();
      const cropped = await cropImage(this.imageUrl, region.x, region.y, region.width, region.height);
      const dims = { width: region.width, height: region.height };
      this.imageUrl = cropped;
      this.dims = dims;
      this.isModified = true;
      this.saveToHistory(cropped, dims, this.opacity);
      this.resetCropRegion();
    } catch (err) {
      console.error('[ImageEditor] Failed to crop:', err);
      this.errorMsg = err instanceof Error ? err.message : String(err);
    } finally {
      this.processing = false; this.render();
    }
  }

  // --- Pan (left-click-drag to view zoomed-in image) ---

  private startPanDrag(e: MouseEvent): void {
    if (e.button !== 0 || this.processing || !this.imageUrl) return;
    e.preventDefault();
    this.panDrag = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startScrollLeft: this.viewportEl.scrollLeft,
      startScrollTop: this.viewportEl.scrollTop,
    };
    this.imgEl.style.cursor = 'grabbing';
  }

  private handlePanDragMove(e: MouseEvent): void {
    if (!this.panDrag) return;
    this.viewportEl.scrollLeft = this.panDrag.startScrollLeft - (e.clientX - this.panDrag.startClientX);
    this.viewportEl.scrollTop = this.panDrag.startScrollTop - (e.clientY - this.panDrag.startClientY);
  }

  private handlePanDragUp(): void {
    if (this.panDrag) {
      this.panDrag = null;
      this.imgEl.style.cursor = this.imageUrl ? 'grab' : 'default';
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
      await window.api.saveFile(this.filePath, base64Data);
      this.isModified = false;
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
    this.cropInteraction = null;
    this.resetCropRegion();
    this.opacity = 1.0;
    this.showTransparencyControls = false;
    this.showCheckerboard = false;
    this.viewZoom = 1.0;
    this.autoFit = true;
    this.history = [{ imageUrl: this.originalDataUrl, dimensions: { ...this.originalDims }, opacity: 1.0 }];
    this.historyIndex = 0;
    this.applyAutoFit();
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
