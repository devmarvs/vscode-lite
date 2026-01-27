import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import clsx from 'clsx';

type CodexIconProps = {
  iconUrl?: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
};

export const CodexIcon: React.FC<CodexIconProps> = ({ iconUrl, size = 24, className, strokeWidth = 1.5 }) => {
  const [imageFailed, setImageFailed] = useState(false);

  if (!iconUrl || imageFailed) {
    return <Sparkles size={size} strokeWidth={strokeWidth} className={className} />;
  }

  return (
    <img
      src={iconUrl}
      alt="Codex"
      width={size}
      height={size}
      className={clsx('rounded-sm', className)}
      onError={() => setImageFailed(true)}
      draggable={false}
    />
  );
};
