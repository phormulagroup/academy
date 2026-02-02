import { useEffect, useState } from "react";
import endpoints from "../../../../utils/endpoints";
import axios from "axios";
import { FieldLabel } from "@puckeditor/core";

export default function ImagePicker({ field, value, onChange }) {
  const [images, setImages] = useState([]);

  useEffect(() => {
    axios.get(endpoints.media.read).then((res) => setImages(res.data));
  }, []);

  return (
    <FieldLabel label={field.label}>
      <div className="grid grid-cols-3 gap-3">
        {images.map((img) => (
          <button
            key={img.id}
            onClick={() => onChange(img.url)}
            className={`border rounded-md overflow-hidden hover:opacity-80 ${value === img.url ? "ring-2 ring-blue-500" : ""}`}
          >
            <img src={img.url} alt={img.alt} className="w-full h-auto" />
          </button>
        ))}
      </div>

      {value && (
        <div className="mt-4">
          <p className="text-sm font-medium mb-1">Selecionada:</p>
          <img src={value} alt="selected" className="w-full rounded-md border" />
        </div>
      )}
    </FieldLabel>
  );
}
