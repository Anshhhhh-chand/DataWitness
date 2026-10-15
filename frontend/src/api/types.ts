export type DatasetRole = 'before' | 'after'
export type MetricKind = 'count' | 'sum' | 'average'

export type MetricSpec = {
  kind: MetricKind
  column?: string
}

export type ColumnInfo = {
  name: string
  dtype: string
  nullable: boolean
}

export type UploadResponse = {
  upload_id: string
  role: DatasetRole
  filename: string
  size_bytes: number
  sha256: string
  row_count: number
  columns: ColumnInfo[]
  preview_rows: Record<string, unknown>[]
}

export type InvestigationSummary = {
  investigation_id: string
  status: string
  stage: string
  progress_percent: number
  before_result: number | null
  after_result: number | null
  result_delta: number | null
  changed_count: number
  added_count: number
  deleted_count: number
  modified_count: number
  unchanged_count: number
  minimal_change_count: number
  minimal_change_ids: string[]
  reproduction_status: string
  stop_reason: string | null
  error_message: string | null
  id_column: string
  metric: MetricSpec
  before_filename: string
  after_filename: string
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export type ProgressEvent = {
  stage: string
  percent: number
  message: string
  experiments_completed: number
  experiments_total: number
}

export type Change = {
  id: string
  record_id: string
  kind: string
  changed_columns: string[]
  before_values: Record<string, unknown> | null
  after_values: Record<string, unknown> | null
  heuristic_impact: number | null
  in_minimal_set: boolean
}

export type Finding = {
  id: string
  change_id: string
  record_id: string
  rank: number
  score: number
  explanation: string
  in_minimal_set: boolean
  output_without_change: number | null
  estimated_effect: number | null
}

export type Experiment = {
  sequence_number: number
  selected_change_ids: string[]
  selected_change_count: number
  output_value: number | null
  target_value: number
  distance_from_target: number | null
  matches_target: boolean
  status: string
  cache_hit: boolean
  duration_ms: number
  created_at: string
}
