// Import Dependencies
import PropTypes from "prop-types";
import { useEffect, useState } from "react";

// ----------------------------------------------------------------------

export function PreviewImg({ file, src, alt, ...rest }) {
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    let url = null;
    if (file) {
      try {
        url = URL.createObjectURL(file);
      } catch (err) {
        console.error(err);
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviewUrl(url);

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [file]);

  return (
    <img
      src={previewUrl || src}
      onLoad={() => previewUrl && URL.revokeObjectURL(previewUrl)}
      alt={alt}
      {...rest}
    />
  );
}

PreviewImg.propTypes = {
  file: PropTypes.object,
  src: PropTypes.string,
  alt: PropTypes.string,
};
