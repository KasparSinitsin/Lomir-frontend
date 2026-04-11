import React from "react";

const DemoAvatarOverlay = ({
  textClassName = "text-[10px]",
  textTranslateClassName = "-translate-y-[2px]",
}) => {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-black/55 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center pb-[2px]">
        <span
          className={`${textTranslateClassName} font-semibold uppercase tracking-[0.12em] leading-none text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)] ${textClassName}`}
        >
          DEMO
        </span>
      </div>
    </div>
  );
};

export default DemoAvatarOverlay;
