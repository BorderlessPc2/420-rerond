export type LearningScope = {
  organizacaoId?: string | null
  concessionariaId?: string | null
  tipoAnaliseId: string
}

export function normalizeLearningScope(input: LearningScope): LearningScope {
  return {
    organizacaoId: input.organizacaoId?.trim() || null,
    concessionariaId: input.concessionariaId?.trim() || null,
    tipoAnaliseId: input.tipoAnaliseId.trim(),
  }
}

export function isGlobalLearningContent(scope: LearningScope): boolean {
  return !scope.concessionariaId
}
