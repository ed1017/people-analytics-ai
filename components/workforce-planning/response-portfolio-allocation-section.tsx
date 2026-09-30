import type { ComponentProps, ReactNode } from "react";

import { BusinessUnitResponseAllocationPanel } from "./business-unit-response-allocation-panel";
import { ResponsePortfolioControls } from "./response-portfolio-controls";

type ResponsePortfolioAllocationSectionProps = {
  portfolioProps: Omit<
    ComponentProps<typeof ResponsePortfolioControls>,
    "children"
  >;
  businessUnitProps?: Omit<
    ComponentProps<typeof BusinessUnitResponseAllocationPanel>,
    "children"
  > | null;
  children?: ReactNode;
};

export function ResponsePortfolioAllocationSection({
  portfolioProps,
  businessUnitProps,
  children,
}: ResponsePortfolioAllocationSectionProps) {
  return (
    <ResponsePortfolioControls {...portfolioProps}>
      {portfolioProps.result && businessUnitProps && (
        <BusinessUnitResponseAllocationPanel
          {...businessUnitProps}
        >
          {businessUnitProps.result ? children : null}
        </BusinessUnitResponseAllocationPanel>
      )}
    </ResponsePortfolioControls>
  );
}
