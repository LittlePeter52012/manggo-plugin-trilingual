# Validation record

[中文](VALIDATION.md) | English

Date: 2026-10-29. Environment: macOS, Manggo 1.2.2 and Manggo's Bun 1.3.14 plugin runtime.

## v1.0.0 baseline

- Automated Node tests covered the manifest, routing, sending the source once, request construction, SSE byte boundaries, UTF-8, CRLF, completion markers, errors and stress-mark separation.
- The `.mplugin` installed in Manggo, appeared as a native plugin and generated its settings form.
- English, Russian and Chinese inputs were tested in the application. The study instance returned the other two languages and a Russian reading; the translation-only instance returned one target language. Both handled the application's Russian fallback target for Chinese input.
- Real streaming calls through the plugin entry point completed for Gemini, OpenAI, DeepSeek and Qwen. Only visible answers were returned, without reasoning fragments.
- Real Gemini calls for Russian translation-only output and a Spanish target completed without dual-language headings or study notes.

Application tests used invented short examples such as “Please bring the revised text tomorrow.” No personal documents were uploaded for testing.

## v1.1.0 bilingual update

- All 12 automated tests passed. Additional cases cover English study headings, legacy prompt compatibility, separating notes language from translation targets, and preventing a quoted study heading from enabling stress marks in translation-only mode.
- Chinese and English documentation, settings labels and error messages are included. The package allowlist contains both documentation languages, without personal configuration or test credentials.
- Eight real plugin API calls passed: English notes across all four providers, overriding a legacy Chinese-only prompt, default Chinese notes, Russian translation-only output, another target (Spanish), and detailed mode. Manual inspection found no substantive meaning or stress errors in these short samples; this does not invalidate the earlier problems described below.
- The 1.1.0 candidate installed and loaded in Manggo, with bilingual settings labels and the default Chinese option visible. Native automation could not operate the custom language dropdown, so the full select-English/save/translate UI flow is not claimed as tested; English-output evidence comes from the real API calls above. Version 1.0.0 was restored afterward, with all 12 service configurations unchanged.

## Limits of the evidence

API success is not a perfect language-quality score. A Qwen sample placed stress incorrectly in `пожалуйста` and `принесите`; a Gemini sample added an unnecessary mark to the monosyllable `текст`. The plugin deterministically removes Russian stress marks from ordinary translation blocks, and removes unnecessary marks from monosyllables or words containing `ё` in study notes. It does not guess the correct stress position for other words.

Gemini is the default, with other providers available. Study notes and stress placement may need dictionary or human review. This is not a large-corpus benchmark; not all custom models, languages or platforms have been tested.

The original Spanish-target and Russian translation-only cases were real plugin API tests. Application installation, three-way detection and fallback behavior were tested separately; one type of evidence is not presented as the other.
