"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatarRelatorioComplementos = exports.continueAnaliseJob = exports.watchdogAnaliseJobs = exports.processAnaliseJob = exports.analisarSolicitacao = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
const https_1 = require("firebase-functions/v2/https");
const firestore_2 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const params_1 = require("firebase-functions/params");
const openaiService_1 = require("./services/openaiService");
const normasService_1 = require("./services/normasService");
const prompts_1 = require("./config/prompts");
const normasService_2 = require("./services/normasService");
const analiseJobProcessor_1 = require("./services/analiseJobProcessor");
const analysisJobFinalizers_1 = require("./services/analysisJobFinalizers");
const analysisPolicy_1 = require("./services/analysisPolicy");
const evidenceVerifier_1 = require("./services/pipeline/evidenceVerifier");
const documentPriority_1 = require("./services/pipeline/documentPriority");
const firestoreSanitizer_1 = require("./services/firestoreSanitizer");
const pipeline_1 = require("./services/pipeline");
const jobGuards_1 = require("./services/jobGuards");
const MAX_PDFS_PROJETO = 18;
const MAX_PDF_SIZE_BYTES = 35 * 1024 * 1024;
const app = (0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)(app);
const storage = (0, storage_1.getStorage)(app);
const openaiApiKey = (0, params_1.defineSecret)("OPENAI_API_KEY");
const COLLECTION = process.env.FIRESTORE_SOLICITACOES_COLLECTION?.trim() || "solicitacoes";
const VALID_TIPOS = ["pit", "obra_per", "obra_nao_per"];
function isValidTipo(value) {
    return typeof value === "string" && VALID_TIPOS.includes(value);
}
const DEFAULT_ESCOPO_ANALISE = {
    incluirDadosFormulario: true,
    incluirDocumentosProjeto: true,
    gerarChecklistConformidade: true,
    gerarParecerTecnico: true,
};
const OPENAI_RETRY_MAX_ATTEMPTS = 6;
const OPENAI_RETRY_BASE_DELAY_MS = 2500;
function parseEscopoAnalise(value) {
    if (!value || typeof value !== "object") {
        return DEFAULT_ESCOPO_ANALISE;
    }
    const raw = value;
    const escopo = {
        incluirDadosFormulario: typeof raw.incluirDadosFormulario === "boolean"
            ? raw.incluirDadosFormulario
            : DEFAULT_ESCOPO_ANALISE.incluirDadosFormulario,
        incluirDocumentosProjeto: typeof raw.incluirDocumentosProjeto === "boolean"
            ? raw.incluirDocumentosProjeto
            : DEFAULT_ESCOPO_ANALISE.incluirDocumentosProjeto,
        gerarChecklistConformidade: typeof raw.gerarChecklistConformidade === "boolean"
            ? raw.gerarChecklistConformidade
            : DEFAULT_ESCOPO_ANALISE.gerarChecklistConformidade,
        gerarParecerTecnico: typeof raw.gerarParecerTecnico === "boolean"
            ? raw.gerarParecerTecnico
            : DEFAULT_ESCOPO_ANALISE.gerarParecerTecnico,
    };
    if (!escopo.incluirDadosFormulario && !escopo.incluirDocumentosProjeto) {
        throw new https_1.HttpsError("invalid-argument", "Selecione ao menos uma fonte de dados para análise.");
    }
    if (!escopo.gerarChecklistConformidade && !escopo.gerarParecerTecnico) {
        throw new https_1.HttpsError("invalid-argument", "Selecione ao menos uma saída de relatório para geração.");
    }
    return escopo;
}
async function downloadStorageFile(url) {
    const bucket = storage.bucket();
    if (url.includes("firebasestorage.googleapis.com") || url.includes("storage.googleapis.com")) {
        const decodedUrl = decodeURIComponent(url);
        const pathMatch = decodedUrl.match(/\/o\/(.+?)(\?|$)/);
        if (pathMatch) {
            const filePath = pathMatch[1];
            const [buffer] = await bucket.file(filePath).download();
            return buffer;
        }
    }
    if (url.startsWith("gs://")) {
        const withoutPrefix = url.replace(/^gs:\/\/[^/]+\//, "");
        const [buffer] = await bucket.file(withoutPrefix).download();
        return buffer;
    }
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Falha ao baixar arquivo: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}
function extractFilenameFromUrl(url) {
    try {
        const decoded = decodeURIComponent(url);
        const segments = decoded.split("/");
        const last = segments[segments.length - 1]?.split("?")[0];
        return last || "documento.pdf";
    }
    catch {
        return "documento.pdf";
    }
}
function stripMarkdownFence(raw) {
    let cleaned = raw.trim();
    if (cleaned.startsWith("```json")) {
        cleaned = cleaned.slice(7);
    }
    else if (cleaned.startsWith("```")) {
        cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith("```")) {
        cleaned = cleaned.slice(0, -3);
    }
    return cleaned.trim();
}
function extractJsonCandidates(raw) {
    const candidates = new Set();
    const trimmed = raw.trim();
    if (trimmed)
        candidates.add(trimmed);
    candidates.add(stripMarkdownFence(raw));
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]?.trim()) {
        candidates.add(fenced[1].trim());
    }
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
        candidates.add(raw.slice(firstBrace, lastBrace + 1).trim());
    }
    return Array.from(candidates).filter(Boolean);
}
function mapParsedAIResponse(parsed) {
    const dadosExtraidos = parsed.dadosExtraidos && typeof parsed.dadosExtraidos === "object"
        ? parsed.dadosExtraidos
        : null;
    const conferenciaInputs = Array.isArray(parsed.conferenciaInputs)
        ? parsed.conferenciaInputs
        : [];
    return {
        checklist: Array.isArray(parsed.checklist) ? parsed.checklist : [],
        parecerTecnico: typeof parsed.parecerTecnico === "string"
            ? parsed.parecerTecnico
            : "Parecer não gerado.",
        dadosExtraidos,
        conferenciaInputs,
    };
}
function parseAIResponse(raw) {
    const candidates = extractJsonCandidates(raw);
    for (const candidate of candidates) {
        try {
            const parsed = JSON.parse(candidate);
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
                continue;
            }
            return mapParsedAIResponse(parsed);
        }
        catch {
            // tenta próximo candidato
        }
    }
    const preview = raw.trim().slice(0, 160).replace(/\s+/g, " ");
    console.error("Resposta da IA não é JSON válido. Prévia:", preview);
    throw new https_1.HttpsError("internal", "A IA retornou texto em vez de JSON estruturado. Tente novamente; se persistir, reduza a quantidade de PDFs ou desmarque documentos extras no escopo da análise.");
}
function parseArquivosMeta(value) {
    if (!Array.isArray(value))
        return [];
    return value
        .filter((item) => item && typeof item === "object")
        .map((item) => {
        const raw = item;
        return {
            url: String(raw.url ?? ""),
            nome: String(raw.nome ?? ""),
            tipoDocumento: raw.tipoDocumento ? String(raw.tipoDocumento) : "desconhecido",
        };
    })
        .filter((item) => item.url);
}
function buildDocumentoProjetoLabel(filename, arquivosMeta, url) {
    const meta = arquivosMeta.find((m) => m.url === url || m.nome === filename);
    const tipo = meta?.tipoDocumento ?? "desconhecido";
    const nome = meta?.nome ?? filename;
    return `[DOCUMENTO DO PROJETO: tipoDocumento=${tipo}; arquivo=${nome}]`;
}
function aplicarLimitesPdf(pdfBuffers) {
    const selected = (0, documentPriority_1.selectDocumentosPorPrioridade)(pdfBuffers.map((pdf) => ({
        ...pdf,
        sizeBytes: pdf.buffer.length,
    })), { maxCount: MAX_PDFS_PROJETO, maxBytesPerFile: MAX_PDF_SIZE_BYTES });
    return {
        incluidos: selected.incluidos.map(({ sizeBytes: _s, ...rest }) => rest),
        omitidos: selected.omitidos.map((o) => o.motivo),
    };
}
async function inferTipoRelatorio(pdfBuffers) {
    const parts = [];
    for (const pdf of pdfBuffers.slice(0, 2)) {
        parts.push((0, openaiService_1.buildFileInput)(pdf.filename, pdf.buffer));
    }
    parts.push((0, openaiService_1.buildTextInput)((0, prompts_1.buildInferTipoPrompt)()));
    const result = await (0, pipeline_1.withRetry)(() => (0, openaiService_1.analyze)(parts, {
        maxOutputTokens: 50,
        temperature: 0,
    }), {
        maxAttempts: OPENAI_RETRY_MAX_ATTEMPTS,
        baseDelayMs: OPENAI_RETRY_BASE_DELAY_MS,
        isRetryable: pipeline_1.isLikelyRateLimitError,
    });
    const inferred = result.content.trim().toLowerCase();
    if (isValidTipo(inferred))
        return inferred;
    if (inferred.includes("pit"))
        return "pit";
    if (inferred.includes("nao_per") || inferred.includes("não_per"))
        return "obra_nao_per";
    if (inferred.includes("per"))
        return "obra_per";
    return "pit";
}
exports.analisarSolicitacao = (0, https_1.onCall)({
    region: "southamerica-east1",
    timeoutSeconds: 60,
    memory: "256MiB",
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Autenticação obrigatória.");
    }
    const solicitacaoId = String(request.data?.solicitacaoId ?? "").trim();
    if (!solicitacaoId) {
        throw new https_1.HttpsError("invalid-argument", "solicitacaoId é obrigatório.");
    }
    const promptCustomizadoRaw = request.data?.promptCustomizado;
    const promptCustomizado = typeof promptCustomizadoRaw === "string" && promptCustomizadoRaw.trim()
        ? promptCustomizadoRaw.trim()
        : undefined;
    const tiposProjetoPraCompararRaw = Array.isArray(request.data?.tiposProjetoPraComparar)
        ? request.data.tiposProjetoPraComparar
        : [];
    const tiposProjetoPraComparar = tiposProjetoPraCompararRaw
        .map((item) => String(item).trim().toLowerCase())
        .filter((item) => isValidTipo(item));
    const escopoAnalise = parseEscopoAnalise(request.data?.escopoAnalise);
    const docRef = db.collection(COLLECTION).doc(solicitacaoId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
        throw new https_1.HttpsError("not-found", "Solicitação não encontrada.");
    }
    const data = snapshot.data();
    const retryBlockedUntil = data.retryBlockedUntil?.toMillis?.() ?? 0;
    if (retryBlockedUntil > Date.now()) {
        throw new https_1.HttpsError("failed-precondition", `Aguarde ${Math.ceil((retryBlockedUntil - Date.now()) / 1000)} segundos antes de tentar novamente.`);
    }
    const typeError = (0, jobGuards_1.validateAnalysisType)(typeof data.tipoAnaliseId === "string" ? data.tipoAnaliseId : "", escopoAnalise.incluirDocumentosProjeto && Array.isArray(data.arquivos) && data.arquivos.length > 0);
    if (typeError) {
        throw new https_1.HttpsError("failed-precondition", typeError.message);
    }
    const activeJobId = data.activeAnaliseJobId ? String(data.activeAnaliseJobId) : null;
    const activeJobStatus = data.analiseJobStatus ? String(data.analiseJobStatus) : null;
    const activeStates = new Set([
        "uploaded",
        "queued",
        "extracting",
        "analyzing",
        "generating_report",
        "retry_waiting",
        "continuation_waiting",
    ]);
    if (activeJobId && activeJobStatus && activeStates.has(activeJobStatus)) {
        const heartbeatAt = data.heartbeatAt?.toMillis?.() ?? data.updatedAt?.toMillis?.() ?? 0;
        const deadlineAt = data.deadlineAt?.toMillis?.() ?? 0;
        if (!(0, analysisPolicy_1.isJobStale)(activeJobStatus, heartbeatAt) && (!deadlineAt || deadlineAt > Date.now())) {
            return { jobId: activeJobId, solicitacaoId, reused: true };
        }
    }
    const jobRef = docRef.collection("analiseJobs").doc();
    const jobId = jobRef.id;
    const created = await db.runTransaction(async (transaction) => {
        const current = await transaction.get(docRef);
        const currentData = current.data() ?? {};
        const currentJobId = currentData.activeAnaliseJobId
            ? String(currentData.activeAnaliseJobId)
            : null;
        const currentStatus = currentData.analiseJobStatus
            ? String(currentData.analiseJobStatus)
            : null;
        if (currentJobId && currentStatus && activeStates.has(currentStatus)) {
            const currentJobRef = docRef.collection("analiseJobs").doc(currentJobId);
            const currentJobSnapshot = await transaction.get(currentJobRef);
            const currentJob = currentJobSnapshot.data() ?? {};
            const heartbeatAt = currentJob.heartbeatAt?.toMillis?.() ?? currentJob.updatedAt?.toMillis?.() ?? 0;
            const deadlineAt = currentJob.deadlineAt?.toMillis?.() ?? 0;
            const stale = (0, analysisPolicy_1.isJobStale)(currentStatus, heartbeatAt) || Boolean(deadlineAt && deadlineAt <= Date.now());
            if (!stale)
                return false;
            transaction.update(currentJobRef, (0, firestoreSanitizer_1.sanitizeForFirestore)({
                state: "stale",
                progress: 0,
                stage: "stale",
                error: { code: "job_stale", message: "A análise anterior foi interrompida por falta de atualização dentro do prazo." },
                failureCategory: deadlineAt && deadlineAt <= Date.now() ? "unknown" : "connection_error",
                retryable: false,
                completedAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            }));
        }
        transaction.set(jobRef, (0, firestoreSanitizer_1.sanitizeForFirestore)({
            id: jobId,
            solicitacaoId,
            state: "queued",
            progress: 12,
            stage: "prep",
            promptCustomizado: promptCustomizado ?? null,
            tiposProjetoPraComparar,
            escopoAnalise,
            createdBy: request.auth.uid,
            phase: "initial",
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            heartbeatAt: firestore_1.FieldValue.serverTimestamp(),
            deadlineAt: new Date(Date.now() + analysisPolicy_1.JOB_LIMITS.absoluteDeadlineMs),
            attemptCount: 0,
            retryCount: 0,
            continuationCount: 0,
            providerCallCount: 0,
            manualRetryCount: 0,
            maxRetries: analysisPolicy_1.JOB_LIMITS.maxRetries,
            maxContinuations: analysisPolicy_1.JOB_LIMITS.maxContinuations,
            maxProviderCalls: analysisPolicy_1.JOB_LIMITS.maxProviderCalls,
            retryable: true,
            failureCategory: null,
        }));
        transaction.update(docRef, (0, firestoreSanitizer_1.sanitizeForFirestore)({
            activeAnaliseJobId: jobId,
            analiseJobStatus: "queued",
            analiseJobProgress: 12,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }));
        return true;
    });
    if (!created) {
        const current = await docRef.get();
        const currentData = current.data() ?? {};
        return {
            jobId: String(currentData.activeAnaliseJobId),
            solicitacaoId,
            reused: true,
        };
    }
    return { jobId, solicitacaoId, reused: false };
});
exports.processAnaliseJob = (0, firestore_2.onDocumentCreated)({
    document: `${COLLECTION}/{solicitacaoId}/analiseJobs/{jobId}`,
    region: "southamerica-east1",
    timeoutSeconds: 540,
    memory: "1GiB",
    secrets: [openaiApiKey],
}, async (event) => {
    const apiKey = openaiApiKey.value()?.trim() || process.env.OPENAI_API_KEY?.trim() || "";
    if (!apiKey) {
        const failure = (0, jobGuards_1.getMissingApiKeyFailure)();
        console.error(failure.message);
        const solicitacaoId = String(event.params.solicitacaoId ?? "");
        const jobId = String(event.params.jobId ?? "");
        if (solicitacaoId && jobId) {
            const jobRef = db.collection(COLLECTION).doc(solicitacaoId).collection("analiseJobs").doc(jobId);
            const solicitacaoRef = db.collection(COLLECTION).doc(solicitacaoId);
            await (0, analysisJobFinalizers_1.finalizeAnalysisJob)({
                jobRef,
                solicitacaoRef,
                jobId,
                state: "failed",
                progress: 0,
                error: { code: failure.code, message: failure.message },
                failure: (0, analysisPolicy_1.classifyAnalysisError)(failure),
            });
        }
        return;
    }
    const solicitacaoId = String(event.params.solicitacaoId ?? "");
    const jobId = String(event.params.jobId ?? "");
    if (!solicitacaoId || !jobId)
        return;
    await (0, analiseJobProcessor_1.runAnaliseJob)({
        solicitacaoId,
        jobId,
        apiKey,
        collection: COLLECTION,
    });
});
exports.watchdogAnaliseJobs = (0, scheduler_1.onSchedule)({ schedule: "every 1 minutes", region: "southamerica-east1", memory: "256MiB" }, async () => {
    const firestore = (0, firestore_1.getFirestore)();
    const activeStates = ["uploaded", "queued", "extracting", "analyzing", "generating_report", "retry_waiting", "continuation_waiting"];
    const pageSize = 50;
    let cursor;
    let hasMore = true;
    const now = Date.now();
    while (hasMore) {
        let query = firestore.collectionGroup("analiseJobs")
            .where("state", "in", activeStates)
            .orderBy("__name__")
            .limit(pageSize);
        if (cursor)
            query = query.startAfter(cursor);
        const snapshot = await query.get();
        hasMore = snapshot.size === pageSize;
        cursor = snapshot.docs.at(-1);
        for (const jobSnapshot of snapshot.docs) {
            const data = jobSnapshot.data();
            const jobRef = jobSnapshot.ref;
            const solicitacaoRef = jobRef.parent.parent;
            if (!solicitacaoRef)
                continue;
            const heartbeatAt = data.heartbeatAt?.toMillis?.() ?? data.updatedAt?.toMillis?.() ?? 0;
            const deadlineAt = data.deadlineAt?.toMillis?.() ?? 0;
            if (!(0, analysisPolicy_1.isJobStale)(String(data.state), heartbeatAt, now) && (!deadlineAt || deadlineAt > now))
                continue;
            const reason = deadlineAt && deadlineAt <= now ? "deadline_exceeded" : "heartbeat_timeout";
            await (0, analysisJobFinalizers_1.finalizeAnalysisJob)({
                jobRef,
                solicitacaoRef,
                jobId: jobRef.id,
                state: "stale",
                progress: 0,
                error: {
                    code: "job_stale",
                    message: "A análise foi interrompida por falta de atualização dentro do prazo.",
                },
                resultFields: { staleReason: reason },
            });
        }
    }
    let solicitationCursor;
    let solicitationMore = true;
    while (solicitationMore) {
        let query = firestore.collection(COLLECTION).orderBy("__name__").limit(pageSize);
        if (solicitationCursor)
            query = query.startAfter(solicitationCursor);
        const snapshot = await query.get();
        solicitationMore = snapshot.size === pageSize;
        solicitationCursor = snapshot.docs.at(-1);
        for (const solicitationSnapshot of snapshot.docs) {
            const data = solicitationSnapshot.data();
            const activeJobId = typeof data.activeAnaliseJobId === "string" ? data.activeAnaliseJobId : "";
            if (!activeJobId || !activeStates.includes(String(data.analiseJobStatus)))
                continue;
            const jobRef = solicitationSnapshot.ref.collection("analiseJobs").doc(activeJobId);
            const jobSnapshot = await jobRef.get();
            if (jobSnapshot.exists && activeStates.includes(String(jobSnapshot.data()?.state)))
                continue;
            await firestore.runTransaction(async (transaction) => {
                const current = await transaction.get(solicitationSnapshot.ref);
                if (current.data()?.activeAnaliseJobId !== activeJobId)
                    return;
                transaction.update(solicitationSnapshot.ref, {
                    activeAnaliseJobId: null,
                    analiseJobStatus: "stale",
                    analiseJobProgress: 0,
                    analiseErroCodigo: "job_missing",
                    analiseErroMensagem: "A execução anterior não foi encontrada e foi encerrada.",
                    updatedAt: firestore_1.FieldValue.serverTimestamp(),
                });
            });
        }
    }
});
exports.continueAnaliseJob = (0, firestore_2.onDocumentUpdated)({
    document: `${COLLECTION}/{solicitacaoId}/analiseJobs/{jobId}`,
    region: "southamerica-east1",
    timeoutSeconds: 540,
    memory: "1GiB",
    secrets: [openaiApiKey],
}, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    if (before.continuation?.requested || !after.continuation?.requested)
        return;
    if (after.state !== "continuation_waiting" && after.state !== "queued")
        return;
    const now = Date.now();
    const deadlineAt = after.deadlineAt?.toMillis?.() ?? 0;
    const solicitacaoId = String(event.params.solicitacaoId ?? "");
    const jobId = String(event.params.jobId ?? "");
    if (!solicitacaoId || !jobId)
        return;
    const continuationRef = db.collection(COLLECTION).doc(solicitacaoId).collection("analiseJobs").doc(jobId);
    const solicitacaoRef = db.collection(COLLECTION).doc(solicitacaoId);
    const halt = (0, analysisPolicy_1.resolveContinuationHalt)({
        stale: (0, analysisPolicy_1.isJobStale)("continuation_waiting", after.updatedAt?.toMillis?.() ?? now, now),
        deadlineExceeded: Boolean(deadlineAt && deadlineAt <= now),
        canContinue: (0, analysisPolicy_1.canContinueJob)({
            continuationCount: Number(after.continuationCount ?? 0),
            maxContinuations: Number(after.maxContinuations ?? analysisPolicy_1.JOB_LIMITS.maxContinuations),
            deadlineAtMs: deadlineAt || now,
            providerCallCount: Number(after.providerCallCount ?? 0),
            maxProviderCalls: Number(after.maxProviderCalls ?? analysisPolicy_1.JOB_LIMITS.maxProviderCalls),
            retryable: after.retryable !== false,
        }),
    });
    if (halt) {
        await (0, analysisJobFinalizers_1.finalizeAnalysisJob)({
            jobRef: continuationRef,
            solicitacaoRef,
            jobId,
            state: halt.state,
            progress: 0,
            error: { code: halt.code, message: halt.message },
        });
        return;
    }
    const claimId = `${jobId}:${Date.now()}`;
    let claimed = false;
    await db.runTransaction(async (transaction) => {
        const [current, solicitacaoSnapshot] = await Promise.all([
            transaction.get(continuationRef),
            transaction.get(db.collection(COLLECTION).doc(solicitacaoId)),
        ]);
        const data = current.data() ?? {};
        const solicitacao = solicitacaoSnapshot.data() ?? {};
        const continuation = data.continuation;
        const continuationCount = Number(data.continuationCount ?? 0);
        const maxContinuations = Number(data.maxContinuations ?? analysisPolicy_1.JOB_LIMITS.maxContinuations);
        const providerCallCount = Number(data.providerCallCount ?? 0);
        const maxProviderCalls = Number(data.maxProviderCalls ?? analysisPolicy_1.JOB_LIMITS.maxProviderCalls);
        const deadlineAtMs = data.deadlineAt?.toMillis?.() ?? 0;
        if (!current.exists ||
            solicitacao.activeAnaliseJobId !== jobId ||
            continuation?.claimId ||
            !(0, jobGuards_1.shouldClaimContinuation)(undefined, { requested: continuation?.requested, claimId: claimId }) ||
            !(0, analysisPolicy_1.canContinueJob)({ continuationCount, maxContinuations, deadlineAtMs, providerCallCount, maxProviderCalls, retryable: data.retryable !== false }))
            return;
        transaction.update(continuationRef, {
            state: "analyzing",
            phase: "continuation",
            "continuation.claimId": claimId,
            continuationCount: firestore_1.FieldValue.increment(1),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            heartbeatAt: firestore_1.FieldValue.serverTimestamp(),
        });
        claimed = true;
    });
    if (!claimed)
        return;
    const apiKey = openaiApiKey.value()?.trim() || process.env.OPENAI_API_KEY?.trim() || "";
    if (!apiKey) {
        const failure = (0, jobGuards_1.getMissingApiKeyFailure)();
        console.error(failure.message);
        await (0, analysisJobFinalizers_1.finalizeAnalysisJob)({
            jobRef: continuationRef,
            solicitacaoRef: db.collection(COLLECTION).doc(solicitacaoId),
            jobId,
            state: "failed",
            progress: 0,
            error: { code: failure.code, message: failure.message },
            failure: (0, analysisPolicy_1.classifyAnalysisError)(failure),
        });
        return;
    }
    await (0, analiseJobProcessor_1.runAnaliseJob)({
        solicitacaoId,
        jobId,
        apiKey,
        collection: COLLECTION,
    });
});
function parseComplementos(value) {
    if (!Array.isArray(value))
        return [];
    return value
        .map((entry) => {
        if (!entry || typeof entry !== "object")
            return null;
        const raw = entry;
        const item = String(raw.item ?? "").trim().toUpperCase();
        const texto = String(raw.texto ?? "").trim();
        if (!item || !texto)
            return null;
        return { item, texto };
    })
        .filter((entry) => entry !== null);
}
function mapComplementosComDescricao(complementos, tipo) {
    const requisitos = (0, normasService_2.getRequisitosParaTipo)(tipo);
    const descricaoPorId = new Map(requisitos.map((req) => [req.id, req.descricao]));
    return complementos.map((c) => ({
        item: c.item,
        texto: c.texto,
        descricao: descricaoPorId.get(c.item) ?? c.item.replace(/_/g, " "),
    }));
}
exports.formatarRelatorioComplementos = (0, https_1.onCall)({
    region: "southamerica-east1",
    timeoutSeconds: 300,
    memory: "512MiB",
    secrets: [openaiApiKey],
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Autenticação obrigatória.");
    }
    const solicitacaoId = String(request.data?.solicitacaoId ?? "").trim();
    if (!solicitacaoId) {
        throw new https_1.HttpsError("invalid-argument", "solicitacaoId é obrigatório.");
    }
    const complementos = parseComplementos(request.data?.complementosChecklist);
    if (complementos.length === 0) {
        throw new https_1.HttpsError("invalid-argument", "Informe ao menos um complemento com texto.");
    }
    const apiKey = openaiApiKey.value()?.trim() || process.env.OPENAI_API_KEY?.trim() || "";
    if (!apiKey) {
        throw new https_1.HttpsError("failed-precondition", "OPENAI_API_KEY não configurada.");
    }
    (0, openaiService_1.initOpenAI)(apiKey);
    const docRef = db.collection(COLLECTION).doc(solicitacaoId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
        throw new https_1.HttpsError("not-found", "Solicitação não encontrada.");
    }
    const data = snapshot.data();
    const checklistAnterior = typeof data.checklistConformidade === "string"
        ? data.checklistConformidade
        : "[]";
    const parecerAnterior = typeof data.parecerTecnico === "string" ? data.parecerTecnico : "";
    if (!checklistAnterior || checklistAnterior === "[]") {
        throw new https_1.HttpsError("failed-precondition", "A solicitação precisa de uma análise prévia antes de complementar.");
    }
    let tipoBase;
    if (isValidTipo(data.tipoRelatorio)) {
        tipoBase = data.tipoRelatorio;
    }
    else {
        tipoBase = "pit";
    }
    const tipoConfig = (0, normasService_1.getTipoProjetoConfig)(tipoBase);
    const requisitosFormatados = (0, normasService_1.listarRequisitosFormatados)(tipoBase);
    const tiposProjetoNome = tipoConfig?.nome ?? tipoBase;
    const dadosForm = {
        titulo: data.titulo ?? "",
        tipoObra: data.tipoObra ?? "",
        localizacao: data.localizacao ?? "",
        descricao: data.descricao ?? "",
        concessionariaId: data.concessionariaId ? String(data.concessionariaId) : null,
        cliente: data.cliente,
        interessado: data.interessado,
        kilometragem: data.kilometragem,
        nroProcessoErp: data.nroProcessoErp,
        rodovia: data.rodovia,
        nomeConcessionaria: data.nomeConcessionaria,
        sentido: data.sentido,
        ocupacao: data.ocupacao,
        municipioEstado: data.municipioEstado,
        uf: data.uf,
        ocupacaoArea: data.ocupacaoArea,
        responsavelTecnico: data.responsavelTecnico,
        extensao: data.extensao,
        numeroArt: data.numeroArt,
        tipoIntervencaoDetalhado: data.tipoIntervencaoDetalhado,
        faseProjeto: data.faseProjeto,
        analistaResponsavel: data.analistaResponsavel,
        memorial: data.memorial,
        dataRecebimento: data.dataRecebimento,
        numeroRevisao: data.numeroRevisao,
    };
    const complementosEnriquecidos = mapComplementosComDescricao(complementos, tipoBase);
    const systemPrompt = (0, prompts_1.buildComplementacaoSystemPrompt)();
    const complementacaoPrompt = (0, prompts_1.buildComplementacaoPrompt)(dadosForm, tiposProjetoNome, requisitosFormatados, checklistAnterior, parecerAnterior, complementosEnriquecidos);
    const parts = [
        (0, openaiService_1.buildTextInput)(systemPrompt),
        (0, openaiService_1.buildTextInput)(complementacaoPrompt),
    ];
    console.log(`Formatando relatório com ${complementos.length} complemento(s) para ${solicitacaoId}`);
    const result = await (0, pipeline_1.withRetry)(() => (0, openaiService_1.analyze)(parts, {
        maxOutputTokens: 12000,
        temperature: 0.1,
        jsonMode: true,
    }), {
        maxAttempts: OPENAI_RETRY_MAX_ATTEMPTS,
        baseDelayMs: OPENAI_RETRY_BASE_DELAY_MS,
        isRetryable: pipeline_1.isLikelyRateLimitError,
    });
    const { checklist, parecerTecnico } = parseAIResponse(result.content);
    const complementosSerializados = JSON.stringify(complementos);
    const evidenceVerification = (0, evidenceVerifier_1.verificarEvidencias)(checklist);
    const versoesRef = docRef.collection("analiseVersoes");
    const versaoAnterior = typeof data.analiseVersaoAtual === "number" ? data.analiseVersaoAtual : 0;
    if (data.relatorioIA || data.checklistConformidade || data.parecerTecnico) {
        const versaoArquivada = versaoAnterior > 0 ? versaoAnterior : 1;
        await versoesRef.doc(`v${versaoArquivada}`).set((0, firestoreSanitizer_1.sanitizeForFirestore)({
            solicitacaoId,
            versao: versaoArquivada,
            relatorioIA: data.relatorioIA ?? null,
            checklistConformidade: data.checklistConformidade ?? null,
            parecerTecnico: data.parecerTecnico ?? null,
            arquivadoEm: firestore_1.FieldValue.serverTimestamp(),
        }), { merge: true });
    }
    const versaoAtual = versaoAnterior > 0 ? versaoAnterior + 1 : 1;
    await versoesRef.doc(`v${versaoAtual}`).set((0, firestoreSanitizer_1.sanitizeForFirestore)({
        solicitacaoId,
        versao: versaoAtual,
        relatorioIA: result.content,
        checklistConformidade: JSON.stringify(checklist),
        parecerTecnico,
        evidenceVerification,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    }));
    await docRef.update((0, firestoreSanitizer_1.sanitizeForFirestore)({
        status: "em_analise",
        checklistConformidade: JSON.stringify(checklist),
        parecerTecnico,
        complementosChecklist: complementosSerializados,
        relatorioIA: result.content,
        analiseVersaoAtual: versaoAtual,
        evidenceVerification,
        analisadoPorIA: true,
        analisadoEm: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }));
    const updatedSnap = await docRef.get();
    const updatedData = updatedSnap.data();
    return {
        id: solicitacaoId,
        ...updatedData,
        arquivos: Array.isArray(updatedData.arquivos) ? updatedData.arquivos : [],
        createdAt: updatedData.createdAt?.toDate?.()?.toISOString() ?? null,
        updatedAt: updatedData.updatedAt?.toDate?.()?.toISOString() ?? null,
        analisadoEm: updatedData.analisadoEm?.toDate?.()?.toISOString() ?? null,
    };
});
//# sourceMappingURL=index.js.map