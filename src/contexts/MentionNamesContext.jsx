// Resolves the person ids inside `@[Display Name](userId)` tokens to the names
// those people display TODAY, so a mention stops showing a name frozen into
// stored message text at send time.
//
// 🔴 Why this exists at all. `MessageInput` rewrites a typed `@Name` into
// `@[Display Name](userId)` before sending, so an ordinary user message stores
// a resolved display name. Nothing scrubs it on account deletion - grepped,
// `userDeletionController` has no mention handling - so a deleted person's name
// survives in everyone else's text, and so does a renamed person's old name.
// Julia's decision (2026-10-02) was to resolve from the id at display time
// rather than rewrite stored rows, because resolving edits nobody's message and
// fixes renames by the same move.
//
// 🔴 THE INVARIANT, and everything here exists to keep it: "deleted" is
// inferred from ABSENCE, because `deleteUser` hard-deletes the users row and
// leaves no flag. So absence must have exactly one cause. This map therefore
// has three states per id, never two:
//
//   not in the map  -> never looked up (pending, failed, dropped, over the cap)
//                      => the caller keeps the STORED name, i.e. today's
//                         behaviour. The safe direction.
//   mapped to null  -> looked up, no row => the account is gone
//   mapped to object-> looked up, present => show THAT name
//
// ⚠️ A failed request must never land in the second state. Rendering "Former
// Lomir User" over a living person because the network blipped would be a new
// defect, and a confusing one, since it looks like a successful anonymization.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import userService from "../services/userService";
import { MENTION_ALL_ID } from "../utils/mentions";
import { useAuth } from "./AuthContext";

const MentionNamesContext = createContext(null);

// Declared above their use: `useMentionNames` reads them, and a const in the
// temporal dead zone would throw if anything ever called it during module init.
const EMPTY_NAMES = new Map();
const NOOP = () => {};
// Outside the provider there is nothing to wait for, and a caller that awaits
// must still proceed — to the stored name, as it would without this module.
const RESOLVED = () => Promise.resolve(EMPTY_NAMES);

// The server caps a batch at 200; stay under it per request and let the queue
// drain in several rounds rather than silently losing the tail.
const BATCH_LIMIT = 200;
// Mentions arrive in bursts as a transcript renders. One frame of debounce
// turns a page of messages into a single request.
const FLUSH_DELAY_MS = 50;
// `resolveIds` resolves anyway after this long. A caller that AWAITS a
// resolution — the chat search index does, so it does not bake a stale name
// into a cached string — must not hang on a request that never settles. Timing
// out lands on the stored name, which is the same safe direction a failed
// request already takes.
const RESOLVE_TIMEOUT_MS = 5000;

