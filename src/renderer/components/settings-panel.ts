/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

// Settings Panel Component - Visual configuration interface
// Replaces JSON-based configuration with intuitive UI controls

export interface SettingControl {
  id: string;
  label: string;
  type: 'toggle' | 'slider' | 'dropdown' | 'text';
  value: unknown;
  options?: { label: string; value: unknown }[];
  min?: number;
  max?: number;
  step?: number;
}

export class SettingsPanel {
  private overlay: HTMLDivElement | null = null;
  private isVisible = false;
  private settings: Map<string, SettingControl> = new Map();
  private onSettingChanged?: (id: string, value: unknown) => void | Promise<void>;

  constructor() {
    this.createOverlay();
    this.setupKeyboardListeners();
  }

  private createOverlay(): void {
    const overlay = document.createElement('div');
    overlay.id = 'settings-panel-overlay';
    overlay.style.cssText = `
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      justify-content: center;
      align-items: center;
    `;

    const panel = document.createElement('div');
    panel.id = 'settings-panel-container';
    panel.style.cssText = `
      background: #1e1e1e;
      border: 1px solid #333;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      min-width: 500px;
      max-width: 700px;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      padding: 16px 20px;
      background: #252526;
      border-bottom: 1px solid #333;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const title = document.createElement('h2');
    title.textContent = 'Settings';
    title.style.cssText = `
      margin: 0;
      color: #fff;
      font-size: 18px;
      font-weight: 600;
    `;

    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.id = 'settings-panel-close';
    closeButton.style.cssText = `
      background: transparent;
      border: none;
      color: #ccc;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background 0.2s, color 0.2s;
    `;
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.background = '#333';
      closeButton.style.color = '#fff';
    });
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.background = 'transparent';
      closeButton.style.color = '#ccc';
    });
    closeButton.addEventListener('click', () => {
      this.hide();
    });

    header.appendChild(title);
    header.appendChild(closeButton);

    const content = document.createElement('div');
    content.id = 'settings-panel-content';
    content.style.cssText = `
      padding: 20px;
      overflow-y: auto;
      max-height: calc(80vh - 70px);
    `;

    panel.appendChild(header);
    panel.appendChild(content);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    this.overlay = overlay;

    // Close on overlay click (outside panel)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.hide();
      }
    });

    // Prevent panel clicks from closing
    panel.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  private setupKeyboardListeners(): void {
    document.addEventListener('keydown', (e) => {
      // Only handle keys when panel is visible
      if (!this.isVisible) {
        return;
      }

      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        this.hide();
        return;
      }
    });
  }

  public addSetting(setting: SettingControl): void {
    this.settings.set(setting.id, setting);
    this.render();
  }

  public removeSetting(id: string): void {
    this.settings.delete(id);
    this.render();
  }

  public setSetting(id: string, value: unknown): void {
    const setting = this.settings.get(id);
    if (setting) {
      setting.value = value;
      this.render();
    }
  }

  public getSetting(id: string): unknown {
    return this.settings.get(id)?.value;
  }

  public show(): void {
    if (!this.overlay) {
      return;
    }
    this.isVisible = true;
    this.overlay.style.display = 'flex';
    this.render();
  }

  public hide(): void {
    if (!this.overlay) {
      return;
    }
    this.isVisible = false;
    this.overlay.style.display = 'none';
  }

  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  public isOpen(): boolean {
    return this.isVisible;
  }

  public onChange(callback: (id: string, value: unknown) => void | Promise<void>): void {
    this.onSettingChanged = callback;
  }

  private render(): void {
    const content = document.getElementById('settings-panel-content');
    if (!content) {
      return;
    }

    content.innerHTML = '';

    this.settings.forEach((setting) => {
      const settingRow = document.createElement('div');
      settingRow.style.cssText = `
        margin-bottom: 24px;
      `;

      const label = document.createElement('label');
      label.textContent = setting.label;
      label.style.cssText = `
        display: block;
        color: #ccc;
        font-size: 14px;
        margin-bottom: 8px;
        font-weight: 500;
      `;

      let control: HTMLElement;

      switch (setting.type) {
        case 'toggle':
          control = this.createToggleControl(setting);
          break;
        case 'slider':
          control = this.createSliderControl(setting);
          break;
        case 'dropdown':
          control = this.createDropdownControl(setting);
          break;
        case 'text':
          control = this.createTextControl(setting);
          break;
        default:
          control = document.createElement('div');
      }

      settingRow.appendChild(label);
      settingRow.appendChild(control);
      content.appendChild(settingRow);
    });
  }

  private createToggleControl(setting: SettingControl): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      align-items: center;
    `;

    const toggle = document.createElement('button');
    toggle.id = `setting-${setting.id}`;
    toggle.style.cssText = `
      width: 50px;
      height: 26px;
      border-radius: 13px;
      border: none;
      cursor: pointer;
      position: relative;
      transition: background 0.2s;
      background: ${setting.value ? '#007acc' : '#555'};
    `;

    const knob = document.createElement('div');
    knob.style.cssText = `
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #fff;
      position: absolute;
      top: 3px;
      left: ${setting.value ? '27px' : '3px'};
      transition: left 0.2s;
    `;

    toggle.appendChild(knob);

    toggle.addEventListener('click', () => {
      const newValue = !setting.value;
      setting.value = newValue;
      toggle.style.background = newValue ? '#007acc' : '#555';
      knob.style.left = newValue ? '27px' : '3px';
      this.notifyChange(setting.id, newValue);
    });

    container.appendChild(toggle);
    return container;
  }

