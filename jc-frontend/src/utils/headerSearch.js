const SEARCHABLE_PATHS = new Set(["/feed", "/explore", "/crew"]);

export const getHeaderSearchTargetPath = (pathname) => (
  SEARCHABLE_PATHS.has(pathname) ? pathname : "/explore"
);
