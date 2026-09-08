export const revokeImagePreview = (image) => {
  if (image?.previewUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(image.previewUrl);
  }
};

export const revokePlacePreviews = (places) => {
  places.forEach((place) => (place.images || []).forEach(revokeImagePreview));
};
