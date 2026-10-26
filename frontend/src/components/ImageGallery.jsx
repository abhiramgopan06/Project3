import { useRef, useState } from "react";

export default function ImageGallery({ images }) {
  const [index, setIndex] = useState(0);
  const dragStartX = useRef(null);
  if (images.length === 0) {
    return (
      <div className="detail-image">
        <div className="image-placeholder big">✦</div>
      </div>
    );
  }
  function goTo(newIndex) {
    const total = images.length;
    if (newIndex < 0) {
      newIndex = total - 1;
    }
    if (newIndex >= total) {
      newIndex = 0;
    }
    setIndex(newIndex);
  }

  function getX(e) {
    if (e.touches && e.touches.length > 0) {
      return e.touches[0].clientX;
    }
    if (e.changedTouches && e.changedTouches.length > 0) {
      return e.changedTouches[0].clientX;
    }
    return e.clientX;
  }

  function handleDragStart(e) {
    dragStartX.current = getX(e);
  }

  function handleDragEnd(e) {
    if (dragStartX.current === null) {
      return;
    }
    const distance = getX(e) - dragStartX.current;
    dragStartX.current = null;
    if (distance > 40) {
      goTo(index - 1);
    } else if (distance < -40) {
      goTo(index + 1);
    }
  }

  return (
    <div className="detail-image gallery">
      <img
        src={images[index].image_url}
        alt="Event"
        draggable="false"
        onMouseDown={handleDragStart}
        onMouseUp={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchEnd={handleDragEnd}
      />


      {images.length > 1 && (
        <>
          <button type="button" className="gallery-arrow left" onClick={() => goTo(index - 1)}>
            ‹
          </button>
          <button type="button" className="gallery-arrow right" onClick={() => goTo(index + 1)}>
            ›
          </button>

          <div className="gallery-dots">
            {images.map(function (image, i) {
              return (
                <span
                  key={i}
                  className={i === index ? "dot active" : "dot"}
                  onClick={() => goTo(i)}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
