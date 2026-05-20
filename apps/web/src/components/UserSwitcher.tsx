import { useEffect, useState } from "react";
import {
  api,
  getCurrentUserId,
  setCurrentUserId,
  type User,
} from "../lib/api";

export function UserSwitcher() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentId, setCurrentId] = useState<string>(getCurrentUserId());

  useEffect(() => {
    api
      .listUsers()
      .then((r) => setUsers(r.users))
      .catch(() => {
        // Best-effort: leave the switcher empty.
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    setCurrentUserId(next);
    setCurrentId(next);
    // Simplest correct behavior per spec: reload so any cached state clears.
    window.location.reload();
  };

  return (
    <div className="user-switcher">
      <label htmlFor="user-select" className="muted">
        Signed in as
      </label>
      <select id="user-select" value={currentId} onChange={handleChange}>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
        {users.length === 0 && <option value={currentId}>{currentId}</option>}
      </select>
    </div>
  );
}
