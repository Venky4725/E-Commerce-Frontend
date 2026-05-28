import test from "node:test";
import assert from "node:assert/strict";
import { parseStreamData } from "./aiChatStreamUtils.js";

test("parseStreamData returns text deltas from supported fields", () => {
  assert.deepEqual(parseStreamData('{"message":"Hello"}'), {
    type: "payload",
    delta: "Hello",
    products: [],
  });

  assert.deepEqual(parseStreamData('{"content":"Hi there"}'), {
    type: "payload",
    delta: "Hi there",
    products: [],
  });

  assert.deepEqual(parseStreamData('{"delta":"!"}'), {
    type: "payload",
    delta: "!",
    products: [],
  });
});

test("parseStreamData returns done marker and skips malformed chunks", () => {
  assert.deepEqual(parseStreamData("[DONE]"), { type: "done" });

  const malformed = parseStreamData("not-json");

  assert.equal(malformed.type, "error");
  assert.equal(malformed.error instanceof Error, true);
});
