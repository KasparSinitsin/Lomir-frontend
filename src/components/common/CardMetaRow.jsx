import React from "react";

const CardMetaRow = ({ children, className = "" }) => {
  return (
    <div className={`flex flex-wrap gap-x-3 text-xs mt-[1px] ${className}`}>
      {children}
    </div>
  );
};

export default CardMetaRow;