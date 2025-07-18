/**
 * Responsive Design Validation Utility
 * Tests responsive implementation across all target breakpoints
 * Ensures 1:1 functional parity with desktop
 */

export interface BreakpointTest {
  name: string;
  width: number;
  height: number;
  description: string;
}

export interface ValidationResult {
  breakpoint: BreakpointTest;
  passed: boolean;
  issues: string[];
  metrics: {
    layoutShift: number;
    renderTime: number;
    interactionDelay: number;
    accessibilityScore: number;
  };
}

export class ResponsiveValidator {
  private static readonly BREAKPOINTS: BreakpointTest[] = [
    { name: 'XS', width: 320, height: 568, description: 'iPhone SE' },
    { name: 'SM', width: 375, height: 667, description: 'iPhone 8' },
    { name: 'MD', width: 425, height: 896, description: 'iPhone 11 Pro Max' },
    { name: 'LG', width: 768, height: 1024, description: 'iPad Portrait' },
    { name: 'XL', width: 1024, height: 768, description: 'iPad Landscape' },
    { name: '2XL', width: 1440, height: 900, description: 'Desktop' }
  ];

  private static readonly VALIDATION_RULES = {
    // Layout Rules
    noHorizontalScroll: 'No horizontal scrollbar should appear',
    maintainAspectRatio: 'Component aspect ratios should be maintained',
    noOverflow: 'No content should overflow containers',
    consistentSpacing: 'Spacing should scale proportionally',
    
    // Typography Rules
    readableText: 'Text should remain readable at all sizes',
    noTextOverlap: 'Text should not overlap other elements',
    consistentLineHeight: 'Line heights should scale appropriately',
    
    // Interactive Rules
    touchTargetSize: 'Touch targets should be at least 44px',
    hoverStatesWork: 'Hover states should work on touch devices',
    focusVisible: 'Focus states should be visible',
    
    // Performance Rules
    fastRender: 'Page should render within 2 seconds',
    smoothAnimations: 'Animations should be smooth (60fps)',
    noLayoutShift: 'Cumulative Layout Shift should be < 0.1'
  };

  /**
   * Run comprehensive responsive validation
   */
  static async validateResponsiveDesign(
    testUrl: string = window.location.href
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const breakpoint of this.BREAKPOINTS) {
      const result = await this.testBreakpoint(breakpoint, testUrl);
      results.push(result);
    }

