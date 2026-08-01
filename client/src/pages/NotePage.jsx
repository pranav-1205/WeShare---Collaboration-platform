import { useParams, useLocation, useNavigate } from "react-router-dom";
import Editor from "../editor/Editor";
import { useAuth } from "../auth/useAuth";

export default function NotePage() {
  const { noteId } = useParams();
  const { state } = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const userName = state?.userName || user?.username;

  if (!userName) {
    return (
      <div className="join-page">
        <div className="join-page-card glass-surface">
          <h2>Identity required</h2>
          <p>Please start from the home page and enter your name first.</p>
          <button className="btn btn-primary" onClick={() => navigate("/")}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return <Editor noteId={noteId} userName={userName} />;
}