export default function HomePage() {
  return (
    <main
      style={{
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        maxWidth: 640,
        margin: "0 auto",
        padding: "64px 20px",
        lineHeight: 1.5,
      }}
    >
      <p style={{ letterSpacing: "0.16em", textTransform: "uppercase", fontSize: 13 }}>
        EaseSell
      </p>
      <h1 style={{ fontSize: 40, lineHeight: 1.1, margin: "8px 0 16px" }}>
        The iPhone app lists the item.
      </h1>
      <p>
        This service names a photo with Google Cloud Vision and counts the two
        free listings each month. A subscription lifts that cap. Photos and
        prices stay on the phone.
      </p>
    </main>
  );
}