export const MentionNamesProvider = ({ children }) => {
  const { user } = useAuth();
  const isAuthenticated = Boolean(user?.id);

  const [names, setNames] = useState(() => new Map());
  // 🔴 The ref is AUTHORITATIVE and the state mirrors it. `resolveIds` resolves
  // with this map, and its caller resumes on a microtask — before React has
  // committed the matching render. Reading the state, or a ref synced by an
  // effect, would hand that caller the map from BEFORE the resolution it just
  // waited for, which is the stale name it was awaiting to avoid.
  const namesRef = useRef(new Map());
  // Ids already looked up or in flight. Kept out of state because it must be
  // read synchronously while deciding what to enqueue.
  const seenRef = useRef(new Set());
  const pendingRef = useRef(new Set());
  // ⚠️ Ids leave `pending` when a batch is CUT, not when it comes back, so
  // `pending` alone cannot answer "is this id still being looked up". Without
  // this set a waiter resolves mid-request and indexes the stored name.
  const inFlightRef = useRef(new Set());
  const waitersRef = useRef([]);
  const timerRef = useRef(null);

  // A waiter is done when none of its ids is queued or in flight — whether
  // they resolved, came back absent or failed. All three leave the caller with
  // a correct map to read: a name, a null, or nothing (keep the stored name).
  const settleWaiters = useCallback(() => {
    if (waitersRef.current.length === 0) return;
    const stillWaiting = [];

    for (const waiter of waitersRef.current) {
      const outstanding = [...waiter.ids].some(
        (id) => pendingRef.current.has(id) || inFlightRef.current.has(id),
      );
      if (outstanding) stillWaiting.push(waiter);
      else waiter.settle();
    }

    waitersRef.current = stillWaiting;
  }, []);

  const flush = useCallback(async () => {
    timerRef.current = null;
    const batch = [...pendingRef.current].slice(0, BATCH_LIMIT);
    if (batch.length === 0) {
      settleWaiters();
      return;
    }
    batch.forEach((id) => {
      pendingRef.current.delete(id);
      inFlightRef.current.add(id);
    });

    try {
      const response = await userService.resolveDisplayNames(batch);
      const requested = (response?.data?.requested ?? []).map(String);
      const people = response?.data?.people ?? [];
      const byId = new Map(people.map((p) => [String(p.id), p]));

      const next = new Map(namesRef.current);
      // ⚠️ Iterate `requested`, NOT `batch`. An id the server dropped
      // (non-numeric, past its cap) is absent from `requested`, and writing
      // null for it would claim a deletion the server never reported.
      for (const id of requested) {
        next.set(id, byId.get(id) ?? null);
      }
      namesRef.current = next;
      setNames(next);
    } catch (error) {
      // Forgetful on purpose: the ids leave `seen` so a later render retries,
      // and nothing is written to the map, so every affected mention keeps its
      // stored name. That fallback is correct.
      //
      // 🔴 But NOT silent, and the first version of this was. A failure here
      // renders exactly like "the feature was never implemented" - every
      // mention keeps the name frozen in the message text - so a swallowed
      // error is indistinguishable from a missing fix. That cost a walk on
      // 2026-10-05: the symptom was reported, and there was nothing in the
      // console to tell the two apart. `services/api.js` `call` already logs
      // and rethrows, so this adds the CONSEQUENCE, which is the part a reader
      // of the console cannot infer from an axios error.
      console.warn(
        `[mentions] ${batch.length} id(s) could not be resolved; those mentions ` +
          `keep the name stored in the message text.`,
        error,
      );
      batch.forEach((id) => seenRef.current.delete(id));
    } finally {
      batch.forEach((id) => inFlightRef.current.delete(id));
    }

    if (pendingRef.current.size > 0) {
      timerRef.current = setTimeout(flush, FLUSH_DELAY_MS);
    }

    // After the re-arm, so a waiter spanning several rounds is not settled by
    // the first one.
    settleWaiters();
  }, [settleWaiters]);

  const requestIds = useCallback(
    (ids) => {
      if (!isAuthenticated || !ids || ids.length === 0) return;
      let added = false;
      for (const raw of ids) {
        const id = String(raw);
        // Filtered here rather than at six call sites: `@all` is not a user,
        // the server would drop it as non-numeric anyway, and leaving it in
        // would spend a request round on an id that can never resolve.
        if (id === MENTION_ALL_ID) continue;
        if (seenRef.current.has(id)) continue;
        seenRef.current.add(id);
        pendingRef.current.add(id);
        added = true;
      }
      if (added && timerRef.current == null) {
        timerRef.current = setTimeout(flush, FLUSH_DELAY_MS);
      }
    },
    [flush, isAuthenticated],
  );

  /**
   * `requestIds` plus a promise that settles once those ids have been looked
   * up. Fire-and-forget is right for a RENDER — the surface paints the stored
   * name and repaints when the map updates — and wrong for anything that
   * builds a CACHED artefact from the map, because there is no repaint to
   * catch: the chat search index is a string per conversation, built once and
   * kept (`useChatSearchState`). Awaiting here is what stops a stale name
   * being baked into it.
   *
   * ⚠️ It never rejects, and it resolves on failure and on timeout as well as
   * on success. It resolves WITH the name map, which the caller must use
   * instead of the `names` it closed over: that one is a render's value and is
   * a resolution behind. For an unresolved id the map holds nothing, so the
   * caller keeps the stored name — the same safe direction the rest of this
   * module takes.
   */
  const resolveIds = useCallback(
    (ids) => {
      requestIds(ids);

      const wanted = new Set(
        (ids ?? []).map(String).filter((id) => id !== MENTION_ALL_ID),
      );
      if (wanted.size === 0) return Promise.resolve(namesRef.current);

      const outstanding = [...wanted].some(
        (id) => pendingRef.current.has(id) || inFlightRef.current.has(id),
      );
      if (!outstanding) return Promise.resolve(namesRef.current);

      return new Promise((resolve) => {
        let done = false;
        const settle = () => {
          if (done) return;
          done = true;
          clearTimeout(timeoutId);
          resolve(namesRef.current);
        };
        const timeoutId = setTimeout(() => {
          waitersRef.current = waitersRef.current.filter(
            (waiter) => waiter.settle !== settle,
          );
          settle();
        }, RESOLVE_TIMEOUT_MS);

        waitersRef.current.push({ ids: wanted, settle });
      });
    },
    [requestIds],
  );

  // A different account must not inherit the previous one's resolutions.
  useEffect(() => {
    if (isAuthenticated) return;
    seenRef.current = new Set();
    pendingRef.current = new Set();
    inFlightRef.current = new Set();
    namesRef.current = new Map();
    // Settled, not dropped: a caller awaiting a logged-out lookup would hang
    // for RESOLVE_TIMEOUT_MS otherwise, and it has nothing left to wait for.
    waitersRef.current.forEach((waiter) => waiter.settle());
    waitersRef.current = [];
    setNames(new Map());
  }, [isAuthenticated]);

  useEffect(
    () => () => {
      if (timerRef.current != null) clearTimeout(timerRef.current);
    },
    [],
  );

  const value = useMemo(
    () => ({ names, requestIds, resolveIds }),
    [names, requestIds, resolveIds],
  );

  return (
    <MentionNamesContext.Provider value={value}>
      {children}
    </MentionNamesContext.Provider>
  );
};

/**
 * ⚠️ Returns an inert value outside the provider rather than throwing, so a
 * component rendered in isolation (a test, a storybook-style page) falls back
 * to stored names instead of crashing.
 */
export const useMentionNames = () => {
  const context = useContext(MentionNamesContext);
  if (context) return context;
  return { names: EMPTY_NAMES, requestIds: NOOP, resolveIds: RESOLVED };
};

export default MentionNamesContext;
