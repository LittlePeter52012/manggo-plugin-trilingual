import { buildPrompt, cleanTranslationStress, languageFamily } from "./prompts.js";

class PluginError extends Error {}

export const PRESETS = {
  gemini: { baseUrl: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-3.8-flash" },
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-6.1-terra" },
  deepseek: { baseUrl: "https://api.deepseek.com", model: "deepseek-flash" },
  qwen: { baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen3.7-plus" },
};

export function makeRequest(text, from, to, options) {
  const config = options.config || {};
  const provider = config.provider || "gemini";
  if (!(provider in PRESETS) && provider !== "custom") throw new PluginError("请选择有效的服务商。 / Select a valid provider.");
  const preset = PRESETS[provider] || {};
  const apiKey = String(config.apiKey || "").trim();
  const model = String(config.model || preset.model || "").trim();
  const base = String(config.baseUrl || preset.baseUrl || "").trim().replace(/\/+$/, "");
  if (!apiKey || !model || !base) throw new PluginError("请填写API密钥；自定义服务还需填写模型和接口地址。 / Enter your API key; custom providers also require a model and base URL.");
  let parsed;
  try { parsed = new URL(base); } catch { throw new PluginError("接口地址必须是有效的HTTP或HTTPS地址。 / Enter a valid HTTP or HTTPS base URL."); }
  if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new PluginError("接口地址仅支持HTTP/HTTPS，且不能包含账号、密钥、查询参数或片段。 / Use HTTP/HTTPS without credentials, query parameters or fragments.");
  }
  const stream = config.stream !== false;
  const prompt = buildPrompt(text, from, to, options.detect, config);
  let url;
  let headers = { "Content-Type": "application/json" };
  let body;
  if (provider === "gemini") {
    if (/\/models\//.test(parsed.pathname)) throw new PluginError("Gemini接口地址请填写到 /v1beta，不要包含模型路径。 / Gemini base URLs should end at /v1beta, without a model path.");
    url = `${base}/models/${encodeURIComponent(model.replace(/^models\//, ""))}:${stream ? "streamGenerateContent?alt=sse" : "generateContent"}`;
    headers["x-goog-api-key"] = apiKey;
    body = {
      systemInstruction: { parts: [{ text: prompt }] },
      contents: [{ role: "user", parts: [{ text }] }],
    };
    if (/^gemini-3\./.test(model.replace(/^models\//, ""))) body.generationConfig = { thinkingConfig: { thinkingLevel: "LOW" } };
  } else {
    url = base.endsWith("/chat/completions") ? base : `${base}/chat/completions`;
    headers.Authorization = `Bearer ${apiKey}`;
    body = { model, stream, messages: [{ role: "system", content: prompt }, { role: "user", content: text }] };
    if (provider === "deepseek" && model === PRESETS.deepseek.model) {
      body.thinking = { type: "enabled" };
      body.reasoning_effort = "low";
    } else if (provider === "openai" && model === PRESETS.openai.model) {
      body.reasoning_effort = "low";
    } else if (provider === "qwen" && model === PRESETS.qwen.model) {
      body.reasoning_effort = "low";
    }
  }
  return { url, headers, body, provider, stream };
}

function extractText(data, provider) {
  if (data.error) throw new PluginError("服务商返回错误，请检查模型权限、额度和接口配置。 / Provider error: check model access, quota and endpoint settings.");
  if (provider === "gemini") {
    const candidate = data.candidates?.[0];
    if (candidate?.finishReason === "MAX_TOKENS") throw new PluginError("译文被长度限制截断，请分段翻译。 / The output was truncated; split the source into smaller passages.");
    if (candidate?.finishReason && candidate.finishReason !== "STOP") throw new PluginError("服务未正常完成译文，可能触发内容过滤。 / The response did not finish normally; content filtering may apply.");
    return (candidate?.content?.parts || []).filter((part) => !part.thought && typeof part.text === "string").map((part) => part.text).join("");
  }
  const choice = data.choices?.[0];
  if (choice?.finish_reason === "length") throw new PluginError("译文被长度限制截断，请分段翻译。 / The output was truncated; split the source into smaller passages.");
  if (choice?.finish_reason && choice.finish_reason !== "stop") throw new PluginError("服务未正常完成译文，请检查模型兼容性或内容过滤。 / The response did not finish normally; check model compatibility or content filtering.");
  const text = choice?.delta?.content ?? choice?.message?.content;
  return typeof text === "string" ? text : "";
}

export async function readResponse(response, provider, setResult) {
  if (!response.headers?.get("content-type")?.includes("text/event-stream")) {
    return extractText(await response.json(), provider);
  }
  if (!response.body?.getReader) throw new PluginError("当前运行环境不能读取流式回复，请关闭流式输出后重试。 / This runtime cannot read streaming responses; disable Streaming and retry.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let eventLines = [];
  let output = "";
  let complete = false;
  function consumeEvent() {
    const raw = eventLines.filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
    eventLines = [];
    if (!raw) return;
    if (raw === "[DONE]") { complete = true; return; }
    let data;
    try { data = JSON.parse(raw); } catch { throw new PluginError("服务返回了无效的流式JSON，未把不完整内容视为成功。 / Invalid streaming JSON; the incomplete response was rejected."); }
    const chunk = extractText(data, provider);
    if (provider === "gemini" ? data.candidates?.[0]?.finishReason === "STOP" : data.choices?.[0]?.finish_reason === "stop") complete = true;
    if (chunk) {
      output += chunk;
      setResult?.(chunk);
    }
  }
  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let index;
      while ((index = pending.indexOf("\n")) >= 0) {
        const line = pending.slice(0, index).replace(/\r$/, "");
        pending = pending.slice(index + 1);
        if (line === "") consumeEvent(); else eventLines.push(line);
      }
      if (done) break;
    }
    if (pending) eventLines.push(pending.replace(/\r$/, ""));
    if (eventLines.length) consumeEvent();
    if (!complete) throw new PluginError("流式回复意外中断，请重试；当前内容可能不完整。 / Streaming ended unexpectedly; retry because the output may be incomplete.");
    return output;
  } finally {
    reader.releaseLock();
  }
}

export async function translate(text, from, to, options) {
  if (typeof text !== "string" || !text.trim()) return "";
  const request = makeRequest(text, from, to, options);
  let response;
  try {
    response = await options.utils.fetch(request.url, {
      method: "POST", headers: request.headers, body: JSON.stringify(request.body), redirect: "error",
    });
  } catch {
    throw new PluginError("无法连接翻译服务，请检查接口地址、网络代理或服务状态。 / Connection failed; check the endpoint, proxy and provider status.");
  }
  if (!response.ok) throw new PluginError(`翻译服务 HTTP ${response.status}：请检查密钥、模型权限、额度及接口地址。 / Check your key, model access, quota and endpoint.`);
  let result;
  try {
    result = await readResponse(response, request.provider, options.setResult);
  } catch (error) {
    if (error instanceof SyntaxError) throw new PluginError("服务返回的内容不是有效JSON，请检查接口地址。 / Invalid JSON response; check the endpoint.");
    if (error instanceof PluginError) throw error;
    throw new PluginError("读取翻译回复失败，请检查网络或接口兼容性后重试。 / Could not read the response; check network and endpoint compatibility.");
  }
  if (!result.trim()) throw new PluginError("服务没有返回可显示的译文，可能被过滤或模型配置不兼容。 / No displayable translation; check filtering or model compatibility.");
  const allowStudyNotes = options.config?.mode !== "target" && ["auto", "zh", "en", "ru"].includes(languageFamily(to));
  return cleanTranslationStress(result.trim(), allowStudyNotes);
}
