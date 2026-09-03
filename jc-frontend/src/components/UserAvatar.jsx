import { useState } from "react";
import { User } from "lucide-react";

export default function UserAvatar({ src, alt = "", className = "", iconClassName = "" }) {
  const [failedSrc, setFailedSrc] = useState(null);

  if (src && failedSrc !== src) {
    return <img src={src} alt={alt} className={className} onError={() => setFailedSrc(src)} />;
  }

  return (
    <span className={`flex items-center justify-center bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300 ${className}`} aria-label={alt || undefined}>
      <User className={iconClassName || "h-1/2 w-1/2"} aria-hidden="true" />
    </span>
  );
}
