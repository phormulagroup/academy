/**
 * @function getPaddingClasses
 * @description Responsive utility function for determining padding classes based on window width.
 * @param {Object} windowDimension - The window dimension object containing the width.
 * @returns {string} The appropriate padding class based on the window width.
 */

export const getPaddingClasses = (windowDimension) => {
  const w = windowDimension.width;
  if (w <= 549) {
    return "px-[24px]";
  } else if (w >= 550 && w <= 695) {
    return "px-[50px]";
  } else if (w >= 1536 && w <= 1550) {
    return "px-[74px]";
  } else if (w >= 1551 && w <= 1579) {
    return "px-[74px]";
  } else if (w >= 1580 && w <= 1599) {
    return "px-[50px]";
  } else if (w >= 1600 && w <= 1620) {
    return "px-[50px]";
  } else if (w >= 1280 && w <= 1380) {
    return "px-[50px]";
  } else if (w >= 1024 && w <= 1090) {
    return "px-[50px]";
  } else if (w >= 768 && w <= 825) {
    return "px-[35px]";
  } else if (w >= 1091) {
    return "px-[24px]";
  } else {
    return "px-0";
  }
};

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
