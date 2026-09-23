import { toISODate } from "./utils";
import type { Project, Task } from "./types";

export function createSampleData(): { projects: Project[]; tasks: Task[] } {
  const today = new Date();
  const add = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return toISODate(d);
  };
  const monthStart = toISODate(new Date(today.getFullYear(), today.getMonth() - 1, 1));

  const projects: Project[] = [
    { id: "p1", name: "Website Redesign", description: "Redesign corporate website", owner: "Somchai K.", department: "Information Technology", startDate: monthStart, endDate: add(60), color: "#0ea5e9" },
    { id: "p2", name: "ERP System Upgrade", description: "Upgrade internal ERP platform", owner: "Apinya W.", department: "Information Technology", startDate: add(-20), endDate: add(90), color: "#8b5cf6" },
    { id: "p3", name: "Data Analytics Platform", description: "Build BI & analytics dashboard", owner: "Nattaya P.", department: "Management", startDate: add(-5), endDate: add(45), color: "#10b981" },
  ];

  const base = { phase: "" as const, notes: "" };
  const tasks: Task[] = [
    { ...base, id: "t1", projectId: "p1", name: "Requirements & Wireframes", owner: "Somchai K.", dev: ["Pimchanok T."], startDate: monthStart, endDate: add(-10), status: "Done", priority: "High", progress: 100, phase: "Functional Requirement", notes: "Approved by stakeholders." },
    { ...base, id: "t2", projectId: "p1", name: "UI/UX Design", owner: "Pimchanok T.", dev: ["Pimchanok T.", "Siriporn K."], startDate: add(-15), endDate: add(10), status: "In Progress", priority: "High", progress: 70, phase: "Design Screen", notes: "Final review pending." },
    { ...base, id: "t3", projectId: "p1", name: "Frontend Development", owner: "Chai P.", dev: ["Chai P."], startDate: add(-5), endDate: add(25), status: "Plan", priority: "Medium", progress: 10, phase: "Development" },
    { ...base, id: "t4", projectId: "p1", name: "Backend API Integration", owner: "Mongkol R.", dev: ["Mongkol R.", "Chai P."], startDate: add(10), endDate: add(40), status: "Not Start", priority: "High", progress: 0, phase: "Development" },
    { ...base, id: "t5", projectId: "p1", name: "UAT & Launch", owner: "Somchai K.", dev: [], startDate: add(40), endDate: add(60), status: "Not Start", priority: "Low", progress: 0, phase: "UAT" },
    { ...base, id: "t6", projectId: "p2", name: "Requirements Gathering", owner: "Mongkol R.", dev: ["Mongkol R."], startDate: add(-20), endDate: add(-5), status: "Done", priority: "High", progress: 100, phase: "Functional Requirement", notes: "Signed off." },
    { ...base, id: "t7", projectId: "p2", name: "Vendor Selection", owner: "Apinya W.", dev: ["Apinya W."], startDate: add(-8), endDate: add(5), status: "In Progress", priority: "High", progress: 60, phase: "Master & Config", notes: "Negotiation in progress." },
    { ...base, id: "t8", projectId: "p2", name: "Data Migration Planning", owner: "Chai P.", dev: ["Chai P.", "Dr. Wanchai S."], startDate: add(5), endDate: add(40), status: "Plan", priority: "Medium", progress: 0, phase: "Development" },
    { ...base, id: "t9", projectId: "p2", name: "UAT Testing", owner: "Somchai K.", dev: ["Somchai K."], startDate: add(45), endDate: add(80), status: "Not Start", priority: "Medium", progress: 0, phase: "UAT" },
    { ...base, id: "t10", projectId: "p3", name: "Data Pipeline Setup", owner: "Nattaya P.", dev: ["Nattaya P.", "Dr. Wanchai S."], startDate: add(-5), endDate: add(10), status: "In Progress", priority: "High", progress: 40, phase: "Development", notes: "Gathering data from all BUs." },
    { ...base, id: "t11", projectId: "p3", name: "Dashboard Development", owner: "Pimchanok T.", dev: ["Pimchanok T.", "Chai P."], startDate: add(10), endDate: add(30), status: "Plan", priority: "Medium", progress: 0, phase: "Development" },
    { ...base, id: "t12", projectId: "p3", name: "User Training", owner: "Somchai K.", dev: [], startDate: add(30), endDate: add(40), status: "Not Start", priority: "Low", progress: 0, phase: "Support" },
  ];

  return { projects, tasks };
}
