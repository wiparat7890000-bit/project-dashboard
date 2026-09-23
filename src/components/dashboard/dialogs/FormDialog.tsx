"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

interface FormDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  maxWidth?: "xs" | "sm" | "md";
  children: React.ReactNode;
}

/** Shared dialog shell: title with close button, scrollable body, Cancel/Save footer. */
export default function FormDialog({ open, title, onClose, onSubmit, submitLabel = "Save", maxWidth = "sm", children }: FormDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={maxWidth}
      slotProps={{
        paper: { sx: { borderRadius: 4 } },
        backdrop: { sx: { backdropFilter: "blur(4px)" } },
      }}
    >
      <DialogTitle className="flex items-center justify-between !text-lg !font-bold text-slate-800">
        {title}
        <IconButton aria-label="Close" onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent className="space-y-4 !pt-1">{children}</DialogContent>
      <DialogActions className="gap-2 !px-6 !pb-5">
        <Button fullWidth variant="outlined" color="inherit" onClick={onClose} className="!border-slate-200 !text-slate-600">
          Cancel
        </Button>
        {onSubmit && (
          <Button fullWidth variant="contained" onClick={onSubmit}>
            {submitLabel}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export function FieldLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-600">
      <span>{children}</span>
      {action}
    </div>
  );
}

export function LinkAction({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="text-[10px] font-medium normal-case tracking-normal text-sky-500 hover:text-sky-700">
      {children}
    </button>
  );
}
