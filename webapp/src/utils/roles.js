export const ADMIN_ROLE_ID = 1;
export const GESTOR_ROLE_ID = 4;

// Admin ou Gestor
export const hasFullAccess = (user) => [ADMIN_ROLE_ID, GESTOR_ROLE_ID].includes(Number(user?.id_role));
