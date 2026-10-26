import { Plus } from "lucide-react";

/**
 * Wraps a slot's rendered element so that, while editing, an empty drop zone
 * shows a "drag a widget here" placeholder instead of just collapsing to
 * nothing — makes it obvious the container exists and is droppable.
 *
 * Emptiness is read from Puck's own `hasChildren` modifier class (merged
 * into `className` by Puck's DropZone before invoking this component)
 * rather than counting React children, since Puck may render internal
 * wrapper nodes even when there is nothing meaningful inside the zone.
 */
export function createDropSlot(isEditing, placeholder = "Arraste um widget para aqui") {
  return function DropSlot({ children, className, ...rest }) {
    const isEmpty = !className?.includes("hasChildren");

    return (
      <span className={className} {...rest}>
        {children}
        {isEditing && isEmpty && (
          <span
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              width: "100%",
              minHeight: 100,
              padding: "24px 16px",
              border: "1px dashed var(--puck-color-grey-08, #ccc)",
              borderRadius: 8,
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--puck-color-grey-11, #f0f0f0)",
                color: "var(--puck-color-grey-04, #666)",
              }}
            >
              <Plus size={18} />
            </span>
            <span style={{ fontStyle: "italic", fontSize: 13, color: "var(--puck-color-grey-05, #888)" }}>{placeholder}</span>
          </span>
        )}
      </span>
    );
  };
}
