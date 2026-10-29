# 三语译伴 · Manggo Trilingual

面向中英俄交流与俄语学习的 Manggo 原生翻译插件。普通译文可以直接复制；俄文重音和语法说明放在单独的学习区。

## 安装

1. 从 [Releases](https://github.com/LittlePeter52012/manggo-plugin-trilingual/releases) 下载 `.mplugin` 文件。
2. 在 Manggo「设置 → 插件管理」安装，按应用提示准备 Bun 运行时。
3. 在「翻译服务」添加「三语译伴」，选择服务商并填写自己的 API 密钥。
4. 模型和接口地址留空使用下表预设，也可以自行更改。

本插件使用 `manggo.plugin.v1`；不支持旧 Pot 的 `.potext` 加载方式。

## 输出模式

| 模式 | 中英俄输入，目标也属于这三种 | 选择其他目标语言 |
| --- | --- | --- |
| 智能学习（默认） | 翻译成另外两种语言，附简要学习 | 只输出目标语言 |
| 详细学习 | 另外两种译文、完整带重音俄语朗读、至多4个解析点 | 只输出目标语言 |
| 纯翻译 | 只输出所选目标语言，无标题或学习区 | 只输出目标语言 |

例如，英文原文会得到中文和俄文；俄文原文会得到中文和英文；中文原文会得到英文和俄文。目标语言在两种译文中时优先显示。自动识别时按原文主语言判断，少量夹杂词不会改变主语言；其他源语言按所选目标翻译。中文默认简体，选择繁体时使用繁体。

智能学习模式下，短句提供完整俄语重音朗读和至多2个要点；单词或短语提供原形、必要语法和搭配；长文仅挑至多4个难词及1个语法点。俄文译文不含重音符，保留正常拼写中的 `ё`。重音只放在学习区，单音节词和 `ё` 不再加符号。

需要一键复制干净译文时使用「纯翻译」。学习模式中整卡复制仍会包含学习区，也可单独选中译文复制。可以添加两个服务实例，分别设置学习和纯翻译，按需启用；同时启用会各自发起请求。

## 服务商与自定义接口

| 服务商 | 默认模型 | 默认接口 |
| --- | --- | --- |
| Gemini | `gemini-3.8-flash` | `https://generativelanguage.googleapis.com/v1beta` |
| OpenAI | `gpt-6.1-terra` | `https://api.openai.com/v1` |
| DeepSeek | `deepseek-flash` | `https://api.deepseek.com` |
| Qwen | `qwen3.7-plus` | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| 自定义 | 自行填写 | OpenAI Chat Completions 兼容地址 |

预设截至2026-10-29；可用模型与权限以账号为准。Qwen 预设使用中国内地接口，其他地域或业务空间须填写对应地址。OpenAI 兼容接口可填到 `/v1` 或完整 `/chat/completions`；Gemini 地址填到 `/v1beta`，不要再加模型路径。服务商切换后，应清空旧的自定义模型和地址，或同步改成新服务的值。

预设使用较低思考强度；未暴露或强设温度，避免不支持温度参数的模型报错。自定义兼容服务不额外发送思考参数；替换为不同型号时，如不兼容预设的思考参数可选择自定义。关闭「流式显示」可用于不支持 SSE 的兼容接口。

## 提示词、费用与数据

配置中的「翻译与学习提示词」可自行修改。插件会另行附加本次语言路由与输出模式，因此不用重复填写原文占位符。源文只发送一次，没有额外的语言识别请求；每次调用只请求当前实例选定的一家服务。启用多个实例或其他内置服务时，它们会分别产生请求。

智能学习控制的是解释篇幅；详细学习会重复完整俄文，因此输出量更大。实际费用仍取决于原文、译文和服务商计费的思考 tokens，无法用固定提示词长度代表总费用。

插件在本机 Bun 中运行，将原文、提示词和密钥发送到所配置的服务商接口。没有遥测、开发者转发服务器或内置密钥；请求失败不展示服务商原始响应，避免把敏感信息带入错误提示。请只填写信任的 HTTPS 接口；HTTP 仅适合可信本地测试。发布包不包含个人配置或历史记录。

翻译、语法与俄文重音由模型生成，不能保证每次正确；人名、专门术语和歧义词尤其需要复核。流式结果在完成前是临时内容；截断、过滤或异常中断会报错。

## 开发

无需安装依赖。Node.js 18+ 运行测试，Python 3 打包：

```sh
npm test
npm run package
```

产物在 `dist/`，仅包含白名单文件，附 SHA-256 校验值。核心覆盖语言路由、模式、单次原文发送、流式分块、异常响应、重音分区和密钥错误信息隔离。实际应用验证记录见 [VALIDATION.md](VALIDATION.md)。

协议依据：[Manggo 原生插件指南](https://github.com/Pylogmon/manggo-plugin)。模型参数依据：[Gemini](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash)、[OpenAI](https://developers.openai.com/api/docs/guides/latest-model)、[DeepSeek](https://api-docs.deepseek.com/guides/thinking_mode/)、[Qwen](https://help.aliyun.com/zh/model-studio/deep-thinking)。

## 许可

[MIT](LICENSE)。
