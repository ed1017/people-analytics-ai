/** Public editorial excerpts; never an internal profile-to-occupation mapping. */
export const occupationalPublicSource = {
  name: "O*NET OnLine",
  checkedAt: "2026-10-06",
  databaseReleaseAtReview: "31.0",
  databaseUrl: "https://www.onetcenter.org/database.html",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  attribution: "O*NET® data, U.S. Department of Labor, Employment and Training Administration (USDOL/ETA).",
  modifications: "Selected descriptions, tasks and preparation guidance are condensed for this application. USDOL/ETA has not approved, endorsed, or tested these modifications.",
};

export const publicOccupations = [
  {
    code: "15-1252.00", title: "Software Developers",
    description: "Design and improve software based on user needs, system capabilities and technical requirements.",
    tasks: ["Assess user needs and whether software designs fit project time and cost limits.", "Develop testing, validation and documentation for software systems.", "Update software to correct errors, improve performance or support new hardware."],
    essentialSkills: ["Critical Thinking", "Active Learning", "Reading Comprehension"],
    preparation: "Job Zone 4: considerable preparation. The zone generally involves substantial related experience and training; many occupations in it require a bachelor's degree. This is broad occupational guidance, not an employer's hiring rule.",
    sourceUrl: "https://www.onetonline.org/link/summary/15-1252.00",
  },
  {
    code: "15-2051.00", title: "Data Scientists",
    description: "Use programming, statistical analysis and modeling to turn data into information and communicate findings.",
    tasks: ["Process and analyze large datasets with statistical software.", "Create visualizations to communicate analytical findings.", "Test and revise models, and present results to decision makers."],
    essentialSkills: ["Mathematics", "Critical Thinking", "Reading Comprehension"],
    preparation: "Job Zone 4: considerable preparation. The zone generally involves substantial related experience and training; many occupations in it require a bachelor's degree. This is broad occupational guidance, not an employer's hiring rule.",
    sourceUrl: "https://www.onetonline.org/link/summary/15-2051.00",
  },
  {
    code: "29-1141.00", title: "Registered Nurses",
    description: "Assess patient needs, provide and coordinate nursing care, and maintain care records.",
    tasks: ["Document patient information, vital signs and changes in condition.", "Give medications and monitor patient responses.", "Maintain care records and provide nursing care in varied settings."],
    essentialSkills: ["Active Listening", "Critical Thinking", "Speaking"],
    preparation: "Job Zone 4: considerable preparation. This broad zone describes preparation across occupations; it does not establish a single nursing education pathway. Check the official occupation profile and jurisdiction-specific licensing requirements.",
    sourceUrl: "https://www.onetonline.org/link/summary/29-1141.00",
  },
];

export function publicOccupationEvidence(code) {
  return publicOccupations.find((occupation) => occupation.code === code) ?? null;
}
