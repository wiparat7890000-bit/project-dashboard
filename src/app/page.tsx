import AppBar from "@mui/material/AppBar";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import DashboardIcon from "@mui/icons-material/Dashboard";

const stats = [
  { label: "Active projects", value: "12" },
  { label: "Open tasks", value: "48" },
  { label: "Completed this week", value: "23" },
];

export default function Home() {
  return (
    <>
      <AppBar position="static" elevation={0}>
        <Toolbar className="gap-2">
          <DashboardIcon />
          <Typography variant="h6" component="h1">
            Project Dashboard
          </Typography>
        </Toolbar>
      </AppBar>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <Typography variant="h4" component="h2" className="font-semibold">
            Welcome
          </Typography>
          <Chip label="Next.js" />
          <Chip label="TypeScript" />
          <Chip label="Tailwind CSS" />
          <Chip label="MUI" color="primary" />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <Card key={s.label} variant="outlined">
              <CardContent>
                <Typography color="text.secondary" variant="body2">
                  {s.label}
                </Typography>
                <Typography variant="h4" className="mt-1 font-bold">
                  {s.value}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 flex gap-3">
          <Button variant="contained">New project</Button>
          {/* Tailwind utilities override MUI thanks to CSS layers */}
          <Button variant="outlined" className="rounded-full">
            View all
          </Button>
        </div>
      </main>
    </>
  );
}
