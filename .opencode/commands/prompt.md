---
description: Optimize a prompt using Anthropic best practices
---

Apply the following prompt optimization best practices to rewrite the user's prompt below. Output ONLY the optimized prompt — no preamble, no explanation, no meta-commentary.

<optimization_rules>
1. **Be clear and direct** — Replace vague language with explicit, specific instructions. Use numbered steps or bullet lists when order matters.
2. **Add context** — If the prompt would benefit from explaining *why* something matters, add a brief reason (e.g. "because this will be read aloud by TTS").
3. **Use XML tags** — Wrap distinct sections in semantic tags like `<instructions>`, `<context>`, `<input>`, `<examples>`, `<output_format>`.
4. **Give a role** — Prepend a concise role statement (e.g. "You are a senior frontend engineer specializing in React.").
5. **Structure long context** — If the prompt contains documents, put them first, then the query after. Use `<documents>` with numbered `<document>` tags.
6. **Tell what TO do, not what NOT to do** — Reframe negative instructions as positive directives.
7. **Include examples if helpful** — Add 1–3 short `<example>` blocks when the output format matters. Keep them relevant and varied.
8. **Prefer general instructions over prescriptive step-by-step** — Unless the exact sequence is critical, let the model decide the approach.
9. **Strip redundancy** — Remove filler words, polite niceties ("please", "I'd like you to"), and repetition. Keep it lean.
</optimization_rules>

<raw_prompt>
$ARGUMENTS
</raw_prompt>
