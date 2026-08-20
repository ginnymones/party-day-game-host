import {
  createClient,
  type RealtimeChannel,
  type SupabaseClient,
} from "@supabase/supabase-js";
import type { AnswerSubmission, LiveState } from "./types";

/**
 * Optional live-sync layer.
 *
 * The app is fully functional offline without any of this. When the two public
 * Supabase env vars are set AND the device is online, the game master
 * broadcasts party state over a Realtime channel and participant/audience
 * devices subscribe to it. We use Realtime "broadcast" (not Postgres change
 * streams) so no database schema is required — this keeps the footprint tiny
 * and lets live sync work the moment a Supabase project URL + anon key exist.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export function isSyncConfigured(): boolean {
  return Boolean(url && anonKey);
}

function getClient(): SupabaseClient | null {
  if (!isSyncConfigured()) return null;
  if (!client) {
    client = createClient(url as string, anonKey as string, {
      realtime: { params: { eventsPerSecond: 5 } },
      auth: { persistSession: false },
    });
  }
  return client;
}

export function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

const channelName = (code: string) => `party:${code.toLowerCase()}`;

/**
 * Game master side: open a channel and return a `push` function to broadcast
 * the latest state, plus an `onAnswer` subscriber for incoming participant
 * answers. `getState` lets us re-broadcast when a late joiner asks for state.
 * Returns null when sync is unavailable.
 */
export function openHostChannel(
  code: string,
  onAnswer: (answer: AnswerSubmission) => void,
  getState: () => LiveState
): { push: (state: LiveState) => void; close: () => void } | null {
  const supabase = getClient();
  if (!supabase) return null;

  const channel: RealtimeChannel = supabase.channel(channelName(code), {
    config: { broadcast: { self: false } },
  });

  const push = (state: LiveState) => {
    channel.send({ type: "broadcast", event: "state", payload: state });
  };

  channel
    .on("broadcast", { event: "answer" }, ({ payload }) => {
      onAnswer(payload as AnswerSubmission);
    })
    .on("broadcast", { event: "request-state" }, () => {
      push(getState());
    })
    .subscribe();

  return {
    push,
    close: () => {
      supabase.removeChannel(channel);
    },
  };
}

/**
 * Viewer side (audience/participant): subscribe to state broadcasts. Returns an
 * unsubscribe function, or null when sync is unavailable.
 */
export function subscribeToParty(
  code: string,
  onState: (state: LiveState) => void
): (() => void) | null {
  const supabase = getClient();
  if (!supabase) return null;

  const channel = supabase.channel(channelName(code), {
    config: { broadcast: { self: false } },
  });

  channel
    .on("broadcast", { event: "state" }, ({ payload }) => {
      onState(payload as LiveState);
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        // Ask the host to re-broadcast current state for late joiners.
        channel.send({ type: "broadcast", event: "request-state", payload: {} });
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

/** Participant side: send an answer to the host channel. */
export function sendAnswer(code: string, answer: AnswerSubmission): boolean {
  const supabase = getClient();
  if (!supabase) return false;
  const channel = supabase.channel(channelName(code), {
    config: { broadcast: { self: false } },
  });
  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      channel.send({ type: "broadcast", event: "answer", payload: answer });
      // Give the message a tick to flush, then tear down.
      setTimeout(() => supabase.removeChannel(channel), 500);
    }
  });
  return true;
}
