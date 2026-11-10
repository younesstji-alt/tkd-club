import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "نادي التايكوندو · Club de Taekwondo",
    short_name: "TKD",
    description: "Attendance & athlete evaluation for a Taekwondo club",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f6fb",
    theme_color: "#1e40af",
    lang: "ar",
    dir: "rtl",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
