import React from "react";

interface PageActionBarProps {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
}

export const PageActionBar: React.FC<PageActionBarProps> = ({
  left,
  center,
  right,
}) => {
  return (
    <div className="flex items-center justify-between w-full gap-4 shrink-0">
      <div className="flex items-center gap-2 empty:hidden">{left}</div>
      <div className="flex items-center gap-2 empty:hidden">{center}</div>
      <div className="flex items-center gap-2 empty:hidden">{right}</div>
    </div>
  );
};

export default PageActionBar;
