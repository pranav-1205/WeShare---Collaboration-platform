import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../auth/useAuth";

export default function Join() {
  const [link, setLink] = useState("");
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user } = useAuth();

  const userName = state?.userName || user?.username;

  if (!userName) {
    return (
      <div className="join-page">
        <div className="join-page-card glass-surface">
          <h2>No identity found</h2>
          <p>Go back to the home page and enter your name first.</p>
          <button className="btn btn-primary" onClick={() => navigate("/")}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const join = () => {
    const noteId = link.split("/").pop();
    if (!link.trim() || !noteId) {
      toast.error("Paste a valid note link");
      return;
    }

    navigate(`/note/${noteId}`, {
      state: { userName },
    });
  };

  return (
    <div className="join-page">
      <div className="join-page-card glass-surface fade-in-up">
        <div className="join-card-head">
          <h2>Join a Note</h2>
          <p>Paste the shared link to start collaborating</p>
        </div>

        <div className="field">
          <label htmlFor="link">Note link</label>
          <input
            id="link"
            className="input-box"
            placeholder="https://.../note/..."
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && join()}
          />
        </div>

        <button className="btn btn-primary btn-lg" onClick={join}>
          <span className="material-symbols-outlined">arrow_forward</span>
          Join Note
        </button>

        <button className="btn btn-ghost" onClick={() => navigate("/")}>
          <span className="material-symbols-outlined">arrow_back</span>
          Back to Home
        </button>
      </div>
    </div>
  );
}