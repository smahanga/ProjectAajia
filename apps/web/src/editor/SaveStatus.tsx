import type { SaveStatus as SaveStatusValue } from "./useAutoSave";

type Props = { status: SaveStatusValue };

export function SaveStatus({ status }: Props) {
  let text: string;
  let className: string;

  switch (status) {
    case "saving":
      text = "Saving…";
      className = "save-status save-status-saving";
      break;
    case "saved":
      text = "All changes saved";
      className = "save-status save-status-saved";
      break;
    case "error":
      text = "Couldn't save — retrying";
      className = "save-status save-status-error";
      break;
    case "idle":
    default:
      text = "";
      className = "save-status save-status-idle";
  }

  return (
    <div className={className} role="status" aria-live="polite">
      {text}
    </div>
  );
}
