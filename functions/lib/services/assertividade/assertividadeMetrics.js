"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcularMetricasAssertividade = calcularMetricasAssertividade;
function media(values) {
    if (values.length === 0)
        return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}
function calcularGrupo(casos) {
    const expected = casos.flatMap((caso) => caso.findingsEsperados ?? []);
    const found = casos.flatMap((caso) => caso.findingsEncontrados ?? []);
    const expectedSet = new Set(expected);
    const foundSet = new Set(found);
    const truePositives = [...foundSet].filter((finding) => expectedSet.has(finding)).length;
    const expectedEvidence = casos.reduce((sum, caso) => sum + (caso.evidenciasEsperadas ?? 0), 0);
    const expectedPages = casos.reduce((sum, caso) => sum + (caso.paginasEsperadas ?? 0), 0);
    return {
        totalCasos: casos.length,
        scoreMedio: media(casos.map((caso) => caso.score)),
        percentualCriticosOk: media(casos.map((caso) => (caso.criticosOk ? 1 : 0))),
        percentualComCorrecaoHumana: media(casos.map((caso) => (caso.teveCorrecaoHumana ? 1 : 0))),
        precisaoFinding: foundSet.size === 0 ? 0 : truePositives / foundSet.size,
        recallFinding: expectedSet.size === 0 ? 0 : truePositives / expectedSet.size,
        precisaoEvidencia: expectedEvidence === 0
            ? 0
            : casos.reduce((sum, caso) => sum + (caso.evidenciasCorretas ?? 0), 0) /
                expectedEvidence,
        precisaoPagina: expectedPages === 0
            ? 0
            : casos.reduce((sum, caso) => sum + (caso.paginasCorretas ?? 0), 0) /
                expectedPages,
        taxaAlucinacao: casos.reduce((sum, caso) => sum + (caso.alucinacoes ?? 0), 0),
    };
}
function calcularMetricasAssertividade(casos) {
    const casosPorTipo = new Map();
    for (const caso of casos) {
        const tipo = caso.tipoAnaliseId || "sem-tipo";
        const grupo = casosPorTipo.get(tipo) ?? [];
        grupo.push(caso);
        casosPorTipo.set(tipo, grupo);
    }
    const porTipo = {};
    for (const [tipo, grupo] of casosPorTipo.entries()) {
        porTipo[tipo] = calcularGrupo(grupo);
    }
    return {
        ...calcularGrupo(casos),
        porTipo,
    };
}
//# sourceMappingURL=assertividadeMetrics.js.map