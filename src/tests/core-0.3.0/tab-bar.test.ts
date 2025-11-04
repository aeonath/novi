/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Tests for TabBar component
 */

import { TabBar, Tab } from '../../renderer/components/tab-bar';

describe('TabBar', () => {
  let container: HTMLElement;
  let tabBar: TabBar;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    tabBar = new TabBar(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('initialization', () => {
    it('should initialize with empty tab list', () => {
      expect(tabBar.getTabs()).toEqual([]);
      expect(tabBar.getActiveTab()).toBeNull();
    });

    it('should create container with proper styles', () => {
      expect(container.style.display).toBe('flex');
      expect(container.style.minHeight).toBe('35px');
    });

    it('should show empty state when no tabs', () => {
      expect(container.textContent).toContain('No files open');
    });
  });

  describe('adding tabs', () => {
    const sampleTab: Tab = {
      id: 'test-1',
      filePath: '/test/file1.ts',
      fileName: 'file1.ts',
      isDirty: false,
      content: 'console.log("test");',
      language: 'typescript',
    };

    it('should add a new tab', () => {
      tabBar.addTab(sampleTab);
      expect(tabBar.getTabs()).toHaveLength(1);
      expect(tabBar.getTabs()[0]).toEqual(sampleTab);
    });

    it('should set new tab as active', () => {
      tabBar.addTab(sampleTab);
      expect(tabBar.getActiveTab()?.id).toBe(sampleTab.id);
    });

    it('should not duplicate existing tab', () => {
      tabBar.addTab(sampleTab);
      tabBar.addTab(sampleTab);
      expect(tabBar.getTabs()).toHaveLength(1);
    });

    it('should activate existing tab when adding duplicate', () => {
      const tab2: Tab = {
        ...sampleTab,
        id: 'test-2',
        filePath: '/test/file2.ts',
        fileName: 'file2.ts',
      };
      
      tabBar.addTab(sampleTab);
      tabBar.addTab(tab2);
      expect(tabBar.getActiveTab()?.id).toBe(tab2.id);
      
      // Try to add first tab again
      tabBar.addTab(sampleTab);
      expect(tabBar.getActiveTab()?.id).toBe(sampleTab.id);
    });

    it('should render tabs in the container', () => {
      tabBar.addTab(sampleTab);
      expect(container.querySelector('.tab')).toBeTruthy();
      expect(container.textContent).toContain('file1.ts');
    });
  });

  describe('removing tabs', () => {
    const tab1: Tab = {
      id: 'test-1',
      filePath: '/test/file1.ts',
      fileName: 'file1.ts',
      isDirty: false,
      content: 'test',
      language: 'typescript',
    };

    const tab2: Tab = {
      id: 'test-2',
      filePath: '/test/file2.ts',
      fileName: 'file2.ts',
      isDirty: false,
      content: 'test',
      language: 'typescript',
    };

    it('should remove a tab', () => {
      tabBar.addTab(tab1);
      const result = tabBar.removeTab(tab1.id);
      expect(result).toBe(true);
      expect(tabBar.getTabs()).toHaveLength(0);
    });

    it('should return false for non-existent tab', () => {
      const result = tabBar.removeTab('non-existent');
      expect(result).toBe(false);
    });

    it('should activate next tab when removing active tab', () => {
      tabBar.addTab(tab1);
      tabBar.addTab(tab2);
      tabBar.setActiveTab(tab1.id);
      
      tabBar.removeTab(tab1.id);
      expect(tabBar.getActiveTab()?.id).toBe(tab2.id);
    });

    it('should activate previous tab if removed last tab', () => {
      tabBar.addTab(tab1);
      tabBar.addTab(tab2);
      tabBar.setActiveTab(tab2.id);
      
      tabBar.removeTab(tab2.id);
      expect(tabBar.getActiveTab()?.id).toBe(tab1.id);
    });

    it('should handle close callback', () => {
      const onClose = jest.fn(() => true);
      tabBar.onTabClose(onClose);
      
      tabBar.addTab(tab1);
      tabBar.removeTab(tab1.id);
      
      expect(onClose).toHaveBeenCalledWith(tab1.id);
    });

    it('should prevent close if callback returns false', () => {
      const onClose = jest.fn(() => false);
      tabBar.onTabClose(onClose);
      
      tabBar.addTab(tab1);
      const result = tabBar.removeTab(tab1.id);
      
      expect(result).toBe(false);
      expect(tabBar.getTabs()).toHaveLength(1);
    });
  });

  describe('tab switching', () => {
    const tab1: Tab = {
      id: 'test-1',
      filePath: '/test/file1.ts',
      fileName: 'file1.ts',
      isDirty: false,
      content: 'test1',
      language: 'typescript',
    };

    const tab2: Tab = {
      id: 'test-2',
      filePath: '/test/file2.ts',
      fileName: 'file2.ts',
      isDirty: false,
      content: 'test2',
      language: 'typescript',
    };

    it('should switch active tab', () => {
      tabBar.addTab(tab1);
      tabBar.addTab(tab2);
      
      tabBar.setActiveTab(tab1.id);
      expect(tabBar.getActiveTab()?.id).toBe(tab1.id);
      
      tabBar.setActiveTab(tab2.id);
      expect(tabBar.getActiveTab()?.id).toBe(tab2.id);
    });

    it('should call onTabSwitch callback', () => {
      const onSwitch = jest.fn();
      tabBar.onTabSwitch(onSwitch);
      
      tabBar.addTab(tab1);
      expect(onSwitch).toHaveBeenCalledWith(tab1);
    });

    it('should not switch to non-existent tab', () => {
      tabBar.addTab(tab1);
      tabBar.setActiveTab('non-existent');
      expect(tabBar.getActiveTab()?.id).toBe(tab1.id);
    });
  });

  describe('tab state updates', () => {
    const tab1: Tab = {
      id: 'test-1',
      filePath: '/test/file1.ts',
      fileName: 'file1.ts',
      isDirty: false,
      content: 'test',
      language: 'typescript',
    };

    it('should update tab dirty state', () => {
      tabBar.addTab(tab1);
      tabBar.updateTabDirty(tab1.id, true);
      
      const updatedTab = tabBar.getTabs()[0];
      expect(updatedTab.isDirty).toBe(true);
    });

    it('should show dirty indicator in UI', () => {
      tabBar.addTab(tab1);
      tabBar.updateTabDirty(tab1.id, true);
      
      expect(container.textContent).toContain('●');
    });

    it('should update tab content', () => {
      tabBar.addTab(tab1);
      tabBar.updateTabContent(tab1.id, 'new content');
      
      const updatedTab = tabBar.getTabs()[0];
      expect(updatedTab.content).toBe('new content');
    });
  });

  describe('user interactions', () => {
    const tab1: Tab = {
      id: 'test-1',
      filePath: '/test/file1.ts',
      fileName: 'file1.ts',
      isDirty: false,
      content: 'test',
      language: 'typescript',
    };

    it('should switch tab on click', () => {
      const tab2: Tab = { ...tab1, id: 'test-2', filePath: '/test/file2.ts', fileName: 'file2.ts' };
      
      tabBar.addTab(tab1);
      tabBar.addTab(tab2);
      tabBar.setActiveTab(tab1.id);
      
      const tabs = container.querySelectorAll('.tab');
      (tabs[1] as HTMLElement).click();
      
      expect(tabBar.getActiveTab()?.id).toBe(tab2.id);
    });

    it('should close tab on close button click', () => {
      tabBar.addTab(tab1);
      
      const closeBtn = container.querySelector('.tab span:last-child') as HTMLElement;
      closeBtn.click();
      
      expect(tabBar.getTabs()).toHaveLength(0);
    });

    it('should show hover effects', () => {
      const tab2: Tab = { ...tab1, id: 'test-2', filePath: '/test/file2.ts', fileName: 'file2.ts' };
      
      tabBar.addTab(tab1);
      tabBar.addTab(tab2);
      tabBar.setActiveTab(tab1.id);
      
      const inactiveTab = container.querySelectorAll('.tab')[1] as HTMLElement;
      const mouseEnter = new MouseEvent('mouseenter');
      const mouseLeave = new MouseEvent('mouseleave');
      
      inactiveTab.dispatchEvent(mouseEnter);
      expect(inactiveTab.style.background).toBeTruthy();
      
      inactiveTab.dispatchEvent(mouseLeave);
      expect(inactiveTab.style.background).toBe('transparent');
    });
  });
});

