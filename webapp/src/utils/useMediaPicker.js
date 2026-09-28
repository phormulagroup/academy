import { useState } from "react";
import { mediaSelectionError } from "./fileValidation";

/**
 * @function useMediaPicker
 * @param {object} form - Ant Design form instance.
 * @param {object} fieldTypes - Object specifying accepted file types for each field.
 * @param {function} t - Translation function for error messages.
 * @returns {object} - Object containing media picker state and functions.
 * @description Custom hook for managing media selection in Ant Design forms, including handling selection errors and updating form values. 
 */

export default function useMediaPicker(form, fieldTypes, t) {
  const [target, setTarget] = useState(null);
  const [selectionErrors, setSelectionErrors] = useState({});

  const pathKey = (path) => [].concat(path).join(".");

  function setMediaValue(path, value) {
    form.setFieldValue(path, value);
    setSelectionErrors((prev) => ({ ...prev, [pathKey(path)]: null }));
    form.validateFields([path]).catch(() => {});
  }

  function openMedia(key, index = null, subField = null) {
    setTarget({ key, path: index === null ? key : [key, index, subField] });
  }

  function closeMedia(res) {
    if (res && target) {
      const value = res[target.key];
      const error = mediaSelectionError(target.key, value, fieldTypes, t);
      if (error)
        setSelectionErrors((prev) => ({ ...prev, [pathKey(target.path)]: error }));
      else setMediaValue(target.path, value);
    }
    setTarget(null);
  }

  return {
    mediaKey: target?.key ?? null,
    isOpenMedia: target !== null,
    openMedia,
    closeMedia,
    setMediaValue,
    // Erro do último ficheiro escolhido para o campo (path como em Form: "img" ou ["items", 0, "file"])
    selectionError: (path) => selectionErrors[pathKey(path)] || null,
    resetSelectionErrors: () => setSelectionErrors({}),
  };
}
