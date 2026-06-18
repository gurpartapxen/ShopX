// Image helpers — request right-sized, optimized images from Cloudinary.
//
// Cloudinary lets you transform an image on the fly by inserting directives
// into the URL right after "/upload/". We add:
//   f_auto  → best format for the browser (WebP/AVIF) instead of the original JPEG
//   q_auto  → automatic quality compression
//   w_<n>   → resize to the width we actually render (a grid card never needs a 2000px image)
//
// Falls back to the original URL untouched for non-Cloudinary sources.

export function cloudinaryThumb(url, width = 400) {
    if (typeof url !== "string" || !url.includes("/upload/")) return url;
    // Don't double-transform if directives are already present
    if (/\/upload\/[^/]*(f_auto|q_auto|w_\d)/.test(url)) return url;
    return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
}
