import {
  createClient,
  type RealtimeChannel,
  type SupabaseClient,
} from "@supabase/supabase-js";
import type { AnswerSubmission, ControlCommand, LiveState } from "./types";

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
      // Allow bursts of reveals without the client throttling messages away.
      realtime: { params: { eventsPerSecond: 20 } },
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
  handlers: {
    onAnswer: (answer: AnswerSubmission) => void;
    onControl?: (command: ControlCommand) => void;
    getState: () => LiveState;
  }
): { push: (state: LiveState) => void; close: () => void } | null {
  const supabase = getClient();
  if (!supabase) return null;

  const channel: RealtimeChannel = supabase.channel(channelName(code), {
    config: { broadcast: { self: false } },
  });

  const push = (state: LiveState) => {
    channel.send({ type: "broadcast", event: "state", payload: state });
  };

  // Heartbeat: periodically re-broadcast the current state so viewers that
  // missed a message (dropped broadcast, brief disconnect, device wake) converge
  // back to the latest state within a couple of seconds.
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  channel
    .on("broadcast", { event: "answer" }, ({ payload }) => {
      handlers.onAnswer(payload as AnswerSubmission);
    })
    .on("broadcast", { event: "control" }, ({ payload }) => {
      handlers.onControl?.(payload as ControlCommand);
    })
    .on("broadcast", { event: "request-state" }, () => {
      push(handlers.getState());
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        push(handlers.getState());
        if (!heartbeat) {
          heartbeat = setInterval(() => push(handlers.getState()), 2500);
        }
      }
    });

  return {
    push,
    close: () => {
      if (heartbeat) clearInterval(heartbeat);
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

  const requestState = () =>
    channel.send({ type: "broadcast", event: "request-state", payload: {} });

  channel
    .on("broadcast", { event: "state" }, ({ payload }) => {
      onState(payload as LiveState);
    })
    .subscribe((status) => {
      // Fires on first subscribe and on auto-rejoin after a reconnect.
      if (status === "SUBSCRIBED") requestState();
    });

  // Recover quickly when the device wakes or regains connectivity.
  const onVisible = () => {
    if (document.visibilityState === "visible") requestState();
  };
  window.addEventListener("online", requestState);
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    window.removeEventListener("online", requestState);
    document.removeEventListener("visibilitychange", onVisible);
    supabase.removeChannel(channel);
  };
}

/**
 * Co-host side: send a control command to the owner's device. Returns a
 * function to close the channel when the co-host screen unmounts.
 */
export function openCohostChannel(
  code: string,
  onState: (state: LiveState) => void
): { send: (command: ControlCommand) => void; close: () => void } | null {
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
        channel.send({ type: "broadcast", event: "request-state", payload: {} });
      }
    });
  return {
    send: (command: ControlCommand) => {
      channel.send({ type: "broadcast", event: "control", payload: command });
    },
    close: () => {
      supabase.removeChannel(channel);
    },
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
