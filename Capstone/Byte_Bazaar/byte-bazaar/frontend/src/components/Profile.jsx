import React, { useState } from "react";
import { api } from "../lib/api";
import { Avatar, PhotoPicker, uploadAvatar } from "./ForumMedia";
export default function Profile({ user, setUser, refresh }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [pickerKey, setPickerKey] = useState(0);
  async function change(action, message) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setUser(await action());
      await refresh();
      setNotice(message);
      setPickerKey((k) => k + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="profile-settings">
      <div className="profile-heading">
        <Avatar
          userId={user.id}
          username={user.username}
          version={user.avatarVersion}
        />
        <div>
          <h2>Forum profile</h2>
          <b>@{user.username}</b>
          <p>Your username and avatar appear on your topics and replies.</p>
        </div>
      </div>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const username = new FormData(e.currentTarget).get("username");
          change(
            () => api("/profile", "PUT", { username }),
            "Username updated.",
          );
        }}
      >
        <label>
          Username
          <input
            name="username"
            defaultValue={user.username}
            key={user.username}
            minLength={3}
            maxLength={32}
            pattern="[A-Za-z][A-Za-z0-9_]{2,31}"
            autoComplete="username"
            required
          />
        </label>
        <small>
          3–32 characters. Start with a letter; use letters, numbers and
          underscores. Usernames are unique regardless of capitalization.
        </small>
        <button className="dark" disabled={busy}>
          Save username
        </button>
      </form>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const file = e.currentTarget.elements.avatar.files[0];
          if (!file) {
            setError("Choose an avatar first.");
            return;
          }
          change(() => uploadAvatar(file), "Avatar updated.");
        }}
      >
        <PhotoPicker key={pickerKey} avatar />
        <div className="profile-buttons">
          <button className="dark" disabled={busy}>
            Upload avatar
          </button>
          {user.avatarVersion > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                change(
                  () => api("/profile/avatar", "DELETE"),
                  "Avatar removed.",
                )
              }
            >
              Remove avatar
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
