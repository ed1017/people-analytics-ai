# Turnover chart monthly window

2026-10-06: presentation-only change to the fixed simulated turnover chart. The plot now spans January–December 2026 with every month labeled. Released history ends in August; September remains unavailable. October–December retain the exact existing forecast values and method-specific dotted paths. Faint long-dashed bridges connect the last released point to the first forecast, with their own legend and explicit no-observation description. No September point or value is created. Solid historical paths also break across absent calendar months.

Projection shading starts halfway between September and October. At narrow chart widths monthly labels rotate to remain readable without horizontal overflow. Keyboard and hover tooltips remain available, including an explicit September unavailable marker. Other domain plot windows and all model artifacts remain unchanged.

Validation: 44 browser assertions at desktop, 390px, 320px and 683px effective viewport (200% desktop reflow), including exact month spacing, unchanged history/forecast coordinates, bridge endpoints and styling, missing September points, tooltips, label overlap, overflow, runtime and network boundaries. Desktop and 320px screenshots inspected. The 200% check is viewport reflow, not a claim of native browser zoom automation.
