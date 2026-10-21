import { notFound } from 'next/navigation';
import { SyntheticTaPreview } from '@/components/synthetic-ta-preview';
import { buildPreview } from '@/lib/synthetic-ta/v1';

export default function LocalTalentAcquisitionPreview() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <SyntheticTaPreview data={buildPreview()} />;
}
