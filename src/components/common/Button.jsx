import React from 'react';

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
  const variantClasses = {
    primary: 'btn-primary text-white',
    secondary: 'btn-secondary text-primary',
    accent: 'btn-accent',
    ghost: 'btn-ghost hover:bg-secondary hover:text-primary',
    link: 'btn-link text-primary',
    outline: 'btn-outline border-primary text-primary hover:bg-primary hover:text-white',
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
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;