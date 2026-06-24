import { ImageResponse } from "next/og";

// Dynamically generated placeholder OG/Twitter card (1200×630), on-brand.
// Next auto-wires this to openGraph.images and twitter.images.
export const alt = "ChadWallet — find the next 100x memecoins";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#020818",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "18px",
              backgroundColor: "#11FE9C",
            }}
          />
          <div style={{ fontSize: "40px", fontWeight: 900 }}>ChadWallet</div>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            fontSize: "92px",
            fontWeight: 900,
            lineHeight: 1.02,
            letterSpacing: "-0.04em",
          }}
        >
          Find the next&nbsp;<span style={{ color: "#11FE9C" }}>100x</span>
          &nbsp;memecoins
        </div>
        <div
          style={{
            marginTop: "36px",
            fontSize: "32px",
            color: "#8A93A6",
            fontWeight: 500,
          }}
        >
          Social-first, non-custodial Solana memecoin wallet.
        </div>
      </div>
    ),
    size,
  );
}
