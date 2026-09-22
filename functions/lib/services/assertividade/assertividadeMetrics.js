"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcularMetricasAssertividade = calcularMetricasAssertividade;
function media(values) {
    if (values.length === 0)
        return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}
function calcularGrupo(casos) {
    return {
        totalCasos: casos.length,
        scoreMedio: media(casos.map((caso) => caso.score)),
        percentualCriticosOk: media(casos.map((caso) => (caso.criticosOk ? 1 : 0))),
        percentualComCorrecaoHumana: media(casos.map((caso) => (caso.teveCorrecaoHumana ? 1 : 0))),
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