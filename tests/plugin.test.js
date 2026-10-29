import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildPrompt, cleanTranslationStress, DEFAULT_PROMPT, languageFamily } from "../prompts.js";
import { makeRequest, readResponse, translate } from "../main.js";

const config = { provider: "openai", apiKey: "test-secret" };
const event = (data) => `data: ${JSON.stringify(data)}\r\n\r\n`;
function sse(text, step = 1) {
  const bytes = new TextEncoder().encode(text);
  return new Response(new ReadableStream({ start(controller) {
    for (let i = 0; i < bytes.length; i += step) controller.enqueue(bytes.slice(i, i + step));
    controller.close();
  } }), { headers: { "content-type": "text/event-stream; charset=utf-8" } });
}

test("清单与默认提示词一致，密钥字段标记为敏感", () => {
  const manifest = JSON.parse(readFileSync(new URL("../manggo.plugin.json", import.meta.url)));
  assert.equal(manifest.manifestVersion, 1);
  const fields = manifest.services[0].config;
  assert.equal(fields.find((f) => f.key === "systemPrompt").default, DEFAULT_PROMPT);
  assert.equal(fields.find((f) => f.key === "apiKey").secret, true);
});

test("识别中英俄代码与名称，不把其他语言误归类", () => {
  for (const [value, expected] of [["zh_CN", "zh"], ["zh-Hant", "zh"], ["English", "en"], ["ru_RU", "ru"], ["auto", "auto"], ["es_ES", "es-es"]]) assert.equal(languageFamily(value), expected);
});

test("三向互译、其他目标语言和纯译模式遵守不同路由", () => {
  for (const from of ["en_US", "zh_CN", "ru_RU", "auto"]) {
    const prompt = buildPrompt("Example.", from, "zh_CN", from);
    assert.match(prompt, /英文原文只输出中文和俄文/);
    assert.match(prompt, /俄文原文只输出中文和英文/);
    assert.match(prompt, /中文原文只输出英文和俄文/);
    assert.match(prompt, /双语模式必须/);
  }
  for (const [target, mode] of [["es_ES", "study"], ["ru_RU", "target"]]) {
    const prompt = buildPrompt("Example.", "en_US", target, "en_US", {mode});
    assert.match(prompt, /本次仅翻译成/);
    assert.doesNotMatch(prompt, /双语模式必须/);
  }
  assert.match(buildPrompt("Hola.", "es_ES", "ru_RU", "es_ES"), /原文若为es_ES，仅翻译成ru_RU/);
  assert.match(buildPrompt("Hola.", "es_ES", "ru_RU", "es_ES"), /其他情况不加学习区/);
});

test("长文压缩学习区，详细模式才重复全文；自定义规则不会重复原文", () => {
  assert.match(buildPrompt("x".repeat(401), "en", "ru", "en"), /当前是长文本/);
  assert.match(buildPrompt("x".repeat(401), "en", "ru", "en", {mode:"detailed"}), /详细模式允许重复完整俄文/);
  const request = makeRequest("unique-original-001", "en", "ru", {config, detect:"en"});
  assert.equal(JSON.stringify(request.body).split("unique-original-001").length - 1, 1);
  assert.equal("temperature" in request.body, false);
});

test("英文学习说明只切换解释语种，兼容旧提示词并保留翻译路由", () => {
  const english = buildPrompt("Check this text.", "en_US", "zh_CN", "en_US", {
    learningLanguage: "en", systemPrompt: "学习区用中文解释。",
  });
  assert.match(english, /英文原文只输出中文和俄文/);
  assert.match(english, /Study notes:/);
  assert.match(english, /Russian reading:/);
  assert.match(english, /学习说明语言为英语（English）/);
  assert.match(english, /覆盖自定义提示词中关于解释语种的要求/);
  assert.match(english, /不要逐句同时附上另一种解释语言/);
  assert.match(buildPrompt("Text.", "en", "ru", "en"), /学习说明语言为中文/);
  const detailed = buildPrompt("x".repeat(401), "en", "ru", "en", {mode:"detailed",learningLanguage:"en"});
  assert.match(detailed, /Study notes:/);
  assert.doesNotMatch(detailed, /作中文解析/);
  for (const [mode, target] of [["target", "ru"], ["study", "es_ES"]]) {
    assert.doesNotMatch(buildPrompt("Text.", "en", target, "en", {mode, learningLanguage:"en"}), /Study notes:|Russian reading:|学习说明语言为/);
  }
});

