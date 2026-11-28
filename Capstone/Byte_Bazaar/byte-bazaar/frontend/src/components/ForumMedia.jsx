import React, { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

export function Avatar({
  userId,
  username = "Member",
  version = 0,
  small = false,
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [userId, version]);
  return (
    <span className={"forum-avatar " + (small ? "small" : "")}>
      {userId && version > 0 && !failed ? (
        <img
          src={`/api/profiles/${userId}/avatar?v=${version}`}
          alt={`${username}'s avatar`}
          onError={() => setFailed(true)}
        />
      ) : (
        username.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}
export function PhotoPicker({
  avatar = false,
  name = avatar ? "avatar" : "pictures",
  maxFiles = 6,
}) {
  const [files, setFiles] = useState([]),
    [previews, setPreviews] = useState([]),
    [error, setError] = useState("");
  const input = useRef(null);
  useEffect(() => {
    if (!URL.createObjectURL) return;
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [files]);
  return (
    <div className="photo-picker">
      <label>
        {avatar ? "Avatar (optional)" : "Attach photos (optional)"}
        <input
          ref={input}
          type="file"
          name={name}
          accept="image/jpeg,image/png"
          multiple={!avatar}
          onChange={(e) => {
            const next = Array.from(e.target.files);
            const message =
              next.length > (avatar ? 1 : maxFiles)
                ? `Choose up to ${avatar ? 1 : maxFiles} images`
                : next.some(
                      (f) =>
                        !["image/jpeg", "image/png"].includes(f.type) ||
                        f.size > (avatar ? 2 : 5) * 1024 * 1024,
                    )
                  ? `Choose JPEG/PNG images up to ${avatar ? 2 : 5} MB each`
                  : "";
            e.target.setCustomValidity(message);
            setError(message);
            setFiles(message ? [] : next);
          }}
        />
      </label>
      <small>
        {avatar
          ? "JPEG or PNG, up to 2 MB and 4 megapixels. Cropped to a square."
          : `JPEG or PNG, up to ${maxFiles} photos, 5 MB and 20 megapixels each.`}
      </small>
      {error && <p role="alert">{error}</p>}
      {previews.length > 0 && (
        <div className="selected-photos">
          {previews.map((src, i) => (
            <img key={src} src={src} alt={"Selected " + files[i]?.name} />
          ))}
        </div>
      )}
      {files.length > 0 && (
        <button
          type="button"
          onClick={() => {
            input.current.value = "";
            input.current.setCustomValidity("");
            setFiles([]);
            setError("");
          }}
        >
          Clear selected {avatar ? "avatar" : "photos"}
        </button>
      )}
    </div>
  );
}
export async function uploadAvatar(file) {
  const data = new FormData();
  data.append("file", file);
  return api("/profile/avatar", "POST", data);
}
export async function uploadPostPhotos(topicId, replyId, files) {
  if (!files?.length) return;
  const data = new FormData();
  files.forEach((f) => data.append("files", f));
  return api(
    `/topics/${topicId}${replyId ? `/replies/${replyId}` : ""}/photos`,
    "POST",
    data,
  );
}
export function PostPhotos({ topicId, replyId, user, authorId }) {
  const path = `/topics/${topicId}${replyId ? `/replies/${replyId}` : ""}/photos`;
  const [photos, setPhotos] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [pickerKey, setPickerKey] = useState(0);
  useEffect(() => {
    let active = true;
    api(path)
      .then((rows) => {
        if (active) setPhotos(rows);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [path]);
  const editable = user && (user.id === authorId || user.admin);
  async function change(action) {
    setBusy(true);
    setError("");
    try {
      await action();
      setPhotos(await api(path));
      setPickerKey((k) => k + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="post-photos">
      {error && (
        <p role="alert" className="alert">
          {error}
        </p>
      )}
      <div className="post-photo-grid">
        {photos.map((id) => (
          <figure key={id}>
            <a href={"/api" + path + "/" + id} target="_blank" rel="noreferrer">
              <img
                src={"/api" + path + "/" + id}
                alt="Forum post attachment"
                loading="lazy"
              />
            </a>
            {editable && (
              <button
                type="button"
                disabled={busy}
                onClick={() => change(() => api(path + "/" + id, "DELETE"))}
              >
                Remove photo
              </button>
            )}
          </figure>
        ))}
      </div>
      {editable && photos.length < 6 && (
        <details className="add-post-photos">
          <summary>Add photos to this post</summary>
          <PhotoPicker
            key={pickerKey}
            maxFiles={6 - photos.length}
            name={"postPhotos-" + (replyId || "topic")}
          />
          <button
            type="button"
            className="dark"
            disabled={busy}
            onClick={(e) => {
              const files = Array.from(
                e.currentTarget.parentElement.querySelector("input[type=file]")
                  .files,
              );
              if (!files.length) {
                setError("Choose a photo first.");
                return;
              }
              change(() => uploadPostPhotos(topicId, replyId, files));
            }}
          >
            {busy ? "Uploading…" : "Upload photos"}
          </button>
        </details>
      )}
    </div>
  );
}
