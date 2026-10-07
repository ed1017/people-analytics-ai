import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { IntelligencePage } from '../../components/pages/intelligence-page';
import { MarketComparison, type MarketCarry, type MarketSelection } from '../../components/market-reference';
import { OccupationalReference } from '../../components/occupational-reference';

// Deliberately isolated: no application shell, identity, workforce or credentials.
// The browser harness provides synthetic job-profile reference rows only.
function Fixture() {
  const [page, setPage] = useState<'occupational-references' | 'labor-market'>('occupational-references');
  const [selection, setSelection] = useState<MarketSelection>({ soc: '15-1252', area: '99' });
  const [goal, setGoal] = useState('');
  const [carry, setCarry] = useState<MarketCarry | null>(null);
  return <main className="mx-auto max-w-6xl min-w-0 p-2 sm:p-4">
    <h1 className="text-xl font-semibold">Isolated reference content fixture</h1>
    <nav aria-label="Fixture pages" className="my-3 flex flex-wrap gap-3">
      <button className="min-h-11 rounded border p-2" onClick={() => setPage('occupational-references')}>Show Occupational References</button>
      <button className="min-h-11 rounded border p-2" onClick={() => setPage('labor-market')}>Show Labor Market</button>
    </nav>
    {page === 'labor-market' && <div aria-label="Fixture market controls" className="flex flex-wrap gap-3">
      <button className="min-h-11 rounded border p-2" onClick={() => setGoal('Review a synthetic planning goal')}>Set fixture goal</button>
      <button className="min-h-11 rounded border p-2" onClick={() => setSelection({ soc: '00-0000', area: 'unsupported' })}>Use unsupported market selection</button>
    </div>}
    <IntelligencePage
      page={page}
      occupational={<OccupationalReference />}
      bls={null}
      blsLoading={false}
      blsError="Fixture national indicator source unavailable."
      catalog={null}
      market={<MarketComparison selection={selection} onChange={setSelection} goal={goal} onCarry={setCarry} />}
    />
    {carry && <output aria-label="Fixture carried reference" className="block break-words">{JSON.stringify(carry)}</output>}
  </main>;
}

createRoot(document.getElementById('root')!).render(<Fixture />);
