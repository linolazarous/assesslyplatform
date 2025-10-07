import React, { useState, useEffect } from "react";

// Example of a “backend-like” local function
async function createAssessment(data) {
  // This could later call a cloud function or local API
  return new Promise((resolve) => {
    setTimeout(() => resolve({ success: true, id: Date.now(), ...data }), 800);
  });
}

function App() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");

  useEffect(() => {
    document.title = "Assessly | Dashboard";
  }, []);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setLoading(true);
    const newAssessment = await createAssessment({ title });
    setAssessments((prev) => [newAssessment, ...prev]);
    setTitle("");
    setLoading(false);
  };

  return (
    <div
      style={{
        fontFamily: "Inter, sans-serif",
        padding: "2rem",
        maxWidth: "600px",
        margin: "auto",
      }}
    >
      <h1 style={{ color: "#3f51b5", textAlign: "center" }}>
        Assessly Dashboard
      </h1>

      <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem" }}>
        <input
          type="text"
          placeholder="Enter assessment title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            flex: 1,
            padding: "0.5rem",
            border: "1px solid #ccc",
            borderRadius: "8px",
          }}
        />
        <button
          onClick={handleCreate}
          disabled={loading}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#3f51b5",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Creating..." : "Create"}
        </button>
      </div>

      <ul style={{ marginTop: "2rem", listStyle: "none", padding: 0 }}>
        {assessments.map((a) => (
          <li
            key={a.id}
            style={{
              background: "#f5f5f5",
              margin: "0.5rem 0",
              padding: "0.75rem",
              borderRadius: "8px",
            }}
          >
            {a.title}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
