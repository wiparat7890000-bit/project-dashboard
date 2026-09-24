"use client";

import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: "light",
    primary: { main: "#0ea5e9", contrastText: "#fff" },
    background: { default: "#f1f5f9" },
    text: { primary: "#1e293b", secondary: "#64748b" },
  },
  typography: {
    fontFamily:
      'var(--font-quicksand), "Quicksand", "SF Thonburi", var(--font-open-sans), "Open Sans", "Helvetica Neue", Arial, sans-serif',
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 12, backgroundColor: "#fff" } } },
    MuiTab: { styleOverrides: { root: { minHeight: 56, fontSize: 14, fontWeight: 600 } } },
    MuiTooltip: {
      // describeChild: tooltips describe their element instead of replacing its accessible name.
      defaultProps: { arrow: true, describeChild: true, enterDelay: 250, enterNextDelay: 100 },
      styleOverrides: {
        tooltip: { backgroundColor: "#1e293b", fontSize: 12, fontWeight: 500, padding: "6px 10px", borderRadius: 8, lineHeight: 1.5 },
        arrow: { color: "#1e293b" },
      },
    },
  },
});

export default theme;
