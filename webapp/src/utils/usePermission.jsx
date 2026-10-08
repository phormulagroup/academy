import { useContext } from "react";
import { Context } from "./context";
import { ADMIN_ROLE_ID } from "./roles";

// O Admin tem sempre acesso total e nunca consulta a lista de permissões (mesma convenção do servidor,
// ver server/utils/permissions.js). Isto só decide o que se mostra: o servidor valida sempre cada pedido.
export function usePermission(resource) {
	const { user, permissions } = useContext(Context);

	if (Number(user?.id_role) === ADMIN_ROLE_ID) return { canCreate: true, canRead: true, canUpdate: true, canDelete: true };

	const row = permissions?.find((p) => p.resource === resource);
	return { canCreate: !!row?.can_create, canRead: !!row?.can_read, canUpdate: !!row?.can_update, canDelete: !!row?.can_delete };
}