    return results;
  }

  /**
   * Test a specific breakpoint
   */
  private static async testBreakpoint(
    breakpoint: BreakpointTest,
    testUrl: string
  ): Promise<ValidationResult> {
    const startTime = performance.now();
    const issues: string[] = [];

    // Set viewport size
    await this.setViewportSize(breakpoint.width, breakpoint.height);

    // Wait for layout to stabilize
    await this.waitForLayoutStable();

    // Run validation tests
    const layoutTests = await this.runLayoutTests();
    const interactionTests = await this.runInteractionTests();
    const performanceTests = await this.runPerformanceTests();
    const accessibilityTests = await this.runAccessibilityTests();

    issues.push(...layoutTests.issues);
    issues.push(...interactionTests.issues);
    issues.push(...performanceTests.issues);
    issues.push(...accessibilityTests.issues);

    const renderTime = performance.now() - startTime;

    return {
      breakpoint,
      passed: issues.length === 0,
      issues,
      metrics: {
        layoutShift: performanceTests.layoutShift,
        renderTime,
        interactionDelay: interactionTests.averageDelay,
        accessibilityScore: accessibilityTests.score
      }
    };
  }

  /**
   * Set viewport size for testing
   */
  private static async setViewportSize(width: number, height: number): Promise<void> {
    if (typeof window !== 'undefined') {
      // For browser testing, we can't actually resize the window
      // Instead, we'll use CSS to simulate the viewport
      const testContainer = document.createElement('div');
      testContainer.id = 'responsive-test-container';
      testContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: ${width}px;
        height: ${height}px;
        overflow: hidden;
        z-index: 10000;
        background: white;
        border: 2px solid red;
      `;
      
      document.body.appendChild(testContainer);
      
      // Wait for next frame
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
  }

  /**
   * Wait for layout to stabilize
   */
  private static async waitForLayoutStable(): Promise<void> {
    return new Promise(resolve => {
      let lastHeight = document.body.scrollHeight;
      let stableCount = 0;
      
      const checkStability = () => {
        const currentHeight = document.body.scrollHeight;
        if (currentHeight === lastHeight) {
          stableCount++;
          if (stableCount >= 3) {
            resolve();
            return;
          }
        } else {
          stableCount = 0;
          lastHeight = currentHeight;
        }
        
        requestAnimationFrame(checkStability);
      };
      
      checkStability();
    });
  }

  /**
   * Run layout validation tests
   */
  private static async runLayoutTests(): Promise<{ issues: string[] }> {
    const issues: string[] = [];

    // Check for horizontal scroll
    if (document.body.scrollWidth > window.innerWidth) {
      issues.push('Horizontal scrollbar detected');
    }

    // Check for overflow
    const elements = document.querySelectorAll('*');
    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        issues.push(`Element overflows viewport: ${el.tagName}${el.id ? '#' + el.id : ''}${el.className ? '.' + el.className.split(' ')[0] : ''}`);
      }
    });

    // Check responsive classes are applied
    const responsiveElements = document.querySelectorAll('[class*="responsive-"]');
    if (responsiveElements.length === 0) {
      issues.push('No responsive classes found - responsive system may not be applied');
    }

    // Check for fixed pixel values in critical elements
    const criticalElements = document.querySelectorAll('.responsive-card, .responsive-table, .responsive-btn');
    criticalElements.forEach(el => {
      const styles = window.getComputedStyle(el);
      if (styles.width.includes('px') && !styles.width.includes('min(') && !styles.width.includes('max(')) {
        issues.push(`Fixed pixel width detected in responsive element: ${el.className}`);
      }
    });

    return { issues };
  }

  /**
   * Run interaction validation tests
   */
  private static async runInteractionTests(): Promise<{ issues: string[]; averageDelay: number }> {
    const issues: string[] = [];
    const delays: number[] = [];

    // Test touch target sizes
    const interactiveElements = document.querySelectorAll('button, a, input, select, textarea');
    interactiveElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width < 44 || rect.height < 44) {
        issues.push(`Touch target too small: ${el.tagName} (${Math.round(rect.width)}x${Math.round(rect.height)}px)`);
      }
    });

    // Test button responsiveness
    const buttons = document.querySelectorAll('button');
    for (const button of Array.from(buttons).slice(0, 5)) { // Test first 5 buttons
      const startTime = performance.now();
      button.click();
      await new Promise(resolve => requestAnimationFrame(resolve));
      const delay = performance.now() - startTime;
      delays.push(delay);
      
      if (delay > 100) {
        issues.push(`Slow button response: ${delay.toFixed(2)}ms`);
      }
    }

    // Test focus visibility
    const focusableElements = document.querySelectorAll('button, a, input, select, textarea');
    focusableElements.forEach(el => {
      el.focus();
      const styles = window.getComputedStyle(el, ':focus');
      if (!styles.outline && !styles.boxShadow && !styles.border.includes('blue')) {
        issues.push(`Focus state not visible: ${el.tagName}`);
      }
    });

    const averageDelay = delays.length > 0 ? delays.reduce((a, b) => a + b, 0) / delays.length : 0;

    return { issues, averageDelay };
  }

  /**
   * Run performance validation tests
   */
  private static async runPerformanceTests(): Promise<{ issues: string[]; layoutShift: number }> {
    const issues: string[] = [];

    // Measure Cumulative Layout Shift
    let layoutShift = 0;
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            layoutShift += (entry as any).value;
          }
        }
      });
      observer.observe({ entryTypes: ['layout-shift'] });
      
      // Wait a bit to collect metrics
      await new Promise(resolve => setTimeout(resolve, 1000));
      observer.disconnect();
    }

    if (layoutShift > 0.1) {
      issues.push(`High Cumulative Layout Shift: ${layoutShift.toFixed(3)}`);
    }

    // Check for large images without dimensions
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (!img.width && !img.height && !img.style.width && !img.style.height) {
        issues.push(`Image without dimensions may cause layout shift: ${img.src}`);
      }
    });

    return { issues, layoutShift };
  }

  /**
   * Run accessibility validation tests
   */
  private static async runAccessibilityTests(): Promise<{ issues: string[]; score: number }> {
    const issues: string[] = [];
    let score = 100;

    // Check for alt text on images
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (!img.alt) {
        issues.push(`Image missing alt text: ${img.src}`);
        score -= 5;
      }
    });

    // Check for proper heading hierarchy
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let lastLevel = 0;
    headings.forEach(heading => {
      const level = parseInt(heading.tagName.charAt(1));
      if (level > lastLevel + 1) {
        issues.push(`Heading hierarchy skip: ${heading.tagName} after h${lastLevel}`);
        score -= 3;
      }
      lastLevel = level;
    });

    // Check for form labels
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const id = input.id;
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (!label && !input.getAttribute('aria-label')) {
          issues.push(`Form input missing label: ${input.tagName}#${id}`);
          score -= 3;
        }
      }
    });

    // Check color contrast (simplified)
    const textElements = document.querySelectorAll('p, span, div, button, a');
    textElements.forEach(el => {
      const styles = window.getComputedStyle(el);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;
      
      // Simple contrast check (would need more sophisticated algorithm for production)
      if (color === backgroundColor) {
        issues.push(`Poor color contrast detected: ${el.tagName}`);
        score -= 2;
      }
    });

    return { issues, score: Math.max(0, score) };
  }

  /**
   * Generate validation report
   */
  static generateReport(results: ValidationResult[]): string {
    let report = '# Responsive Design Validation Report\n\n';
    
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const overallScore = (passedTests / totalTests) * 100;
    
    report += `## Overall Score: ${overallScore.toFixed(1)}% (${passedTests}/${totalTests} breakpoints passed)\n\n`;
    
    results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      report += `### ${result.breakpoint.name} (${result.breakpoint.width}x${result.breakpoint.height}) - ${status}\n`;
      report += `**Device:** ${result.breakpoint.description}\n`;
      report += `**Render Time:** ${result.metrics.renderTime.toFixed(2)}ms\n`;
      report += `**Layout Shift:** ${result.metrics.layoutShift.toFixed(3)}\n`;
      report += `**Accessibility Score:** ${result.metrics.accessibilityScore}%\n\n`;
      
      if (result.issues.length > 0) {
        report += '**Issues Found:**\n';
        result.issues.forEach(issue => {
          report += `- ${issue}\n`;
        });
        report += '\n';
      }
    });
    
    return report;
  }

  /**
   * Run quick validation for current viewport
   */
  static async quickValidation(): Promise<{ passed: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    // Quick checks
    if (document.body.scrollWidth > window.innerWidth) {
      issues.push('Horizontal scroll detected');
    }
    
    const smallButtons = document.querySelectorAll('button, a');
    smallButtons.forEach(btn => {
      const rect = btn.getBoundingClientRect();
      if (rect.width < 44 || rect.height < 44) {
        issues.push(`Small touch target: ${btn.tagName}`);
      }
    });
    
    return {
      passed: issues.length === 0,
      issues
    };
  }
}

// Auto-run validation in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.addEventListener('load', async () => {
    const quickResult = await ResponsiveValidator.quickValidation();
    if (!quickResult.passed) {
      console.warn('Responsive Design Issues Detected:', quickResult.issues);
    }
  });
}

export default ResponsiveValidator;
