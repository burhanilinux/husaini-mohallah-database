import { useEffect, useState } from "react";
import { getPhotoUrl } from "./storage.js";

// Returns a displayable (signed) URL for a stored photo value, or null while loading.
export function usePhotoUrl(value) {
  const [state, setState] = useState({ value: null, url: null });
  useEffect(function () {
    if (!value) return undefined;
    let active = true;
    getPhotoUrl(value).then(function (url) {
      if (active) setState({ value: value, url: url || value });
    });
    return function () { active = false; };
  }, [value]);
  return value && state.value === value ? state.url : null;
}
