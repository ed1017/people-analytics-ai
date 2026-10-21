"use client";

import {useEffect} from "react";

export default function GlobalError() {
  useEffect(() => {
    // The app's pages share one pathname. A query-only Back/Forward does not
    // reset Next's global error boundary; reload the newly selected URL.
    const recover = () => window.location.reload();
    window.addEventListener("popstate", recover);
    return () => window.removeEventListener("popstate", recover);
  }, []);

  return <html lang="en"><body style={{fontFamily:"system-ui, sans-serif",padding:"2rem"}}>
    <main>
      <h1>This page couldn&apos;t load</h1>
      <p>Reload to try again, or go back.</p>
      <div style={{display:"flex",gap:"1rem"}}>
        <button type="button" onClick={() => window.location.reload()}>Reload</button>
        <button type="button" onClick={() => {
          if (window.history.length > 1) window.history.back();
          // A document navigation is intentional: the root router has failed.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          else window.location.assign("/");
        }}>Back</button>
      </div>
    </main>
  </body></html>;
}
