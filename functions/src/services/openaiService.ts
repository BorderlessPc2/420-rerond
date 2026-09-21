import OpenAI from "openai";

let client: OpenAI | null = null;

/** Modelo com janela ampla (1M). Override via OPENAI_MODEL. */
const DEFAULT_ANALYSIS_MODEL = "gpt-4.1";

export function getAnalysisModel(): string {
  const fromEnv = process.env.OPENAI_MODEL?.trim();
  return fromEnv || DEFAULT_ANALYSIS_MODEL;
}

export function initOpenAI(apiKey: string): void {
  client = new OpenAI({ apiKey });
}

export function getOpenAIClient(): OpenAI {
  return getClient();
}

function getClient(): OpenAI {
  if (!client) {
    throw new Error("OpenAI não inicializado. Chame initOpenAI primeiro.");
  }
  return client;
}

export interface InputFilePart {
  type: "input_file";
  filename: string;
  file_data: string;
}

export interface InputTextPart {
  type: "input_text";
  text: string;
}

export type InputPart = InputFilePart | InputTextPart;

export interface AnaliseResult {
  content: string;
  model?: string;
  tokensUsed?: number;
}

export function buildFileInput(
  filename: string,
  buffer: Buffer,
): InputFilePart {
  const base64 = buffer.toString("base64");
  return {
    type: "input_file",
    filename,
    file_data: `data:application/pdf;base64,${base64}`,
  };
}

export function buildTextInput(text: string): InputTextPart {
  return { type: "input_text", text };
}

export async function analyze(
  parts: InputPart[],
  options?: { maxOutputTokens?: number; temperature?: number; jsonMode?: boolean; model?: string },
): Promise<AnaliseResult> {
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
            format: { type: "json_object" as const },
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
