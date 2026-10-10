import {registerLegacyDatasetClient} from '../../lib/dataset-runtime';
import type {SupabaseClient} from '@supabase/supabase-js';
export const supabaseServer=(globalThis as unknown as {__client:SupabaseClient}).__client;
registerLegacyDatasetClient(supabaseServer);
