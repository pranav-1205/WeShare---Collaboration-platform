import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Join() {
  const [link, setLink] = useState("");
  const navigate = useNavigate();
  const { state } = useLocation();

  const userName = state?.userName;

  if (!userName) {
    return <h3 style={{ textAlign: "center" }}>Go back and enter your name</h3>;
  }

  const join = () => {
    const noteId = link.split("/").pop();
    navigate(`/note/${noteId}`, {
      state: { userName }
    });
  };

  return (
    <div style={{ textAlign: "center", marginTop: "120px" }}>
      <h2>Join a Note</h2>

      <input
        placeholder="Paste note link"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        style={{ width: "300px", padding: "10px" }}
      />

      <br /><br />

      <button onClick={join}>Join</button>
    </div>
  );
}
