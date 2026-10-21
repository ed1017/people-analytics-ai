function round1(value: number) {
  return Math.round(value * 10) / 10;
}

export function calculateRoleBuyScale(
  requestedBuy: number,
  recentExternalFillCount: number
) {
  const recentAvgMonthlyRaw =
    recentExternalFillCount / 12;

  return {
    recent_12m_avg_monthly_fills:
      round1(recentAvgMonthlyRaw),
    pct_of_recent_12m_external_fills:
      recentExternalFillCount > 0
        ? round1(
            (requestedBuy /
              recentExternalFillCount) *
              100
          )
        : null,
    multiple_of_recent_avg_monthly_fills:
      recentAvgMonthlyRaw > 0
        ? round1(
            requestedBuy /
              recentAvgMonthlyRaw
          )
        : null,
  };
}
