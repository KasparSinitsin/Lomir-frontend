import React from 'react';

const Button = ({ 
  children, 
  type = 'button', 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  onClick,
  disabled = false,
  fullWidth = false
}) => {
  const baseClasses = 'btn';
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    accent: 'btn-accent',
    ghost: 'btn-ghost',
    link: 'btn-link',
    outline: 'btn-outline',
    error: 'btn-error',
    success: 'btn-success',
    warning: 'btn-warning',
    info: 'btn-info',
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
      {children}
    </button>
  );
};

export default Button;