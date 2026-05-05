// Vite dev-server middleware that proxies /api/assess to OpenAI.
//
// The browser cannot safely hold OPENAI_API_KEY. This plugin runs in Node as
// part of the dev server, reads the key from .env.local via Vite's loadEnv,
// and uses server.ssrLoadModule to transform the TS knowledge base + prompt
// builder on the fly so they share a single source of truth with the frontend.
//
// In production (vite preview / a real deploy) you'd swap this for a serverless
// function with the same /api/assess shape — the frontend doesn't change.

import { loadEnv } from "vite";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export function assessPlugin() {
  let env = {};
  return {
    name: "landforge-assess",
    config(_config, { mode }) {
      env = loadEnv(mode, process.cwd(), "");
    },
    configureServer(server) {
      server.middlewares.use("/api/assess", async (req, res) => {
        if (req.method !== "POST") {
          sendJson(res, 405, { error: "method not allowed" });
          return;
        }
        const apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
        if (!apiKey) {
          sendJson(res, 500, { error: "OPENAI_API_KEY not set in .env.local" });
          return;
        }
        const model = env.OPENAI_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";

        try {
          const { snapshot, input, output } = await readJsonBody(req);
          if (!snapshot || !input || !output) {
            sendJson(res, 400, { error: "missing snapshot, input, or output" });
            return;
          }

          // Pull the TS modules through Vite's transform pipeline so we share
          // one knowledge base across server + client.
          const kb = await server.ssrLoadModule("/src/services/rag/knowledgeBase.ts");
          const promptMod = await server.ssrLoadModule("/src/services/rag/prompt.ts");

          const chunks = kb.selectChunks({ snapshot, input, output });
          const userPrompt = promptMod.buildUserPrompt({ snapshot, input, output, chunks });

          const openaiRes = await fetch(OPENAI_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: promptMod.SYSTEM_PROMPT },
                { role: "user", content: userPrompt },
              ],
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: "landforge_cards",
                  strict: true,
                  schema: promptMod.RESPONSE_SCHEMA,
                },
              },
              temperature: 0.4,
            }),
          });

          if (!openaiRes.ok) {
            const errText = await openaiRes.text().catch(() => "");
            sendJson(res, 502, {
              error: `openai ${openaiRes.status}: ${errText.slice(0, 500)}`,
            });
            return;
          }
          const completion = await openaiRes.json();
          const content = completion?.choices?.[0]?.message?.content;
          if (!content) {
            sendJson(res, 502, { error: "openai response missing content" });
            return;
          }
          let parsed;
          try {
            parsed = JSON.parse(content);
          } catch {
            sendJson(res, 502, { error: "openai content was not valid JSON" });
            return;
          }
          sendJson(res, 200, {
            cards: parsed.cards,
            usedChunks: chunks.map((c) => c.id),
          });
        } catch (err) {
          sendJson(res, 500, {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      });
    },
  };
}
