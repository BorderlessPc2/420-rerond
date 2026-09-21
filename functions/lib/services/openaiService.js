"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnalysisModel = getAnalysisModel;
exports.initOpenAI = initOpenAI;
exports.getOpenAIClient = getOpenAIClient;
exports.buildFileInput = buildFileInput;
exports.buildTextInput = buildTextInput;
exports.analyze = analyze;
const openai_1 = __importDefault(require("openai"));
let client = null;
/** Modelo com janela ampla (1M). Override via OPENAI_MODEL. */
const DEFAULT_ANALYSIS_MODEL = "gpt-4.1";
function getAnalysisModel() {
    const fromEnv = process.env.OPENAI_MODEL?.trim();
    return fromEnv || DEFAULT_ANALYSIS_MODEL;
}
function initOpenAI(apiKey) {
    client = new openai_1.default({ apiKey });
}
function getOpenAIClient() {
    return getClient();
}
function getClient() {
    if (!client) {
        throw new Error("OpenAI não inicializado. Chame initOpenAI primeiro.");
    }
    return client;
}
function buildFileInput(filename, buffer) {
    const base64 = buffer.toString("base64");
    return {
        type: "input_file",
        filename,
        file_data: `data:application/pdf;base64,${base64}`,
    };
}
function buildTextInput(text) {
    return { type: "input_text", text };
}
async function analyze(parts, options) {
    const ai = getClient();
    const maxTokens = options?.maxOutputTokens ?? 8000;
    const temperature = options?.temperature ?? 0.1;
    const model = options?.model?.trim() || getAnalysisModel();
    const response = await ai.responses.create({
        model,
        input: [
            {
                role: "user",
                content: parts,
            },
        ],
        max_output_tokens: maxTokens,
        temperature,
        ...(options?.jsonMode
            ? {
                text: {
                    format: { type: "json_object" },
                },
            }
            : {}),
    });
    const content = response.output_text;
    if (!content) {
        throw new Error("OpenAI não retornou resposta.");
    }
    return {
        content,
        model: response.model,
        tokensUsed: response.usage?.total_tokens ?? undefined,
    };
}
//# sourceMappingURL=openaiService.js.map