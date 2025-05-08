
/**
 * Central color system for Lomir app
 * Use these color constants instead of hardcoded values throughout the app
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
    text: 'var(--color-text)',
    textSoft: 'var(--color-text-soft)',
    border: 'var(--color-border)',
    
    // Semantic Colors
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    error: 'var(--color-error)',
    info: 'var(--color-info)',
    
    // Helper function to get badge color by category name
    getBadgeColor: function(category) {
      if (!category) return this.primary;
      
      const categoryLower = category.toLowerCase();
      
      if (categoryLower.includes('collaboration')) return this.badge.collaboration;
      if (categoryLower.includes('technical')) return this.badge.technical;
      if (categoryLower.includes('creative')) return this.badge.creative;
      if (categoryLower.includes('leadership')) return this.badge.leadership;
      if (categoryLower.includes('personal')) return this.badge.personal;
      
      return this.primary; // Default fallback
    }
  };
  
  export default Colors;