import {PUBLIC_QA_ENABLED} from '../../../lib/public-qa-http.server.mjs';
import {createPublicQaApplicationPost} from '../../../lib/public-qa-application.server.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// No environment switch, provider/client construction or admission bypass.
export const POST = createPublicQaApplicationPost({enabled: PUBLIC_QA_ENABLED});
