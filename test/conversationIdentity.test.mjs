// node --test (npm test). Pure logic of src/utils/conversationIdentity.js.
import test from "node:test";
import assert from "node:assert/strict";

import {
  isConversation,
  normalizeConversationType,
} from "../src/utils/conversationIdentity.js";

test("a missing or unknown kind is a direct chat", () => {
  assert.equal(normalizeConversationType("team"), "team");
  assert.equal(normalizeConversationType("direct"), "direct");
  assert.equal(normalizeConversationType(undefined), "direct");
  assert.equal(normalizeConversationType(null), "direct");
});

test("team 1 and the direct chat with user 1 are different conversations", () => {
  const team = { type: "team", id: 1 };
  const direct = { type: "direct", id: 1 };
  assert.equal(isConversation(team, "team", 1), true);
  assert.equal(isConversation(direct, "direct", 1), true);
  assert.equal(isConversation(team, "direct", 1), false);
  assert.equal(isConversation(direct, "team", 1), false);
});

test("numbers and strings of the same number match (URL ids are strings)", () => {
  assert.equal(isConversation({ type: "team", id: 7 }, "team", "7"), true);
  assert.equal(isConversation({ type: "direct", id: "7" }, "direct", 7), true);
  assert.equal(isConversation({ type: "direct", id: 7 }, "direct", 70), false);
});

test("a conversation without a kind is direct", () => {
  assert.equal(isConversation({ id: 3 }, "direct", 3), true);
  assert.equal(isConversation({ id: 3 }, undefined, 3), true);
  assert.equal(isConversation({ id: 3 }, "team", 3), false);
});

test("nothing matches a missing conversation or a missing number", () => {
  assert.equal(isConversation(null, "direct", 1), false);
  assert.equal(isConversation(undefined, "team", 1), false);
  assert.equal(isConversation({ type: "team", id: 1 }, "team", null), false);
  assert.equal(isConversation({ type: "team", id: 1 }, "team", undefined), false);
});
