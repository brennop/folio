import {
  useFloating,
  offset,
  flip,
  shift,
  useHover,
  useDismiss,
  useRole,
  useInteractions,
  useClientPoint,
  FloatingPortal,
} from "@floating-ui/react";
import { useState } from "react";

export default function Tooltip({ children, content }) {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: "top",
    middleware: [offset(10), flip(), shift()],
  });

  const hover = useHover(context);
  const clientPoint = useClientPoint(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    clientPoint,
    dismiss,
    role,
  ]);

  return (
    <>
      <span ref={refs.setReference} {...getReferenceProps()}>
        {children}
      </span>
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className={`bg-zinc-200 text-zinc-800 text-sm z-50 font-mono`}
          >
            {content}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
