import React from 'react';

const GAP = { 0: 'gap-0', 1: 'gap-1', 2: 'gap-2', 3: 'gap-3', 4: 'gap-4', 5: 'gap-5', 6: 'gap-6', 8: 'gap-8', 10: 'gap-10', 12: 'gap-12' };
const COLS = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6' };
const SM   = { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4' };
const MD   = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' };
const LG   = { 1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' };
const XL   = { 1: 'xl:grid-cols-1', 2: 'xl:grid-cols-2', 3: 'xl:grid-cols-3', 4: 'xl:grid-cols-4' };

const Grid = ({
  children,
  cols = 1,
  sm = null,
  md = null,
  lg = null,
  xl = null,
  gap = 6,
  className = '',
}) => {
  const colClasses = [
    COLS[cols] ?? `grid-cols-${cols}`,
    sm ? (SM[sm] ?? `sm:grid-cols-${sm}`) : '',
    md ? (MD[md] ?? `md:grid-cols-${md}`) : '',
    lg ? (LG[lg] ?? `lg:grid-cols-${lg}`) : '',
    xl ? (XL[xl] ?? `xl:grid-cols-${xl}`) : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={`grid ${colClasses} ${GAP[gap] ?? `gap-${gap}`} ${className}`}>
      {children}
    </div>
  );
};

export default Grid;