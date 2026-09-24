"use client";

import dayjs from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

export const DISPLAY_DATE_FORMAT = "DD/MM/YYYY";
const ISO = "YYYY-MM-DD";

interface DateFieldProps {
  /** ISO `YYYY-MM-DD`, or "" when empty. */
  value: string;
  onChange: (iso: string) => void;
  label: string;
  min?: string;
  max?: string;
  error?: boolean;
  helperText?: React.ReactNode;
}

/** Date input that always shows DD/MM/YYYY, whatever the browser locale; stores ISO dates. */
export default function DateField({ value, onChange, label, min, max, error, helperText }: DateFieldProps) {
  const parsed = value ? dayjs(value, ISO) : null;
  return (
    <DatePicker
      value={parsed && parsed.isValid() ? parsed : null}
      onChange={(d) => onChange(d && d.isValid() ? d.format(ISO) : "")}
      format={DISPLAY_DATE_FORMAT}
      minDate={min ? dayjs(min, ISO) : undefined}
      maxDate={max ? dayjs(max, ISO) : undefined}
      slotProps={{
        textField: { size: "small", fullWidth: true, error, helperText, "aria-label": label },
        field: { clearable: true },
      }}
    />
  );
}
