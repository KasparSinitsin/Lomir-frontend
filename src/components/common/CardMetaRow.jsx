import React from "react";

const CardMetaRow = ({ children, className = "" }) => {
  return (
    <div className={`flex flex-wrap gap-x-1.5 text-xs ${className}`}>
      {children}
    </div>
  );
};

export default CardMetaRow;