  private createSliderControl(setting: SettingControl): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
    `;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = `setting-${setting.id}`;
    slider.min = String(setting.min ?? 0);
    slider.max = String(setting.max ?? 100);
    slider.step = String(setting.step ?? 1);
    slider.value = String(setting.value ?? setting.min ?? 0);
    slider.style.cssText = `
      flex: 1;
      height: 4px;
      border-radius: 2px;
      background: #555;
      outline: none;
      -webkit-appearance: none;
    `;

    // Style the slider thumb
    const style = document.createElement('style');
    style.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #007acc;
        cursor: pointer;
      }
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #007acc;
        cursor: pointer;
        border: none;
      }
    `;
    document.head.appendChild(style);

    const valueLabel = document.createElement('span');
    valueLabel.textContent = String(setting.value ?? setting.min ?? 0);
    valueLabel.style.cssText = `
      color: #fff;
      font-size: 14px;
      min-width: 40px;
      text-align: right;
    `;

    slider.addEventListener('input', () => {
      const newValue = Number(slider.value);
      setting.value = newValue;
      valueLabel.textContent = String(newValue);
      this.notifyChange(setting.id, newValue);
    });

    container.appendChild(slider);
    container.appendChild(valueLabel);
    return container;
  }

  private createDropdownControl(setting: SettingControl): HTMLElement {
    const select = document.createElement('select');
    select.id = `setting-${setting.id}`;
    select.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      background: #2d2d30;
      border: 1px solid #555;
      border-radius: 4px;
      color: #fff;
      font-size: 14px;
      cursor: pointer;
      outline: none;
    `;

    (setting.options ?? []).forEach((option) => {
      const optionElement = document.createElement('option');
      optionElement.value = String(option.value);
      optionElement.textContent = option.label;
      optionElement.selected = option.value === setting.value;
      select.appendChild(optionElement);
    });

    select.addEventListener('change', () => {
      const newValue = select.value;
      setting.value = newValue;
      this.notifyChange(setting.id, newValue);
    });

    return select;
  }

  private createTextControl(setting: SettingControl): HTMLElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = `setting-${setting.id}`;
    input.value = String(setting.value ?? '');
    input.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      background: #2d2d30;
      border: 1px solid #555;
      border-radius: 4px;
      color: #fff;
      font-size: 14px;
      outline: none;
    `;

    input.addEventListener('change', () => {
      const newValue = input.value;
      setting.value = newValue;
      this.notifyChange(setting.id, newValue);
    });

    return input;
  }

  private notifyChange(id: string, value: unknown): void {
    if (this.onSettingChanged) {
      void Promise.resolve(this.onSettingChanged(id, value));
    }
  }

  public async loadFromStorage(): Promise<void> {
    if (!window.api) {
      return;
    }

    for (const [id, setting] of this.settings) {
      try {
        const value = await window.api.getSetting(id, setting.value);
        if (value !== undefined) {
          setting.value = value;
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Failed to load setting ${id}:`, error);
      }
    }

    this.render();
  }

  public async saveToStorage(id: string, value: unknown): Promise<void> {
    if (!window.api) {
      return;
    }

    try {
      await window.api.setSetting(id, value);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to save setting ${id}:`, error);
    }
  }
}

