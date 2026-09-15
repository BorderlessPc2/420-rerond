"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTipoAnaliseFromFirestore = getTipoAnaliseFromFirestore;
exports.formatarRequisitosTipoAnalise = formatarRequisitosTipoAnalise;
exports.buildTipoAnalisePromptAddon = buildTipoAnalisePromptAddon;
const firestore_1 = require("firebase-admin/firestore");
const tiposAnaliseSeed_1 = require("../config/tiposAnaliseSeed");
const COLLECTION = process.env.FIRESTORE_TIPOS_ANALISE_COLLECTION?.trim() || "tiposAnalise";
const cache = new Map();
function parseTipo(id, raw) {
    const seed = tiposAnaliseSeed_1.TIPOS_ANALISE_SEED.find((item) => item.id === id);
    const requisitosRaw = Array.isArray(raw.requisitos)
        ? raw.requisitos
        : [];
    return {
        id,
        nome: String(raw.nome ?? seed?.nome ?? id),
        slug: String(raw.slug ?? seed?.slug ?? id),
        categoria: String(raw.categoria ?? seed?.categoria ?? "outro"),
        descricao: String(raw.descricao ?? seed?.descricao ?? ""),
        finalidade: raw.finalidade
            ? String(raw.finalidade)
            : seed?.finalidade,
        normasFontes: seed?.normasFontes?.length
            ? seed.normasFontes
            : Array.isArray(raw.normasFontes)
                ? raw.normasFontes.map(String)
                : [],
        documentosSugeridos: Array.isArray(raw.documentosSugeridos)
            ? raw.documentosSugeridos.map(String)
            : seed?.documentosSugeridos ?? [],
        requisitos: seed?.requisitos?.length
            ? seed.requisitos
            : requisitosRaw.filter((r) => r?.id && r?.descricao),
        promptOrientacao: seed?.promptOrientacao
            ? seed.promptOrientacao
            : raw.promptOrientacao
                ? String(raw.promptOrientacao)
                : undefined,
        ativo: raw.ativo !== false,
    };
}
async function getTipoAnaliseFromFirestore(tipoAnaliseId) {
    if (!tipoAnaliseId?.trim())
        return null;
    const id = tipoAnaliseId.trim();
    if (cache.has(id)) {
        return cache.get(id) ?? null;
    }
    try {
        const snap = await (0, firestore_1.getFirestore)().collection(COLLECTION).doc(id).get();
        if (snap.exists) {
            const parsed = parseTipo(snap.id, snap.data());
            if (!parsed.ativo) {
                cache.set(id, null);
                return null;
            }
            // Se Firestore tem o doc sem requisitos, completa com seed
            if (parsed.requisitos.length === 0) {
                const seed = tiposAnaliseSeed_1.TIPOS_ANALISE_SEED.find((item) => item.id === id);
                if (seed?.requisitos.length) {
                    parsed.requisitos = seed.requisitos;
                    parsed.promptOrientacao =
                        parsed.promptOrientacao || seed.promptOrientacao;
                    parsed.normasFontes =
                        parsed.normasFontes.length > 0
                            ? parsed.normasFontes
                            : seed.normasFontes;
                }
            }
            cache.set(id, parsed);
            return parsed;
        }
    }
    catch (error) {
        console.warn(`Não foi possível carregar tipo de análise ${id}:`, error);
    }
    const seed = tiposAnaliseSeed_1.TIPOS_ANALISE_SEED.find((item) => item.id === id) ?? null;
    cache.set(id, seed);
    return seed;
}
function formatarRequisitosTipoAnalise(tipo) {
    if (!tipo?.requisitos?.length)
        return "";
    return tipo.requisitos
        .map((r) => {
        const cat = r.categoria ? ` [${r.categoria}]` : "";
        return `- ${r.id}: ${r.descricao}${cat}`;
    })
        .join("\n");
}
function buildTipoAnalisePromptAddon(tipo, tipoAnaliseDescricao) {
    if (!tipo)
        return "";
    const descExtra = tipo.categoria === "outro" && tipoAnaliseDescricao?.trim()
        ? `\nDescrição informada pelo analista: ${tipoAnaliseDescricao.trim()}`
        : "";
    const orientacao = tipo.promptOrientacao?.trim()
        ? `\n${tipo.promptOrientacao.trim()}`
        : "";
    return `

TIPO DE ANÁLISE (DOMÍNIO) — OBRIGATÓRIO RESPEITAR:
- id: ${tipo.id}
- nome: ${tipo.nome}
- categoria: ${tipo.categoria}
- finalidade: ${tipo.finalidade || tipo.descricao}${descExtra}
${orientacao}

PROIBIDO: misturar requisitos, normas ou critérios de outro tipo de análise (ocupação ≠ acesso ≠ PAC ≠ POC ≠ PPU ≠ PAN).
Use APENAS a lista de requisitos fornecida para este tipo. Cada item do checklist deve usar o ID listado.
Antes de cada apontamento: evidência (arquivo/página) → classificação correta (ausente / não localizado / não conforme / N/A) → fundamento.
`;
}
//# sourceMappingURL=tipoAnaliseService.js.map