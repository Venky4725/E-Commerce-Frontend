export function parseStreamData(data) {
  if (typeof data !== "string") {
    return { type: "skip", reason: "non-string" };
  }

  const trimmed = data.trim();

  if (!trimmed) {
    return { type: "skip", reason: "empty" };
  }

  if (trimmed === "[DONE]") {
    return { type: "done" };
  }

  try {
    const parsed = JSON.parse(trimmed);

    if (!parsed || typeof parsed !== "object") {
      return { type: "skip", reason: "invalid-payload" };
    }

    const delta =
      typeof parsed.message === "string"
        ? parsed.message
        : typeof parsed.content === "string"
        ? parsed.content
        : typeof parsed.text === "string"
        ? parsed.text
        : typeof parsed.delta === "string"
        ? parsed.delta
        : "";

    const products = Array.isArray(parsed.products) ? parsed.products : [];

    return {
      type: "payload",
      delta,
      products,
    };
  } catch (error) {
    return {
      type: "error",
      error,
    };
  }
}
