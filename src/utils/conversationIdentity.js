// A chat conversation is identified by its kind AND its number: the number of a
// team and the number of a user are two separate number spaces, so team 1 and the
// direct chat with user 1 are different conversations (STATUS item 64). No
// imports on purpose, so node:test can load this file (test/).

// A missing kind means a direct chat, as everywhere on the chat page.
export const normalizeConversationType = (type) =>
  type === "team" ? "team" : "direct";

// True when `conversation` is the conversation of this kind and number.
export const isConversation = (conversation, type, id) =>
  conversation != null &&
  id != null &&
  normalizeConversationType(conversation.type) ===
    normalizeConversationType(type) &&
  String(conversation.id) === String(id);
