import { useNavigate } from "react-router";

const chipClass =
  "inline-flex items-center rounded-lg border border-teal-200/70 bg-teal-50/65 px-2.5 py-1 text-xs font-medium text-teal-700 backdrop-blur-sm transition dark:border-teal-800/60 dark:bg-teal-950/35 dark:text-teal-200";

export function TagChip({ tag, clickable = true, onClick }) {
  const navigate = useNavigate();

  const handleClick = (event) => {
    event.stopPropagation();
    if (onClick) onClick(tag);
    else navigate(`/explore?q=${encodeURIComponent(tag)}`);
  };

  if (!clickable) return <span className={chipClass}>{tag}</span>;

  return (
    <button type="button" onClick={handleClick} className={`${chipClass} hover:border-teal-300 hover:bg-teal-100/75 hover:text-teal-800 dark:hover:bg-teal-900/55`}>
      {tag}
    </button>
  );
}

export default function TagChips({ tags = [], clickable = true, className = "" }) {
  if (!tags.length) return null;
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag) => <TagChip key={tag} tag={tag} clickable={clickable} />)}
    </div>
  );
}
