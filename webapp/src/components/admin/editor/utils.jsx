import classnames from "classnames";

const utils = {
  getClassNameFactory:
    (rootClass, styles, { baseClass = "" } = {}) =>
    (options = {}) => {
      let descendant = false;
      let modifiers = false;

      if (typeof options === "string") {
        descendant = options;
      } else if (typeof options === "object") {
        modifiers = options;
      }

      if (descendant) {
        const style = styles[`${rootClass}-${descendant}`];

        if (style) {
          return baseClass + styles[`${rootClass}-${descendant}`] || "";
        }

        return "";
      } else if (modifiers) {
        const prefixedModifiers = {};

        for (let modifier in modifiers) {
          prefixedModifiers[styles[`${rootClass}--${modifier}`]] = modifiers[modifier];
        }

        const c = styles[rootClass];

        return (
          baseClass +
          classnames({
            [c]: !!c, // only apply the class if it exists
            ...prefixedModifiers,
          })
        );
      } else {
        return baseClass + styles[rootClass] || "";
      }
    },
};
export default utils;
