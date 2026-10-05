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

// The server caps a batch at 200; stay under it per request and let the queue
// drain in several rounds rather than silently losing the tail.
const BATCH_LIMIT = 200;
// Mentions arrive in bursts as a transcript renders. One frame of debounce
// turns a page of messages into a single request.
const FLUSH_DELAY_MS = 50;

export const MentionNamesProvider = ({ children }) => {
  const { user } = useAuth();
  const isAuthenticated = Boolean(user?.id);

  const [names, setNames] = useState(() => new Map());
  // Ids already looked up or in flight. Kept out of state because it must be
  // read synchronously while deciding what to enqueue.
  const seenRef = useRef(new Set());
  const pendingRef = useRef(new Set());
  const timerRef = useRef(null);

  const flush = useCallback(async () => {
    timerRef.current = null;
    const batch = [...pendingRef.current].slice(0, BATCH_LIMIT);
    if (batch.length === 0) return;
    batch.forEach((id) => pendingRef.current.delete(id));

    try {
      const response = await userService.resolveDisplayNames(batch);
      const requested = (response?.data?.requested ?? []).map(String);
      const people = response?.data?.people ?? [];
      const byId = new Map(people.map((p) => [String(p.id), p]));

      setNames((previous) => {
        const next = new Map(previous);
        // ⚠️ Iterate `requested`, NOT `batch`. An id the server dropped
        // (non-numeric, past its cap) is absent from `requested`, and writing
        // null for it would claim a deletion the server never reported.
        for (const id of requested) {
          next.set(id, byId.get(id) ?? null);
        }
        return next;
      });
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
    }

    if (pendingRef.current.size > 0) {
      timerRef.current = setTimeout(flush, FLUSH_DELAY_MS);
    }
  }, []);

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

  // A different account must not inherit the previous one's resolutions.
  useEffect(() => {
    if (isAuthenticated) return;
    seenRef.current = new Set();
    pendingRef.current = new Set();
    setNames(new Map());
  }, [isAuthenticated]);

  useEffect(
    () => () => {
      if (timerRef.current != null) clearTimeout(timerRef.current);
    },
    [],
  );

  const value = useMemo(() => ({ names, requestIds }), [names, requestIds]);

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
  return { names: EMPTY_NAMES, requestIds: NOOP };
};

export default MentionNamesContext;
