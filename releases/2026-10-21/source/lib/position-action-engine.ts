import type {PositionActionAssumptions,PositionActionScenarioResponse} from './types';
export type PositionActionInventory={asOf:string;authorizedPositions:number;filledPositions:number;openVacancies:number;frozenPositions:number;closedPositions:number};
type NumericValue =
  | number
  | string
  | null
  | undefined;

export type PositionActionScenarioRequest = {
  add_positions?: number | null;
  close_vacant_positions?: number | null;
  freeze_vacancies?: number | null;
  vacancy_fill_pct?: number | null;
};

function toNumber(value: NumericValue) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function roundPct(
  numerator: number,
  denominator: number
) {
  if (denominator <= 0) return 0;
  return round1(
    (numerator / denominator) * 100
  );
}

export function positionActionDefaults(current: PositionActionInventory) {

  const defaults: PositionActionAssumptions = {
    add_positions: 0,
    close_vacant_positions: 0,
    freeze_vacancies: 0,
    vacancy_fill_pct: 0,
  };

  return {
    as_of: current.asOf,
    defaults,
    current: {
      authorized_positions:
        current.authorizedPositions,
      filled_positions:
        current.filledPositions,
      open_vacancies:
        current.openVacancies,
      frozen_positions:
        current.frozenPositions,
      closed_positions:
        current.closedPositions,
    },
    bounds: {
      add_positions: {
        min: 0,
        max: 5000,
      },
      close_vacant_positions: {
        min: 0,
        max: current.openVacancies,
      },
      freeze_vacancies: {
        min: 0,
        max:
          current.openVacancies,
      },
      vacancy_fill_pct: {
        min: 0,
        max: 100,
      },
    },
  };
}

export function positionActionScenario(
  request: PositionActionScenarioRequest, current: PositionActionInventory
): PositionActionScenarioResponse {

  const addPositions = clamp(
    Math.round(
      toNumber(request.add_positions)
    ),
    0,
    5000
  );

  const closeVacantPositions = clamp(
    Math.round(
      toNumber(
        request.close_vacant_positions
      )
    ),
    0,
    current.openVacancies
  );

  const vacanciesAfterClose =
    current.openVacancies +
    addPositions -
    closeVacantPositions;

  const freezeVacancies = clamp(
    Math.round(
      toNumber(
        request.freeze_vacancies
      )
    ),
    0,
    vacanciesAfterClose
  );

  const vacancyFillPct = clamp(
    toNumber(request.vacancy_fill_pct),
    0,
    100
  );

  const fillableVacancies =
    vacanciesAfterClose -
    freezeVacancies;

  const projectedFills =
    fillableVacancies *
    (vacancyFillPct / 100);

  const modeledFilledPositions =
    current.filledPositions +
    projectedFills;

  const modeledOpenVacancies =
    fillableVacancies -
    projectedFills;

  const modeledFrozenPositions =
    current.frozenPositions +
    freezeVacancies;

  const modeledAuthorizedPositions =
    current.authorizedPositions +
    addPositions -
    closeVacantPositions;

  const assumptions: PositionActionAssumptions = {
    add_positions: addPositions,
    close_vacant_positions:
      closeVacantPositions,
    freeze_vacancies:
      freezeVacancies,
    vacancy_fill_pct:
      round1(vacancyFillPct),
  };

  const defaults: PositionActionAssumptions = {
    add_positions: 0,
    close_vacant_positions: 0,
    freeze_vacancies: 0,
    vacancy_fill_pct: 0,
  };

  return {
    as_of: current.asOf,
    defaults,
    assumptions,
    current: {
      authorized_positions:
        current.authorizedPositions,
      filled_positions:
        current.filledPositions,
      open_vacancies:
        current.openVacancies,
      frozen_positions:
        current.frozenPositions,
      closed_positions:
        current.closedPositions,
    },
    modeled: {
      authorized_positions:
        round1(
          modeledAuthorizedPositions
        ),
      filled_positions:
        round1(
          modeledFilledPositions
        ),
      open_vacancies:
        round1(
          modeledOpenVacancies
        ),
      frozen_positions:
        round1(
          modeledFrozenPositions
        ),
      projected_fills:
        round1(projectedFills),
      net_authorized_position_change:
        round1(
          modeledAuthorizedPositions -
            current.authorizedPositions
        ),
      net_filled_position_change:
        round1(
          modeledFilledPositions -
            current.filledPositions
        ),
      vacancy_rate_pct:
        roundPct(
          modeledOpenVacancies,
          modeledAuthorizedPositions
        ),
      occupancy_rate_pct:
        roundPct(
          modeledFilledPositions,
          modeledAuthorizedPositions
        ),
    },
    methodology: [
      "The scenario starts from the current authorized position inventory: filled + open vacant + frozen positions.",
      "Added positions enter the scenario as open vacancies and increase authorized positions.",
      "Closed positions in this model are restricted to currently vacant positions; the model does not convert filled-position closures into employee exits.",
      "Frozen vacancies remain authorized positions but are removed from the fillable vacancy pool.",
      "The vacancy fill percentage is applied to the remaining fillable vacancies after adds, closures, and freezes.",
      "This model is read-only and does not change position records, requisitions, or employee assignments.",
      "This first position-actions model does not yet calculate labor-cost effects; cost modeling should use explicit position/job-level cost assumptions in a later step.",
    ],
  };
}