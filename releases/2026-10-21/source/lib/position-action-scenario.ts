import {supabaseServer} from './supabase-server';
import {positionActionDefaults,positionActionScenario,type PositionActionScenarioRequest} from './position-action-engine';
export type {PositionActionScenarioRequest} from './position-action-engine';
type NumericValue=number|string|null|undefined;
function toNumber(value: NumericValue){const parsed=Number(value);return Number.isFinite(parsed)?parsed:0;}
async function loadCurrentPositionInventory() {
  const [currentResult, overviewResult] =
    await Promise.all([
      supabaseServer
        .from(
          "position_modeling_current_summary"
        )
        .select(
          "current_positions, filled_positions, vacant_positions, frozen_positions, closed_positions"
        ),
      supabaseServer
        .from("dashboard_overview_current")
        .select("snapshot_date")
        .single(),
    ]);

  if (currentResult.error) {
    throw new Error(
      "Position inventory: " +
        currentResult.error.message
    );
  }

  if (overviewResult.error) {
    throw new Error(
      "Position inventory snapshot: " +
        overviewResult.error.message
    );
  }

  const totals = (currentResult.data ?? []).reduce(
    (acc, row) => {
      acc.current_positions += toNumber(
        row.current_positions
      );
      acc.filled_positions += toNumber(
        row.filled_positions
      );
      acc.vacant_positions += toNumber(
        row.vacant_positions
      );
      acc.frozen_positions += toNumber(
        row.frozen_positions
      );
      acc.closed_positions += toNumber(
        row.closed_positions
      );
      return acc;
    },
    {
      current_positions: 0,
      filled_positions: 0,
      vacant_positions: 0,
      frozen_positions: 0,
      closed_positions: 0,
    }
  );

  return {
    asOf:
      overviewResult.data?.snapshot_date ??
      "2026-09-30",
    authorizedPositions:
      totals.current_positions +
      totals.frozen_positions,
    filledPositions:
      totals.filled_positions,
    openVacancies:
      totals.vacant_positions,
    frozenPositions:
      totals.frozen_positions,
    closedPositions:
      totals.closed_positions,
  };
}
export async function getPositionActionDefaults(){return positionActionDefaults(await loadCurrentPositionInventory());}
export async function runPositionActionScenario(request: PositionActionScenarioRequest){return positionActionScenario(request,await loadCurrentPositionInventory());}
