import { getJson, postJson, uploadCsv } from './client'
import type { Change, Experiment, Finding, InvestigationSummary, MetricSpec, UploadResponse } from './types'

export const uploadDataset = (file: File, role: 'before' | 'after') =>
  uploadCsv(file, role) as Promise<UploadResponse>

export const createInvestigation = (beforeUploadId: string, afterUploadId: string, idColumn: string, metric: MetricSpec) =>
  postJson<{ investigation_id: string; status: string }>('/api/investigations', {
    before_upload_id: beforeUploadId,
    after_upload_id: afterUploadId,
    id_column: idColumn,
    metric,
  })

export const createDemoInvestigation = () =>
  postJson<{ investigation_id: string; status: string }>('/api/demo/investigations')

export const getInvestigation = (id: string) =>
  getJson<InvestigationSummary>(`/api/investigations/${id}`)

export const cancelInvestigation = (id: string) =>
  postJson<InvestigationSummary>(`/api/investigations/${id}/cancel`)

export const getChanges = (id: string) =>
  getJson<{ items: Change[]; total: number }>(`/api/investigations/${id}/changes?page_size=500`)

export const getFindings = (id: string) =>
  getJson<Finding[]>(`/api/investigations/${id}/findings`)

export const getExperiments = (id: string) =>
  getJson<Experiment[]>(`/api/investigations/${id}/experiments`)
