import { useParams, useLocation } from "react-router-dom";
import Editor from "../editor/Editor";

export default function NotePage() {
  const { noteId } = useParams();
  const { state } = useLocation();

  const userName = state?.userName;

  if (!userName) {
    return (
      <h3 style={{ textAlign: "center" }}>
        Please start from Home and enter your name
      </h3>
    );
  }

  return <Editor noteId={noteId} userName={userName} />;
}