test("请求构造兼容四家协议且不把密钥放入URL", () => {
  for (const provider of ["gemini", "openai", "deepseek", "qwen"]) {
    const r = makeRequest("text", "en", "ru", {config:{...config,provider}});
    assert.equal(r.url.includes(config.apiKey), false);
    assert.equal(JSON.stringify(r.body).includes(config.apiKey), false);
    if (provider === "gemini") { assert.match(r.url, /:streamGenerateContent\?alt=sse$/); assert.equal(r.headers["x-goog-api-key"], config.apiKey); }
    else assert.match(r.url, /\/chat\/completions$/);
  }
  const custom = makeRequest("text", "en", "ru", {config:{...config,provider:"custom",model:"local",baseUrl:"http://localhost:1234/v1/chat/completions",stream:false}});
  assert.equal(custom.url, "http://localhost:1234/v1/chat/completions");
  assert.equal(custom.body.stream, false);
  assert.equal("reasoning_effort" in custom.body, false);
  const overridden = makeRequest("text", "en", "ru", {config:{...config,provider:"deepseek",model:"different-model"}});
  assert.equal("reasoning_effort" in overridden.body, false);
  assert.equal("thinking" in overridden.body, false);
  assert.throws(() => makeRequest("t", "en", "ru", {config:{...config,baseUrl:"https://example.com?key=test-secret"}}), /不能包含/);
});

test("SSE正确处理逐字节Unicode、CRLF、注释、推理片段和结束标记", async () => {
  const chunks = [];
  const body = ":keepalive\r\n\r\n" + event({choices:[{delta:{reasoning_content:"hidden"}}]}) + event({choices:[{delta:{content:"中ё́"}}]}) + event({choices:[{delta:{content:"文"},finish_reason:"stop"}]}) + "data: [DONE]\r\n\r\n";
  assert.equal(await readResponse(sse(body), "openai", (s) => chunks.push(s)), "中ё́文");
  assert.deepEqual(chunks, ["中ё́", "文"]);
});

test("Gemini过滤思考片段并接受无尾换行的最后事件", async () => {
  const body = "data: " + JSON.stringify({candidates:[{content:{parts:[{text:"hidden",thought:true},{text:"Привет"}]},finishReason:"STOP"}]});
  assert.equal(await readResponse(sse(body), "gemini"), "Привет");
});

test("截断、过滤、无结束标记、坏JSON不被当作成功", async () => {
  for (const body of [event({choices:[{delta:{content:"half"},finish_reason:"length"}]}), event({choices:[{delta:{content:"half"},finish_reason:"content_filter"}]}), event({choices:[{delta:{content:"half"}}]}), "data: {broken}\n\n"]) {
    await assert.rejects(readResponse(sse(body), "openai"));
  }
  await assert.rejects(readResponse(sse(event({candidates:[{finishReason:"SAFETY"}]})), "gemini"));
});

test("最终译文去除俄文重音，学习区和其他语言重音保留", () => {
  assert.equal(cleanTranslationStress("Русский:\nМолоко́ и ёж.\nEspañol: café\n学习：\nмолоко́"), "Русский:\nМолоко и ёж.\nEspañol: café\n学习：\nмолоко́");
  assert.equal(cleanTranslationStress("学习：\nте́кст ещё́ молоко́"), "学习：\nтекст ещё молоко́");
});

test("英文学习区保留多音节重音，纯翻译不把原文标题误当学习分区", () => {
  const sample = "Русский:\nМолоко́.\nStudy notes:\nмолоко́ те́кст ещё́ café";
  assert.equal(cleanTranslationStress(sample), "Русский:\nМолоко.\nStudy notes:\nмолоко́ текст ещё café");
  assert.equal(cleanTranslationStress(sample, false), "Русский:\nМолоко.\nStudy notes:\nмолоко текст ещё café");
});

test("真实入口支持JSON回退、空输入、错误隐私隔离", async () => {
  assert.equal(await translate(" ", "auto", "ru", {}), "");
  const options = {config,utils:{fetch:async () => Response.json({choices:[{message:{content:"Молоко́"},finish_reason:"stop"}]})}};
  assert.equal(await translate("milk", "en", "ru", options), "Молоко");
  const headingResponse = {...options, utils:{fetch:async () => Response.json({choices:[{message:{content:"Study notes:\nмолоко́"},finish_reason:"stop"}]})}};
  assert.equal(await translate("sample", "en", "ru", {...headingResponse,config:{...config,mode:"target"}}), "Study notes:\nмолоко");
  assert.equal(await translate("sample", "en", "es", headingResponse), "Study notes:\nмолоко");
  for (const fetch of [async () => new Response("test-secret",{status:401}), async () => {throw new Error("test-secret");}]) {
    await assert.rejects(translate("milk", "en", "ru", {...options,utils:{fetch}}), (error) => !error.message.includes("test-secret"));
  }
  const broken = new Response(new ReadableStream({start(c) {c.error(new Error("test-secret"));}}), {headers:{"content-type":"text/event-stream"}});
  await assert.rejects(translate("milk", "en", "ru", {...options,utils:{fetch:async()=>broken}}), (error) => !error.message.includes("test-secret"));
});
