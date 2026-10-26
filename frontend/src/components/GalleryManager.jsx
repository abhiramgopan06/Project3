import { useEffect, useState } from "react";
import api from "../api";

export default function GalleryManager({ eventId, showUploader = true, refreshKey = 0 }) {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function loadImages() {
    try {
      const response = await api.get("/events/event-images/", { params: { event: eventId } });
      setImages(response.data);
    } catch (error) {
      setImages([]);
    }
  }
  useEffect(
    function () {
      if (eventId) {
        loadImages();
      }
    },
    [eventId, refreshKey]
  );
  async function handleFilesSelected(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) {
      return;
    }

    setUploading(true);
    setUploadError("");
    let failed = 0;

    for (const file of files) {
      const data = new FormData();
      data.append("event", eventId);
      data.append("image", file);
      try {
        await api.post("/events/event-images/", data);
      } catch (error) {
        failed = failed + 1;
      }
    }

    if (failed > 0) {
      setUploadError(failed + " photo(s) could not be uploaded.");
    }
    setUploading(false);
    e.target.value = "";
    loadImages();
  }

  async function handleRemove(imageId) {
    await api.delete("/events/event-images/" + imageId + "/");
    loadImages();
  }
  if (!showUploader && images.length === 0) {
    return null;
  }

  return (
    <div className="gallery-manager">
      <label className="field-label">{showUploader ? "More photos (gallery)" : "Saved gallery photos"}</label>

      {images.length > 0 && (
        <div className="gallery-thumbs">
          {images.map(function (image) {
            return (
              <div className="gallery-thumb" key={image.id}>
                <img src={image.image_url} alt="Event gallery" />
                <button
                  type="button"
                  className="gallery-thumb-remove"
                  title="Remove this photo"
                  onClick={() => handleRemove(image.id)}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showUploader && (
        <>
          <input type="file" accept="image/*" multiple disabled={uploading} onChange={handleFilesSelected} />
          {uploading && <small>Uploading...</small>}
          {uploadError && <div className="error">{uploadError}</div>}
        </>
      )}
    </div>
  );
}
