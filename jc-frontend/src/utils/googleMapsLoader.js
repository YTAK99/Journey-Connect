let mapsPromise;

export const loadGoogleMaps = () => {
  if (globalThis.google?.maps?.places) return Promise.resolve(globalThis.google.maps);
  if (mapsPromise) return mapsPromise;

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return Promise.reject(new Error("VITE_GOOGLE_MAPS_API_KEY is not configured."));

  mapsPromise = new Promise((resolve, reject) => {
    const callbackName = `__jcGoogleMapsReady${Date.now()}`;
    const script = document.createElement("script");
    globalThis[callbackName] = () => {
      delete globalThis[callbackName];
      resolve(globalThis.google.maps);
    };
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&loading=async&callback=${callbackName}`;
    script.async = true;
    script.onerror = () => {
      delete globalThis[callbackName];
      mapsPromise = undefined;
      reject(new Error("Google Maps script failed to load."));
    };
    document.head.appendChild(script);
  });

  return mapsPromise;
};
