"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveConcessionariaPromptProfile = resolveConcessionariaPromptProfile;
exports.isProfileConcessionaria = isProfileConcessionaria;
exports.getProfileTipoProjetoNome = getProfileTipoProjetoNome;
exports.buildProfileSystemPrompt = buildProfileSystemPrompt;
exports.buildProfileAnalysisPrompt = buildProfileAnalysisPrompt;
const eco101_prompt_1 = require("./eco101.prompt");
const motiva_prompt_1 = require("./motiva.prompt");
const arteris_prompt_1 = require("./arteris.prompt");
const prompts_1 = require("./prompts");
function resolveConcessionariaPromptProfile(concessionariaId) {
    if ((0, eco101_prompt_1.isEco101Concessionaria)(concessionariaId))
        return "eco101";
    if ((0, motiva_prompt_1.isMotivaConcessionaria)(concessionariaId))
        return "motiva";
    if ((0, arteris_prompt_1.isArterisConcessionaria)(concessionariaId))
        return "arteris";
    return "default";
}
function isProfileConcessionaria(concessionariaId) {
    return resolveConcessionariaPromptProfile(concessionariaId) !== "default";
}
function getProfileTipoProjetoNome(profile) {
    if (profile === "eco101")
        return "Ecovias / ECO101 — Ocupação em Faixa de Domínio";
    if (profile === "motiva")
        return "Motiva — Ocupação em Faixa de Domínio";
    if (profile === "arteris")
        return "Arteris — PIT / Ocupação em Faixa de Domínio";
    return null;
}
function buildProfileSystemPrompt(profile) {
    if (profile === "eco101")
        return (0, eco101_prompt_1.buildEco101SystemPrompt)();
    if (profile === "motiva")
        return (0, motiva_prompt_1.buildMotivaSystemPrompt)();
    if (profile === "arteris")
        return (0, arteris_prompt_1.buildArterisSystemPrompt)();
    return (0, prompts_1.buildSystemPrompt)();
}
function buildProfileAnalysisPrompt(params) {
    const { profile, dados, requisitosFormatados, tiposAnalise, tiposProjetoNome, escopo, promptCustomizado, contextoRevisaoAnterior, feedbackAprendizado, goldenCases, exemploSaidaEsperada, } = params;
    let base;
    if (profile === "eco101") {
        base = (0, eco101_prompt_1.buildEco101AnalysisPrompt)(dados, requisitosFormatados, escopo, promptCustomizado);
    }
    else if (profile === "motiva") {
        base = (0, motiva_prompt_1.buildMotivaAnalysisPrompt)(dados, requisitosFormatados, escopo, promptCustomizado);
    }
    else if (profile === "arteris") {
        base = (0, arteris_prompt_1.buildArterisAnalysisPrompt)(dados, requisitosFormatados, escopo, promptCustomizado);
    }
    else {
        base = (0, prompts_1.buildAnalysisPrompt)(dados, tiposAnalise, requisitosFormatados, tiposProjetoNome, escopo, promptCustomizado);
    }
    const blocos = [base];
    const exemplo = exemploSaidaEsperada?.trim();
    if (exemplo) {
        blocos.push(`═══════════════════════════════════════
${exemplo}`);
    }
    const contexto = contextoRevisaoAnterior?.trim();
    if (contexto) {
        blocos.push(`═══════════════════════════════════════
CONTEXTO DE MEMÓRIA (VERSÃO ANTERIOR E/OU REVISÃO DO PROCESSO)
═══════════════════════════════════════
${contexto}

INSTRUÇÕES DE CONTINUIDADE E ESTABILIDADE (OBRIGATÓRIAS):
1. Priorize verificar se as pendências e não conformidades da análise/revisão anterior foram corrigidas nos documentos atuais e na instrução desta rodada.
2. Para cada pendência anterior: indique explicitamente se foi resolvida, parcialmente resolvida ou permanece.
3. Itens NÃO contestados (status OK ou sem mudança pedida na instrução desta reanálise) DEVEM permanecer com o mesmo status, salvo evidência clara nos documentos de que a situação mudou.
4. Se alterar o status de um item em relação à análise anterior (ex.: OK → NAO_CONFORME ou o inverso), JUSTIFIQUE explicitamente no campo de evidência/orientação: o que mudou nos documentos, na instrução desta rodada ou na evidência encontrada.
5. Continue detectando novas inconformidades ou ausências — não se limite às pendências antigas.
6. A instrução/prompt desta reanálise (se houver) aplica-se só a esta execução; não apague o histórico de pendências relevantes sem avaliar.
7. Não trate esta execução como processo isolado: use o histórico acima como âncora e avalie o conteúdo atual dos PDFs.`);
    }
    const feedback = feedbackAprendizado?.trim();
    if (feedback) {
        blocos.push(feedback);
    }
    const goldens = goldenCases?.trim();
    if (goldens) {
        blocos.push(goldens);
    }
    return blocos.join("\n\n");
}
//# sourceMappingURL=concessionariaProfiles.js.map