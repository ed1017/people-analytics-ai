"use client";
import { Fragment, useEffect, useState, useSyncExternalStore } from 'react';
import { datasetSession } from '@/lib/dataset-client.mjs';
import { LEGACY_DATASET_TOKEN } from '@/lib/dataset-identity.mjs';
import { switchDecisionDataset } from './decision-store';

export function DatasetBoundary({ children, initialToken }: { children: React.ReactNode; initialToken: string }) {
  const [failed, setFailed] = useState(false);
  const status = useSyncExternalStore(datasetSession.subscribe, datasetSession.snapshot, () => `pending:${initialToken}`);
  const pending = status.startsWith('pending:');
  const newerLayout = Number(initialToken.split(':')[1]) > Number(datasetSession.current().split(':')[1]);
  useEffect(() => {
    if (!pending && !newerLayout) return;
    // Children stay unmounted until storage and transport share the server identity.
    // Deferral also lets old consumers clean up before a changed workspace opens.
    const timer = window.setTimeout(() => {
      try { datasetSession.bootstrap(initialToken, switchDecisionDataset); }
      catch { setFailed(true); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [status, initialToken, pending, newerLayout]);
  if (failed) return <p role="alert">Saved goal context could not be verified for this dataset. Earlier storage is unchanged. Reload after resolving browser storage.</p>;
  if (pending || newerLayout) return <p role="status">Loading evidence for the selected dataset…</p>;
  return <>
    {status !== LEGACY_DATASET_TOKEN && <p role="status">Dataset changed. Saved goals and requirements are retained. Earlier evidence and planning drafts remain in their previous dataset workspace.</p>}
    <Fragment key={status}>{children}</Fragment>
  </>;
}
