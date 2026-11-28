import React, { useEffect, useState } from "react";
import { api } from "../lib/api";

export async function uploadPictures(id, files) {
  if (!files?.length) return;
  const body = new FormData();
  for (const file of files) body.append("files", file);
  await api(`/listings/${id}/photos`, "POST", body);
}

export function PictureInput() {
  return (
    <label>
      Pictures (up to six JPEG/PNG files, 5 MB each)
      <input
        name="pictures"
        type="file"
        multiple
        accept="image/jpeg,image/png"
      />
    </label>
  );
}

export default function ListingPhotos({
  id,
  editable = false,
  compact = false,
}) {
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => api(`/listings/${id}/photos`).then(setPhotos);
  useEffect(() => {
    let active = true;
    api(`/listings/${id}/photos`)
      .then((p) => {
        if (active) setPhotos(p);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id]);
  async function change(action) {
    setBusy(true);
    setError("");
    try {
      await action();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={compact ? "listing-thumbnail" : "listing-photos"}>
      {(compact ? photos.slice(0, 1) : photos).map((photo) => (
        <div key={photo}>
          <img
            src={`/api/listings/${id}/photos/${photo}`}
            alt={
              compact
                ? "Listing picture"
                : `Listing picture ${photos.indexOf(photo) + 1}`
            }
          />
          {editable && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                change(() => api(`/listings/${id}/photos/${photo}`, "DELETE"))
              }
            >
              Remove picture
            </button>
          )}
        </div>
      ))}
      {editable && (
        <label>
          Add pictures
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png"
            disabled={busy}
            onChange={(e) => {
              const files = Array.from(e.target.files);
              e.target.value = "";
              change(() => uploadPictures(id, files));
            }}
          />
        </label>
      )}
      {!compact && error && (
        <p role="alert" className="alert">
          {error}
        </p>
      )}
    </div>
  );
}
