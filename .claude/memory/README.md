# Project memory

Durable context files for AI coding sessions working on this repository.

Anything in this directory is read at the start of a session to refresh the assistant on decisions, meetings, and project-specific conventions that aren't obvious from the code alone. Files here are **not** bundled into the runtime app and are **not** shipped to production — they exist purely as a scratchpad for context continuity between sessions.

## Contents

- `2026-04-22-sohail-meeting.txt` — summary of the 2026-04-22 Zoom meeting with Muhammad Ahmed (EMU), Ibrahim Samad, and hilal khan. Reaffirms the strict-grounding contract, the vector-based context identification method, and rules 10/11 as already implemented.

## Format

Plain text. No frontmatter. Newest content at the bottom of each file. Short human-written notes are fine — this isn't a structured store.
