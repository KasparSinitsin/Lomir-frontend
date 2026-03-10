import React from "react";

const CardMetaItem = ({
  icon: Icon,
  children,
  tone = "default",
  className = "",
  nowrap = false,
}) => {
  const toneClass =
    tone === "muted" ? "text-base-content/50" : "text-base-content/60";

  return (
    <div className={`flex items-start gap-1 min-w-0 ${className}`}>
      {Icon && (
        <Icon size={10} className={`${toneClass} shrink-0 mt-[3px]`} />
      )}
      <span
  className={`${toneClass} leading-tight ${
    nowrap ? "whitespace-nowrap" : "break-words"
  }`}
>
        {children}
      </span>
    </div>
  );
};

export default CardMetaItem;