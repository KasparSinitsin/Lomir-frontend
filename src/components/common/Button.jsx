import React from 'react';
import Colors from '../../utils/Colors';

const Button = ({ 
  children, 
  type = 'button', 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  onClick,
  disabled = false,
  fullWidth = false,
  icon = null
}) => {
  const baseClasses = 'btn';
  
  // Define variants using CSS variables
  const variantClasses = {
    primary: 'btn-outline btn-primary', 
    secondary: 'btn-secondary text-[var(--color-primary)]',
    accent: 'btn-accent',
    ghost: 'btn-ghost hover:bg-secondary hover:text-[var(--color-primary)]',
    link: 'btn-link text-[var(--color-primary)]',
    outline: 'btn-outline border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white',
    error: 'btn-error',
    success: 'btn-success',
    warning: 'btn-warning',
    info: 'btn-info',
    successOutline: 'btn-outline btn-primary btn-success-outline',
  };
  
  const sizeClasses = {
    xs: 'btn-xs',
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
  };
  
  const classes = [
    baseClasses,
    variantClasses[variant] || '',
    sizeClasses[size] || '',
    fullWidth ? 'w-full' : '',
    className
  ].join(' ');

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span className="mr-0">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;