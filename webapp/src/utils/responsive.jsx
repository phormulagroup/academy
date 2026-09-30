/**
 * @function getMarginClasses
 * @description Responsive utility function for determining margin classes based on window width.
 * @param {Object} windowDimension - The window dimension object containing the width.
 * @returns {string} The appropriate margin class based on the window width.
 */

export const getMarginClasses = (windowDimension) => {
  const w = windowDimension.width;
  if (w < 640) {
    return "my-[46px]";
  } else if (w < 1024) {
    return "my-[62px]";
  } else {
    return "my-[72px]";
  }
};
