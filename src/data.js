// Embedded data for the hosted app. The Cowork scheduled tasks refresh the sidebar
// artifact; for this static site you edit these objects and redeploy.

export const DATA = {
  today: "2026-06-02",
  dateLabel: "Tuesday, June 2, 2026",
  milestone: "M0 · Color & token foundation",
  milestoneTarget: "· target Fri Jun 5",
  projectedFinish: "Jul 30, 2026",
  status: "on track", // "on track" | "at risk"
  carryover: [],
  today_tasks: [
    { id: "T1", title: "Define the neutral/surface ramp",
      done: "bg, surface, raised surface, border, and text-primary/secondary/tertiary as Figma variables, extending the V3 surfaces" },
    { id: "T2", title: "Define semantic status colors",
      done: "running / complete / failed / waiting + risk-flag + citation tokens, each with a hex and an AA contrast check against its surface" },
    { id: "T3", title: "Draft the color application map",
      done: "one-page map of each token to component elements so M1 isn't re-deciding color per component" }
  ]
};

export const ROADMAP = {
  dateLabel: "Tuesday, June 2, 2026",
  projectedFinish: "Jul 30, 2026",
  status: "on track",
  weekFocus: "Lock the <b>color & token foundation (M0)</b> so the component library can start clean next week.",
  milestones: [
    { id: "M0", name: "Color & token foundation", target: "Fri Jun 5", state: "active", progress: 0 },
    { id: "M1", name: "Component library", target: "Wed Jun 24", state: "upcoming" },
    { id: "M2", name: "Agent Session View wireframes", target: "Fri Jul 3", state: "upcoming" },
    { id: "M3", name: "Artifact Library IA", target: "Tue Jul 14", state: "upcoming" },
    { id: "M4", name: "Agent entry points", target: "Wed Jul 22", state: "upcoming" },
    { id: "M5", name: "Onboarding + naming/voice", target: "Thu Jul 30", state: "upcoming" }
  ]
};
