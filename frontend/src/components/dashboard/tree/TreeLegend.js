export default function TreeLegend({ colorBy, colorByPalette }) {
  if (!colorBy || colorBy === "None" || !colorByPalette) return null;

  const entries = Object.entries(colorByPalette);
  if (entries.length === 0) return null;

  return (
    <div
      style={{
        padding: "8px 12px",
        borderBottom: "1px solid #ddd",
        background: "#f9f9f9",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "6px",
      }}
    >
      <span
        style={{
          fontSize: "12px",
          color: "#555",
          fontWeight: 600,
          marginRight: "4px",
        }}
      >
        {colorBy.replace(/_/g, " ")}:
      </span>
      {entries.map(([value, color]) => (
        <div
          key={value}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            background: "#fff",
            border: "1px solid #e0e0e0",
            borderRadius: "4px",
            padding: "2px 8px 2px 5px",
            fontSize: "12px",
            color: "#333",
          }}
        >
          <div
            style={{
              width: "11px",
              height: "11px",
              borderRadius: "50%",
              background: color,
              border: "1px solid #aaa",
              flexShrink: 0,
            }}
          />
          {colorBy === "Cluster" && value !== "Singleton" && !isNaN(value)
            ? `Cluster ${value}`
            : value}
        </div>
      ))}
    </div>
  );
}
