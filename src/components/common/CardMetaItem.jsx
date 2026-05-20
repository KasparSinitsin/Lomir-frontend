import React from "react";

const CardMetaItem = ({
  icon: Icon,
  children,
  tone = "default",
  className = "",
  nowrap = false,
  iconSize = 10,
}) => {
  const toneClass =
    tone === "muted" ? "text-base-content/50" : "text-base-content/60";

  return (
    <div className={`flex min-w-0 max-w-[calc(100%-1.5rem)] flex-[0_1_auto] items-center gap-1 overflow-hidden ${className}`}>
      {Icon && <Icon size={iconSize} className={`${toneClass} shrink-0`} />}
      <span
        className={`min-w-0 truncate ${toneClass} leading-[1.05] ${
          nowrap ? "whitespace-nowrap" : ""
        }`}
      >
        {children}
      </span>
    </div>
  );
};

export default CardMetaItem;
