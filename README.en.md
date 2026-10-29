# Trilingual Companion for Manggo · 三语译伴

[中文](README.md) | English

A native Manggo plugin for Chinese, English and Russian translation, with a separate section for Russian pronunciation and study notes. Copy ordinary Russian without stress marks, or use the study section to practise reading.

**Bring your own API key. No shared key or developer-funded API quota is included.**

## Install

1. Download a `.mplugin` package from [Releases](https://github.com/LittlePeter52012/manggo-plugin-trilingual/releases).
2. Install it in Manggo's **Plugin Management** page and prepare the Bun runtime when prompted.
3. Add **三语译伴 / Trilingual** under **Translation Services**, select a provider and enter your own API key.
4. Leave Model and Base URL blank to use that provider's defaults, or supply your own values.
5. Set **Study notes language** to **English** or **中文 / Chinese**. Chinese is the default. This changes explanations, not translation targets.

This plugin uses `manggo.plugin.v1`. It is not an old Pot `.potext` plugin.

Bilingual settings and the study-language selector require **v1.1.0 or later**. They are not included in v1.0.0; check the actual version on the Releases page.

## Output modes

| Mode | Chinese, English or Russian input with a target in that group | Any other target |
| --- | --- | --- |
| Smart study — default | The other two languages plus concise study notes | Only the selected target language |
| Detailed study | The other two languages, a full stressed Russian reading and up to four explanations | Only the selected target language |
| Translation only | Only the selected target, without headings or study notes | Only the selected target language |

English input produces Chinese and Russian; Russian produces Chinese and English; Chinese produces English and Russian. When the selected target is one of the output languages, it comes first. The model uses the main language of mixed text rather than individual foreign terms. Other source languages are translated into the selected target. Chinese is simplified unless a traditional Chinese target is selected.

Smart study gives a complete stressed Russian reading and up to two points for short sentences. Words and phrases get a lemma, relevant grammar and a collocation. Long passages get up to four difficult words and one necessary grammar point instead of a repeated full reading. Detailed study allows the full Russian reading for long passages.

Russian translation blocks have no stress marks and retain ordinary `ё`. Stress marks belong in the study section; monosyllables and words containing `ё` do not receive extra marks. Notes are in the selected explanation language, under `Study notes:` or `学习：`; the plugin does not request duplicate explanations in both languages.

### Example format

Input: `Please check the text.` Mode: Smart study. Study notes language: English. Wording varies by model.

```text
中文：
请检查这段文字。

Русский:
Пожалуйста, проверьте текст.

Study notes:
Russian reading: Пожа́луйста, прове́рьте текст.
прове́рьте is a polite/plural imperative of прове́рить ("to check").
```

For one-click copying without study material, use **Translation only**. Manggo's whole-card copy button includes the study section in study modes; alternatively, select only the translation text. You can configure separate study and translation-only service instances, but enabling both makes two requests.

## Providers and custom endpoints

| Provider | Default model | Default base URL |
| --- | --- | --- |
| Gemini | `gemini-3.8-flash` | `https://generativelanguage.googleapis.com/v1beta` |
| OpenAI | `gpt-6.1-terra` | `https://api.openai.com/v1` |
| DeepSeek | `deepseek-flash` | `https://api.deepseek.com` |
| Qwen | `qwen3.7-plus` | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| Custom | Required | An OpenAI Chat Completions-compatible endpoint |

Defaults were checked on 2026-10-29. Model availability depends on your account. Qwen uses the mainland China endpoint by default; enter the correct endpoint for another region or workspace. OpenAI-compatible URLs may end in `/v1` or `/chat/completions`; Gemini URLs should end in `/v1beta`, without a model path. Clear or update custom model and URL fields when changing providers.

Presets use low reasoning settings where configured. Temperature is not forced. Custom compatible endpoints receive no provider-specific reasoning parameters; use Custom if a replacement model does not accept preset parameters. Disable Streaming for endpoints without SSE support.

## Prompts and costs

The editable prompt may be written in Chinese or English. The plugin appends the current target, output mode and study-language rules, so no source-text placeholder is needed. Existing custom prompts are preserved when upgrading; the study-language selector overrides an older instruction about the explanation language. Missing settings default to Chinese notes.

The source is sent once. There is no separate language-detection request, and one service instance calls one selected provider. Other enabled instances or built-in services generate their own requests. Smart study limits explanations; detailed study produces more output. Actual charges also depend on input length, translations and billable reasoning tokens.

## Data and privacy

The plugin runs locally in Bun and sends the source text, prompt and API key to the configured provider endpoint. It has no telemetry, developer relay server or embedded keys. Errors do not display raw provider responses. Use trusted HTTPS endpoints; HTTP is intended only for trusted local testing. Release packages contain no personal settings or translation history.

Manggo configuration exports may contain API keys. Share a Release package or repository link, never a personal configuration ZIP, database, `.env` file or screenshot showing a key. For bug reports, use invented sample text and remove keys, Authorization headers and private content.

Translations, grammar explanations and Russian stress placement can be wrong, particularly for names, specialist terms and ambiguous words. They are not a substitute for a dictionary. Streaming output is provisional until the complete response is cleaned; truncation, filtering or an unexpected interruption is reported as an error. See [validation records](VALIDATION.en.md) for what was actually tested.

## Development and community

No dependencies need installing. Use Node.js 18+ for tests and Python 3 to build:

```sh
npm test
npm run package
```

Packages and SHA-256 checksums are written to `dist/`. Packaging uses an explicit file allowlist.

Browse the [manggo-plugin topic](https://github.com/topics/manggo-plugin). Report issues in [this repository](https://github.com/LittlePeter52012/manggo-plugin-trilingual/issues) with the Manggo/plugin versions, provider/model, output mode and a sanitized example. Do not attach a personal configuration backup.

Protocol: [Manggo native plugin guide](https://github.com/Pylogmon/manggo-plugin). Provider references: [Gemini](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash), [OpenAI](https://developers.openai.com/api/docs/guides/latest-model), [DeepSeek](https://api-docs.deepseek.com/guides/thinking_mode/), [Qwen](https://help.aliyun.com/zh/model-studio/deep-thinking).

## License

[MIT](LICENSE).
