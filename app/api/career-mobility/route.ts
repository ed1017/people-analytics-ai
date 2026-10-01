import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase-server";
import type {
  CareerMobilityAggregateItem,
  CareerMobilityLocationItem,
  CareerMobilityOrgCoverageItem,
} from "@/lib/types";

export const dynamic = "force-dynamic";

type PreferenceRow = {
  employee_id: string;
  desired_job_profile_id: string | null;
  desired_location_id: string | null;
  relocation_willingness: boolean | null;
  career_interest: string | null;
  last_updated: string | null;
};

type ActiveEmployeeRow = {
  employee_id: string;
  current_org_unit_id: string | null;
};

type JobProfileRow = {
  job_profile_id: string;
  job_profile_code: string;
  job_profile_name: string;
  active: boolean;
};
type LocationRow = {
  location_id: string;
  location_code: string;
  location_name: string;
  city: string | null;
  country_code: string;
  active: boolean;
};

type OrgRow = {
  org_unit_id: string;
  org_code: string;
  org_name: string;
  active: boolean;
};

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

async function loadPreferenceRows() {
  const rows: PreferenceRow[] = [];

  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabaseServer
      .from("career_preferences")
      .select(
        "employee_id, desired_job_profile_id, desired_location_id, relocation_willingness, career_interest, last_updated"
      )
      .range(from, from + 999);

    if (error) {
      throw new Error(
        "Career preferences: " + error.message
      );
    }
    rows.push(...((data ?? []) as PreferenceRow[]));

    if ((data ?? []).length < 1000) {
      break;
    }
  }

  return rows;
}

