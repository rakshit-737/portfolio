import { ImageResponse } from "next/og";
import { hero, site } from "@/content";

export const dynamic = "force-static";
export const alt = site.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Rendered at build time (static export) on the site's token palette.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: 80,
          backgroundColor: "#101418",
          color: "#E8EAED",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 96,
            height: 6,
            backgroundColor: "#E0A83C",
            marginBottom: 40,
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 84,
            fontWeight: 800,
            letterSpacing: -2,
            lineHeight: 1.05,
          }}
        >
          {hero.name}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 34,
            color: "#98A2AD",
          }}
        >
          {hero.role}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 48,
            fontSize: 24,
            color: "#7FB4D9",
          }}
        >
          verified: builds end-to-end · tested in CI · reproducible
        </div>
      </div>
    ),
    { ...size },
  );
}
