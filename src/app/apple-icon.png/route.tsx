import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#101418",
          color: "#E8EAED",
          fontSize: 96,
          fontWeight: 700,
        }}
      >
        <div style={{ display: "flex" }}>R</div>
        <div
          style={{
            display: "flex",
            width: 96,
            height: 10,
            marginTop: 8,
            backgroundColor: "#E0A83C",
          }}
        />
      </div>
    ),
    { width: 180, height: 180 },
  );
}
