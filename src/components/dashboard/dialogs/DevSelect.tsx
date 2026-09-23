"use client";

import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { useDashboard } from "../DashboardContext";

const ADD_PREFIX = "\u0000add:";
const filter = createFilterOptions<string>();

/**
 * Multi-select for developers. Typing a new name offers to add it to the
 * master list; each option has a delete button to remove it from the list.
 */
export default function DevSelect({ value, onChange }: { value: string[]; onChange: (devs: string[]) => void }) {
  const { data, setDevList } = useDashboard();

  const handleChange = (next: string[]) => {
    const names = [...new Set(next.map((v) => (v.startsWith(ADD_PREFIX) ? v.slice(ADD_PREFIX.length) : v).trim()).filter(Boolean))];
    const newcomers = names.filter((n) => !data.devList.includes(n));
    if (newcomers.length) setDevList([...data.devList, ...newcomers]);
    onChange(names);
  };

  const removeFromList = (name: string) => {
    if (!confirm(`ลบ "${name}" ออกจากรายชื่อ Dev. ทั้งหมด?`)) return;
    setDevList(data.devList.filter((d) => d !== name));
    onChange(value.filter((d) => d !== name));
  };

  return (
    <Autocomplete
      multiple
      freeSolo
      disableCloseOnSelect
      size="small"
      options={data.devList}
      value={value}
      onChange={(_, next) => handleChange(next)}
      filterOptions={(options, params) => {
        const filtered = filter(options, params);
        const input = params.inputValue.trim();
        if (input && !options.includes(input)) filtered.push(ADD_PREFIX + input);
        return filtered;
      }}
      getOptionLabel={(o) => (o.startsWith(ADD_PREFIX) ? o.slice(ADD_PREFIX.length) : o)}
      renderOption={(props, option, { selected }) => {
        const { key, ...rest } = props;
        if (option.startsWith(ADD_PREFIX)) {
          return (
            <li key={key} {...rest} className={`${rest.className ?? ""} !text-sky-600`}>
              ＋ เพิ่ม &quot;{option.slice(ADD_PREFIX.length)}&quot;
            </li>
          );
        }
        return (
          <li key={key} {...rest} className={`${rest.className ?? ""} group !py-0.5`}>
            <Checkbox size="small" checked={selected} sx={{ p: 0.5, mr: 1 }} />
            <span className="flex-1 text-sm">{option}</span>
            <IconButton
              size="small"
              aria-label={`Remove ${option} from list`}
              title="ลบออกจากรายชื่อ"
              onClick={(e) => {
                e.stopPropagation();
                removeFromList(option);
              }}
              className="opacity-0 group-hover:opacity-100 hover:!text-red-500"
            >
              <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </li>
        );
      }}
      renderInput={(params) => <TextField {...params} placeholder={value.length ? "" : "เลือก Dev..."} />}
      slotProps={{ chip: { color: "primary", size: "small" } }}
    />
  );
}
