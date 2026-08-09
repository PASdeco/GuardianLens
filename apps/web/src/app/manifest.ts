import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Guardian Lens",
    short_name: "Guardian Lens",
    description: "Check health products before you trust them.",
    start_url: "/",
    display: "standalone",
    background_color: "#eaf5f7",
    theme_color: "#073f46",
    orientation: "portrait-primary",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }]
  };
}
