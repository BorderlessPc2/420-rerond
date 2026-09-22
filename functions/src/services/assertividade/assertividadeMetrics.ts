export interface CasoAvaliado {
  id: string;
  tipoAnaliseId: string;
  score: number;
  criticosOk: boolean;
  teveCorrecaoHumana: boolean;
}

export interface GrupoMetricas {
  totalCasos: number;
  scoreMedio: number;
  percentualCriticosOk: number;
  percentualComCorrecaoHumana: number;
}

export interface MetricasAssertividade extends GrupoMetricas {
  porTipo: Record<string, GrupoMetricas>;
}

function media(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calcularGrupo(casos: CasoAvaliado[]): GrupoMetricas {
  return {
    totalCasos: casos.length,
    scoreMedio: media(casos.map((caso) => caso.score)),
    percentualCriticosOk: media(casos.map((caso) => (caso.criticosOk ? 1 : 0))),
    percentualComCorrecaoHumana: media(
      casos.map((caso) => (caso.teveCorrecaoHumana ? 1 : 0)),
    ),
  };
}

export function calcularMetricasAssertividade(
  casos: CasoAvaliado[],
): MetricasAssertividade {
  const casosPorTipo = new Map<string, CasoAvaliado[]>();

  for (const caso of casos) {
    const tipo = caso.tipoAnaliseId || "sem-tipo";
    const grupo = casosPorTipo.get(tipo) ?? [];
    grupo.push(caso);
    casosPorTipo.set(tipo, grupo);
  }

  const porTipo: Record<string, GrupoMetricas> = {};
  for (const [tipo, grupo] of casosPorTipo.entries()) {
    porTipo[tipo] = calcularGrupo(grupo);
  }

  return {
    ...calcularGrupo(casos),
    porTipo,
  };
}