async function loadActiveEmployees() {
  const rows: ActiveEmployeeRow[] = [];

  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabaseServer
      .from("employees")
      .select("employee_id, current_org_unit_id")
      .eq("employment_status", "active")
      .range(from, from + 999);

    if (error) {
      throw new Error(
        "Active employees: " + error.message
      );
    }

    rows.push(
      ...((data ?? []) as ActiveEmployeeRow[])
    );

    if ((data ?? []).length < 1000) {
      break;
    }
  }

  return rows;
}
export async function GET() {
  try {
    const [
      preferenceRows,
      activeEmployees,
      profilesResult,
      locationsResult,
      orgsResult,
    ] = await Promise.all([
      loadPreferenceRows(),
      loadActiveEmployees(),
      supabaseServer
        .from("job_profiles")
        .select(
          "job_profile_id, job_profile_code, job_profile_name, active"
        ),
      supabaseServer
        .from("locations")
        .select(
          "location_id, location_code, location_name, city, country_code, active"
        ),
      supabaseServer
        .from("org_units")
        .select(
          "org_unit_id, org_code, org_name, active"
        ),
    ]);

    if (profilesResult.error) {
      throw new Error(
        "Career destination profiles: " +
          profilesResult.error.message
      );
    }
    if (locationsResult.error) {
      throw new Error(
        "Career destination locations: " +
          locationsResult.error.message
      );
    }

    if (orgsResult.error) {
      throw new Error(
        "Career current organizations: " +
          orgsResult.error.message
      );
    }

    const profiles =
      (profilesResult.data ?? []) as JobProfileRow[];
    const locations =
      (locationsResult.data ?? []) as LocationRow[];
    const orgs =
      (orgsResult.data ?? []) as OrgRow[];

    const activeEmployeeIds = new Set(
      activeEmployees.map((row) => row.employee_id)
    );

    const activePreferenceRows =
      preferenceRows.filter((row) =>
        activeEmployeeIds.has(row.employee_id)
      );

    const preferenceCountsByEmployee = new Map<
      string,
      number
    >();

    for (const row of activePreferenceRows) {
      preferenceCountsByEmployee.set(
        row.employee_id,
        (preferenceCountsByEmployee.get(
          row.employee_id
        ) ?? 0) + 1
      );
    }
    const duplicatePreferenceEmployees =
      Array.from(
        preferenceCountsByEmployee.values()
      ).filter((count) => count > 1).length;

    if (duplicatePreferenceEmployees > 0) {
      throw new Error(
        "Career preference aggregation requires a current-record rule because multiple active preference rows were found for at least one employee."
      );
    }

    const preferenceEmployeeIds = new Set(
      activePreferenceRows.map(
        (row) => row.employee_id
      )
    );

    const profileById = new Map(
      profiles.map((row) => [
        row.job_profile_id,
        row,
      ])
    );
    const locationById = new Map(
      locations.map((row) => [
        row.location_id,
        row,
      ])
    );
    const orgById = new Map(
      orgs.map((row) => [row.org_unit_id, row])
    );

    const roleCounts = new Map<string, number>();
    const locationCounts = new Map<string, number>();
    const interestCounts = new Map<string, number>();

    let knownRelocationRecords = 0;
    let relocationWillingEmployees = 0;
    let missingDesiredProfile = 0;
    let missingDesiredLocation = 0;
    let missingRelocationWillingness = 0;
    let missingCareerInterest = 0;
    let unmatchedProfileReferences = 0;
    let unmatchedLocationReferences = 0;

    const updateDates: string[] = [];

    for (const row of activePreferenceRows) {
      if (row.last_updated) {
        updateDates.push(row.last_updated);
      }

      if (row.relocation_willingness === null) {
        missingRelocationWillingness += 1;
      } else {
        knownRelocationRecords += 1;
        if (row.relocation_willingness) {
          relocationWillingEmployees += 1;
        }
      }

      const interest = row.career_interest?.trim();
      if (!interest) {
        missingCareerInterest += 1;
      } else {
        interestCounts.set(
          interest,
          (interestCounts.get(interest) ?? 0) + 1
        );
      }

      if (!row.desired_job_profile_id) {
        missingDesiredProfile += 1;
      } else {
        const profile = profileById.get(
          row.desired_job_profile_id
        );
        if (!profile || !profile.active) {
          unmatchedProfileReferences += 1;
        } else {
          roleCounts.set(
            profile.job_profile_id,
            (roleCounts.get(
              profile.job_profile_id
            ) ?? 0) + 1
          );
        }
      }

      if (!row.desired_location_id) {
        missingDesiredLocation += 1;
      } else {
        const location = locationById.get(
          row.desired_location_id
        );
        if (!location || !location.active) {
          unmatchedLocationReferences += 1;
        } else {
          locationCounts.set(
            location.location_id,
            (locationCounts.get(
              location.location_id
            ) ?? 0) + 1
          );
        }
      }
    }

    const activeEmployeeCount =
      activeEmployees.length;
    const employeesWithPreference =
      preferenceEmployeeIds.size;
    const employeesWithoutPreference =
      Math.max(
        0,
        activeEmployeeCount -
          employeesWithPreference
      );
    const knownProfileRecords =
      employeesWithPreference -
      missingDesiredProfile -
      unmatchedProfileReferences;
    const knownLocationRecords =
      employeesWithPreference -
      missingDesiredLocation -
      unmatchedLocationReferences;
    const knownInterestRecords =
      employeesWithPreference -
      missingCareerInterest;

    const careerInterests: CareerMobilityAggregateItem[] =
      Array.from(interestCounts.entries())
        .map(([label, employees]) => ({
          code: label,
          label,
          employees,
          share_pct:
            knownInterestRecords > 0
              ? round1(
                  (employees /
                    knownInterestRecords) *
                    100
                )
              : 0,
        }))
        .sort(
          (a, b) =>
            b.employees - a.employees ||
            a.label.localeCompare(b.label)
        );

    const destinationRoles: CareerMobilityAggregateItem[] =
      Array.from(roleCounts.entries())
        .map(([profileId, employees]) => {
          const profile =
            profileById.get(profileId)!;
          return {
            code: profile.job_profile_code,
            label: profile.job_profile_name,
            employees,
            share_pct:
              knownProfileRecords > 0
                ? round1(
                    (employees /
                      knownProfileRecords) *
                      100
                  )
                : 0,
          };
        })
        .sort(
          (a, b) =>
            b.employees - a.employees ||
            a.label.localeCompare(b.label)
        )
        .slice(0, 15);

    const desiredLocations: CareerMobilityLocationItem[] =
      Array.from(locationCounts.entries())
        .map(([locationId, employees]) => {
          const location =
            locationById.get(locationId)!;
          return {
            location_code:
              location.location_code,
            location_name:
              location.location_name,
            city: location.city,
            country_code:
              location.country_code,
            employees,
            share_pct:
              knownLocationRecords > 0
                ? round1(
                    (employees /
                      knownLocationRecords) *
                      100
                  )
                : 0,
          };
        })
        .sort(
          (a, b) =>
            b.employees - a.employees ||
            a.location_name.localeCompare(
              b.location_name
            )
        )
        .slice(0, 15);
    const activeCountsByOrg = new Map<
      string,
      number
    >();
    const preferenceCountsByOrg = new Map<
      string,
      number
    >();
    let unmatchedCurrentOrgReferences = 0;

    for (const employee of activeEmployees) {
      if (!employee.current_org_unit_id) {
        unmatchedCurrentOrgReferences += 1;
        continue;
      }

      const org = orgById.get(
        employee.current_org_unit_id
      );

      if (!org || !org.active) {
        unmatchedCurrentOrgReferences += 1;
        continue;
      }

      activeCountsByOrg.set(
        org.org_unit_id,
        (activeCountsByOrg.get(
          org.org_unit_id
        ) ?? 0) + 1
      );

      if (
        preferenceEmployeeIds.has(
          employee.employee_id
        )
      ) {
        preferenceCountsByOrg.set(
          org.org_unit_id,
          (preferenceCountsByOrg.get(
            org.org_unit_id
          ) ?? 0) + 1
        );
      }
    }
    const currentOrgCoverage: CareerMobilityOrgCoverageItem[] =
      Array.from(
        activeCountsByOrg.entries()
      )
        .map(([orgId, activeEmployeesCount]) => {
          const org = orgById.get(orgId)!;
          const preferenceEmployees =
            preferenceCountsByOrg.get(
              orgId
            ) ?? 0;

          return {
            org_code: org.org_code,
            org_name: org.org_name,
            active_employees:
              activeEmployeesCount,
            employees_with_preference:
              preferenceEmployees,
            preference_coverage_pct:
              activeEmployeesCount > 0
                ? round1(
                    (preferenceEmployees /
                      activeEmployeesCount) *
                      100
                  )
                : 0,
          };
        })
        .sort(
          (a, b) =>
            b.employees_with_preference -
              a.employees_with_preference ||
            b.active_employees -
              a.active_employees ||
            a.org_name.localeCompare(
              b.org_name
            )
        );

    updateDates.sort();

    return NextResponse.json(
      {
        as_of:
          updateDates.length > 0
            ? updateDates[
                updateDates.length - 1
              ]
            : null,
        summary: {
          active_employees:
            activeEmployeeCount,
          employees_with_preference:
            employeesWithPreference,
          employees_without_preference:
            employeesWithoutPreference,
          preference_record_coverage_pct:
            activeEmployeeCount > 0
              ? round1(
                  (employeesWithPreference /
                    activeEmployeeCount) *
                    100
                )
              : 0,
          known_relocation_records:
            knownRelocationRecords,
          relocation_willing_employees:
            relocationWillingEmployees,
          relocation_willing_pct:
            knownRelocationRecords > 0
              ? round1(
                  (relocationWillingEmployees /
                    knownRelocationRecords) *
                    100
                )
              : 0,
          destination_profile_records:
            knownProfileRecords,
          destination_location_records:
            knownLocationRecords,
          career_interest_records:
            knownInterestRecords,
        },
        data_quality: {
          preference_rows:
            activePreferenceRows.length,
          distinct_preference_employees:
            employeesWithPreference,
          employees_with_multiple_preference_rows:
            duplicatePreferenceEmployees,
          missing_desired_profile:
            missingDesiredProfile,
          missing_desired_location:
            missingDesiredLocation,
          missing_relocation_willingness:
            missingRelocationWillingness,
          missing_career_interest:
            missingCareerInterest,
          unmatched_profile_references:
            unmatchedProfileReferences,
          unmatched_location_references:
            unmatchedLocationReferences,
          unmatched_current_org_references:
            unmatchedCurrentOrgReferences,
          earliest_preference_update:
            updateDates[0] ?? null,
          latest_preference_update:
            updateDates[
              updateDates.length - 1
            ] ?? null,
        },
        career_interests:
          careerInterests,
        destination_roles:
          destinationRoles,
        desired_locations:
          desiredLocations,
        current_org_coverage:
          currentOrgCoverage,
        methodology: [
          "The active workforce is the denominator for preference-record coverage. Employees without a career_preferences row are labeled as having no recorded preference; this does not mean they have no career interest.",
          "Preference distributions use active employees with a recorded preference row. Field-specific percentages use only records with a known valid value for that field.",
          "The current source contains one career-preference row per active preference holder. The API stops rather than silently aggregating if duplicate active preference rows appear because no multi-row current-preference rule is defined.",
          "Desired job profiles and desired locations are employee-expressed destinations in the loaded synthetic preference data. They do not establish suitability, readiness, vacancies, transfer feasibility, or likely movement.",
          "Relocation willingness is a recorded preference field. It does not establish that an employee will relocate or that a destination opportunity exists.",
          "Current-organization coverage describes where preference records exist among active employees; differences are descriptive and are not evidence of engagement, manager quality, or mobility opportunity.",
          "Results are aggregate and read-only. No employee identities, rankings, promotion recommendations, move recommendations, or automated employment decisions are exposed.",
        ],
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Career Interests API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Career Interests data.",
      },
      { status: 500 }
    );
  }
}
