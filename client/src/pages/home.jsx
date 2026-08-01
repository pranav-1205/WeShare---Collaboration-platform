import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Home() {
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();

  const createNote = async () => {
    if (!userName.trim()) {
      alert("Please enter your name");
      return;
    }

    try {
      const res = await axios.post("http://localhost:3001/api/notes", {
        title: "Untitled Note",
        owner: userName,
      });

      navigate(`/note/${res.data._id}`, {
        state: { userName },
      });
    } catch (err) {
      alert("Failed to create note");
    }
  };

  const joinNote = () => {
    if (!userName.trim()) {
      alert("Please enter your name");
      return;
    }

    navigate("/join", {
      state: { userName },
    });
  };

  return (
    <div className="page-center">
      <div className="card text-center">
        <h1>Collaborative Notes</h1>

        <input
          type="text"
          placeholder="Enter your name"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
        />

        <div className="mt-10">
          <button onClick={createNote}>
            Create New Note
          </button>
        </div>

        <div className="mt-10">
          <button className="secondary" onClick={joinNote}>
            Join Existing Note
          </button>
        </div>
      </div>
    </div>
  );
}
