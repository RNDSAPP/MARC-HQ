import { useCallback, useEffect, useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useSession } from './session';
import { supabase } from './supabase';

export type StoreReview = {
  id: string;
  rating: number;
  title: string;
  body: string;
  nickname: string;
  date: string;
  territory: string;
  response: { body: string; state: string } | null;
};
export type StoreVersion = { version: string; state: string; platform: string; created: string };
export type StoreData = { app: { name: string; bundleId: string }; versions: StoreVersion[]; reviews: StoreReview[] };

/** Apple's version states, in Marc's words. */
export const VERSION_STATE: Record<string, string> = {
  READY_FOR_SALE: 'En ligne',
  READY_FOR_DISTRIBUTION: 'En ligne',
  ACCEPTED: 'Acceptée',
  PENDING_DEVELOPER_RELEASE: 'Acceptée, à publier',
  WAITING_FOR_REVIEW: 'En attente de review',
  IN_REVIEW: 'En review',
  PREPARE_FOR_SUBMISSION: 'En préparation',
  PROCESSING_FOR_APP_STORE: 'En traitement',
  PROCESSING_FOR_DISTRIBUTION: 'En traitement',
  REJECTED: 'Refusée',
  METADATA_REJECTED: 'Fiche refusée',
  DEVELOPER_REJECTED: 'Retirée',
  REPLACED_WITH_NEW_VERSION: 'Remplacée',
};

async function failure(error: unknown) {
  if (error instanceof FunctionsHttpError) return ((await error.context.json().catch(() => ({}))).error as string) ?? 'Erreur du serveur.';
  return 'Pas de réponse du serveur.';
}

/**
 * The project's app on App Store Connect, read through the `appstore` server function once Marc
 * is signed in: latest versions and written reviews, and a way to answer a review.
 */
export function useAppStore(projectId: string, enabled: boolean) {
  const session = useSession();
  const [data, setData] = useState<StoreData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!supabase || !session || !enabled) return;
    setLoading(true);
    const { data: result, error: failed } = await supabase.functions.invoke('appstore', { body: { action: 'overview', project_id: projectId } });
    setLoading(false);
    if (failed) {
      setError(await failure(failed));
      return;
    }
    setError('');
    setData(result as StoreData);
  }, [session, enabled, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const reply = useCallback(
    async (reviewId: string, text: string) => {
      if (!supabase) return 'Supabase n’est pas réglé.';
      const { error: failed } = await supabase.functions.invoke('appstore', { body: { action: 'reply', project_id: projectId, review_id: reviewId, text } });
      if (failed) return failure(failed);
      await load();
      return '';
    },
    [projectId, load],
  );

  return { session, data, error, loading, reload: load, reply };
}
