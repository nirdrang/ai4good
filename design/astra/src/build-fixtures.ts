export type RequirementId = "shifts" | "availability" | "assignments" | "coverage" | "reminders";
type ItemName = { code: string; hint: string; title: string };
export type Requirement = ItemName & {
  id: RequirementId;
  section: string;
  summary: string;
  blockers: RequirementId[];
};
export type RequirementParent = ItemName & {
  section: string;
  summary: string;
  children: RequirementId[];
};
export type AcceptanceTest = { id: string; title: string; expected: string };
export type DevLeaf = ItemName & {
  kind: "leaf";
  summary: string;
  blockers: string[];
  design: string | null;
  tests: AcceptanceTest[];
};
export type DevItem = DevLeaf | (ItemName & { kind: "root" | "deliverable"; children: DevItem[] });

export const requirements: Record<RequirementId, Requirement> = {
  shifts: {
    id: "shifts",
    code: "PM-02",
    hint: "weekly shifts",
    title: "Plan weekly shifts",
    section: "1.1",
    summary: "Coordinators create and update shifts across three community kitchens.",
    blockers: [],
  },
  coverage: {
    id: "coverage",
    code: "PM-05",
    hint: "coverage gaps",
    title: "See gaps before each shift",
    section: "1.2",
    summary: "Coordinators see which shifts still need volunteers.",
    blockers: ["shifts", "assignments"],
  },
  availability: {
    id: "availability",
    code: "PM-03",
    hint: "volunteer availability",
    title: "Collect volunteer availability",
    section: "2.1",
    summary: "Volunteers share when they can help. Coordinators see their current availability.",
    blockers: [],
  },
  assignments: {
    id: "assignments",
    code: "PM-04",
    hint: "safe assignments",
    title: "Assign the right volunteers",
    section: "2.2",
    summary: "Coordinators assign available volunteers without overlaps or missing training.",
    blockers: ["shifts", "availability"],
  },
  reminders: {
    id: "reminders",
    code: "PM-06",
    hint: "shift reminders",
    title: "Send clear shift reminders",
    section: "2.3",
    summary: "Volunteers receive one reminder with current shift details.",
    blockers: ["assignments"],
  },
};
export const requirementParents: RequirementParent[] = [
  {
    code: "PM-07",
    hint: "kitchen scheduling",
    title: "Coordinate kitchen schedules",
    section: "1",
    summary: "This parent requirement groups the scheduling outcomes in PRD section 1.",
    children: ["shifts", "coverage"],
  },
  {
    code: "PM-08",
    hint: "volunteer coordination",
    title: "Coordinate volunteer participation",
    section: "2",
    summary: "This parent requirement groups the volunteer outcomes in PRD section 2.",
    children: ["availability", "assignments", "reminders"],
  },
];
export const developmentPlans: Record<RequirementId, DevItem> = {
  shifts: {
    kind: "root",
    code: "DEV-01",
    hint: "weekly shifts root",
    title: "Weekly shifts",
    children: [
      {
        kind: "deliverable",
        code: "DEV-02",
        hint: "shift data",
        title: "Save and update shifts",
        children: [
          {
            kind: "leaf",
            code: "DEV-03",
            hint: "save a shift",
            title: "Save and validate a shift",
            summary: "Save the kitchen, date, time, role, and capacity through the shift API.",
            blockers: [],
            design: null,
            tests: [
              {
                id: "AT-02.01",
                title: "Save a valid shift",
                expected: "The saved shift retains its kitchen, date, time, role, and capacity.",
              },
              {
                id: "AT-02.02",
                title: "Reject invalid capacity",
                expected: "Zero or negative capacity returns a clear error and creates no shift.",
              },
            ],
          },
          {
            kind: "leaf",
            code: "DEV-04",
            hint: "edit a shift",
            title: "Preserve assignments when editing",
            summary: "Update a shift without removing its existing volunteer assignments.",
            blockers: ["DEV-03"],
            design: null,
            tests: [
              {
                id: "AT-02.03",
                title: "Retain existing assignments",
                expected: "Editing a shift keeps each existing assignment linked to that shift.",
              },
            ],
          },
        ],
      },
      {
        kind: "deliverable",
        code: "DEV-05",
        hint: "weekly schedule",
        title: "Show the weekly schedule",
        children: [
          {
            kind: "leaf",
            code: "DEV-06",
            hint: "schedule view",
            title: "Build the weekly schedule view",
            summary: "Show the selected week's shifts and let coordinators filter by kitchen.",
            blockers: ["DEV-03"],
            design: "Weekly schedule screen",
            tests: [
              {
                id: "AT-02.04",
                title: "Show the selected week",
                expected:
                  "The schedule includes all shifts for the selected week across the three kitchens.",
              },
              {
                id: "AT-02.05",
                title: "Filter by kitchen",
                expected:
                  "Selecting a kitchen shows only that kitchen's shifts for the current week.",
              },
            ],
          },
        ],
      },
    ],
  },
  availability: {
    kind: "root",
    code: "DEV-07",
    hint: "availability root",
    title: "Volunteer availability",
    children: [
      {
        kind: "deliverable",
        code: "DEV-08",
        hint: "availability records",
        title: "Collect and show availability",
        children: [
          {
            kind: "leaf",
            code: "DEV-09",
            hint: "save availability",
            title: "Save and update availability",
            summary: "Store each volunteer's current availability through the availability API.",
            blockers: [],
            design: null,
            tests: [
              {
                id: "AT-03.01",
                title: "Save availability",
                expected: "A volunteer can save the dates and times when they can help.",
              },
              {
                id: "AT-03.02",
                title: "Update availability",
                expected: "An update replaces the previous availability without duplicate entries.",
              },
            ],
          },
          {
            kind: "leaf",
            code: "DEV-10",
            hint: "availability view",
            title: "Show weekly availability",
            summary: "Give coordinators a weekly view of current volunteer availability.",
            blockers: ["DEV-09"],
            design: "Availability screen",
            tests: [
              {
                id: "AT-03.03",
                title: "Show current availability",
                expected: "The selected week shows each volunteer's latest availability.",
              },
            ],
          },
        ],
      },
    ],
  },
  assignments: {
    kind: "root",
    code: "DEV-11",
    hint: "assignments root",
    title: "Safe volunteer assignments",
    children: [
      {
        kind: "deliverable",
        code: "DEV-12",
        hint: "assignment rules",
        title: "Assign volunteers safely",
        children: [
          {
            kind: "leaf",
            code: "DEV-13",
            hint: "assign a volunteer",
            title: "Create an assignment",
            summary: "Connect an available volunteer to an open shift place.",
            blockers: ["DEV-03", "DEV-09"],
            design: null,
            tests: [
              {
                id: "AT-04.01",
                title: "Assign an available volunteer",
                expected: "The assignment links an available volunteer to the selected open place.",
              },
            ],
          },
          {
            kind: "leaf",
            code: "DEV-14",
            hint: "assignment checks",
            title: "Prevent unsafe assignments",
            summary: "Reject overlapping assignments and assignments without required training.",
            blockers: ["DEV-13"],
            design: null,
            tests: [
              {
                id: "AT-04.02",
                title: "Prevent overlapping shifts",
                expected: "An overlapping assignment fails with a clear explanation.",
              },
              {
                id: "AT-04.03",
                title: "Require recorded training",
                expected: "A trained role rejects a volunteer who lacks the required training.",
              },
            ],
          },
        ],
      },
    ],
  },
  coverage: {
    kind: "root",
    code: "DEV-15",
    hint: "coverage root",
    title: "Kitchen coverage",
    children: [
      {
        kind: "deliverable",
        code: "DEV-16",
        hint: "coverage overview",
        title: "Show remaining places",
        children: [
          {
            kind: "leaf",
            code: "DEV-17",
            hint: "count open places",
            title: "Calculate shift coverage",
            summary: "Calculate filled and open places for each shift.",
            blockers: ["DEV-13"],
            design: null,
            tests: [
              {
                id: "AT-05.01",
                title: "Count filled and open places",
                expected:
                  "Each shift shows the correct filled and open places after assignments change.",
              },
            ],
          },
          {
            kind: "leaf",
            code: "DEV-18",
            hint: "coverage filters",
            title: "Build the coverage overview",
            summary: "Show coverage for the selected kitchen and week.",
            blockers: ["DEV-17"],
            design: "Coverage screen",
            tests: [
              {
                id: "AT-05.02",
                title: "Filter kitchen coverage",
                expected: "Kitchen and week filters update the coverage overview together.",
              },
            ],
          },
        ],
      },
    ],
  },
  reminders: {
    kind: "root",
    code: "DEV-19",
    hint: "reminders root",
    title: "Shift reminders",
    children: [
      {
        kind: "deliverable",
        code: "DEV-20",
        hint: "reminder delivery",
        title: "Deliver current shift details",
        children: [
          {
            kind: "leaf",
            code: "DEV-21",
            hint: "send reminders",
            title: "Send one reminder per assignment",
            summary: "Send the current shift details once for each active assignment.",
            blockers: ["DEV-13"],
            design: null,
            tests: [
              {
                id: "AT-06.01",
                title: "Send one reminder",
                expected: "An active assignment receives exactly one reminder before its shift.",
              },
              {
                id: "AT-06.02",
                title: "Skip cancelled assignments",
                expected: "A cancelled assignment receives no reminder.",
              },
              {
                id: "AT-06.03",
                title: "Use current shift details",
                expected: "The reminder includes the latest kitchen, time, and role.",
              },
            ],
          },
        ],
      },
    ],
  },
};
export const itemLabel = (item: ItemName) => `${item.code} (${item.hint})`;
export function flattenDev(item: DevItem): DevItem[] {
  return [item, ...(item.kind === "leaf" ? [] : item.children.flatMap(flattenDev))];
}
export function devLeaves(item: DevItem): DevLeaf[] {
  return flattenDev(item).filter((node): node is DevLeaf => node.kind === "leaf");
}
export function acceptanceTests(item: DevItem): AcceptanceTest[] {
  return devLeaves(item).flatMap((leaf) => leaf.tests);
}
export function devByCode(code: string): DevItem | undefined {
  return Object.values(developmentPlans)
    .flatMap(flattenDev)
    .find((item) => item.code === code);
}
