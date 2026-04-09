import React from "react";

const DemoAvatarOverlay = ({
  textClassName = "text-[10px]",
  textTranslateClassName = "-translate-y-[2px]",
}) => {
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 h-[30%] bg-black/35 flex items-center justify-center pointer-events-none">
      <span
        className={`${textTranslateClassName} font-semibold uppercase tracking-[0.12em] leading-none text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)] ${textClassName}`}
      >
        Demo
      </span>
    </div>
  );
};

export default DemoAvatarOverlay;
