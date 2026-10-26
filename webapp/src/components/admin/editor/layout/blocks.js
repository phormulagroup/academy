import { config, DRAWER_ICONS } from "../config";

export const ROOT_ZONE = "root:default-zone";
export const blockLabel = (type) => config.components[type]?.label || type;
export const blockIcon = (type) => DRAWER_ICONS[type] || "square";
