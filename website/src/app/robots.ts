import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/salir/"],
      },
    ],
    sitemap: "https://www.notebooks.com.ar/sitemap.xml",
  };
}
