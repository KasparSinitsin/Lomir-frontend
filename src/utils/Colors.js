/**
 * Central color system for Lomir app
 * Provides consistent access to CSS variables for colors and themes
 */
const Colors = {
    // Primary Brand Colors
    primary: 'var(--color-primary)',
    primaryFocus: 'var(--color-primary-focus)',
    primaryContent: 'var(--color-primary-content)',
    
    // Badge Category Colors
    badge: {
      collaboration: 'var(--color-badge-collaboration)',
      technical: 'var(--color-badge-technical)',
      creative: 'var(--color-badge-creative)',
      leadership: 'var(--color-badge-leadership)',
      personal: 'var(--color-badge-personal)',
    },
    
    // UI Colors
    background: 'var(--color-background)',
    backgroundSoft: 'var(--color-background-soft)',
    backgroundMuted: 'var(--color-background-muted)',
    text: 'var(--color-text)',
    textSoft: 'var(--color-text-soft)',
    border: 'var(--color-border)',
    
    // Semantic Colors
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    error: 'var(--color-error)',
    info: 'var(--color-info)',
    
    // Helper Functions
    getBadgeColor: function(category) {
      if (!category) return this.primary;
      
      const categoryLower = category.toLowerCase();
      
      if (categoryLower.includes('collaboration')) return this.badge.collaboration;
      if (categoryLower.includes('technical')) return this.badge.technical;
      if (categoryLower.includes('creative')) return this.badge.creative;
      if (categoryLower.includes('leadership')) return this.badge.leadership;
      if (categoryLower.includes('personal')) return this.badge.personal;
      
      return this.primary; // Default fallback
    },
    
    // Design Tokens
    shadow: {
      soft: 'var(--shadow-soft)',
      card: 'var(--shadow-card)',
    },
    
    transition: {
      fast: 'var(--transition-speed-fast)',
      normal: 'var(--transition-speed-normal)',
      slow: 'var(--transition-speed-slow)',
    },
    
    // Tailwind Class Helpers
    tailwind: {
      // Returns tailwind text color classes
      text: {
        primary: 'text-[var(--color-primary)]',
        primaryFocus: 'text-[var(--color-primary-focus)]',
        base: 'text-[var(--color-text)]',
        soft: 'text-[var(--color-text-soft)]',
      },
      // Returns tailwind background color classes
      bg: {
        primary: 'bg-[var(--color-primary)]',
        soft: 'bg-[var(--color-background-soft)]',
        muted: 'bg-[var(--color-background-muted)]',
      },
      // Returns tailwind border color classes
      border: {
        primary: 'border-[var(--color-primary)]',
      }
    }
  };
  
  export default Colors;