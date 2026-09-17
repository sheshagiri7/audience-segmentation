import rawMetadata from '../data/metadata.json';
import rawMetrics from '../data/metrics.json';
import { ViewerProfileRequest } from '../types/api';

export interface SegmentProfile {
  segment_id: number;
  segment_name: string;
  description: string;
  personalization_strategy: string;
  recommendations: string[];
  profile: {
    count: number;
    percentage: number;
    avg_watch_time_hours: number;
    avg_session_mins: number;
    avg_genre_count: number;
    dominant_genres: string[];
  };
}

export interface KEvaluation {
  k: number;
  inertia: number;
  silhouette_score: number;
  davies_bouldin_index: number;
  calinski_harabasz_score: number;
}

export interface TrainedModelMetadata {
  model_version: string;
  algorithm: string;
  random_seed: number;
  k_clusters: number;
  feature_names: string[];
  features: string[];
  total_training_samples: number;
  metrics: {
    silhouette_score: number;
    inertia: number;
    davies_bouldin_index: number;
    calinski_harabasz_score: number;
  };
  segments: SegmentProfile[];
  data_quality_report: {
    raw_record_count: number;
    duplicate_records_dropped: number;
    negative_watch_time_corrected: number;
    negative_session_mins_corrected: number;
    missing_watch_time_imputed: number;
    missing_session_mins_imputed: number;
    missing_genres_handled: number;
    outliers_capped: number;
    final_cleaned_record_count: number;
  };
  k_evaluation_analysis: {
    k_evaluations: KEvaluation[];
    selected_k: number;
    selection_rationale: string;
  };
}

export interface EvaluatorTestCase {
  case_name: string;
  description: string;
  input_sample: Partial<ViewerProfileRequest>;
  expected_status: number;
  actual_status: number;
  latency_ms: number;
  passed: boolean;
  notes: string;
  error: string | null;
}

export interface MetricsReport {
  silhouette_score: number;
  inertia: number;
  davies_bouldin_index: number;
  calinski_harabasz_score: number;
  k_clusters: number;
  cluster_sizes: {
    segment_id: number;
    segment_name: string;
    count: number;
    percentage: number;
  }[];
  cluster_balance: {
    is_balanced: boolean;
    min_percentage: number;
    max_percentage: number;
    balance_ratio: number;
  };
  stability_test: {
    reproducibility: string;
    seed_used: number;
    silhouette_variance: number;
    repeated_inference_variance: number;
  };
  api_tests: {
    total_tests: number;
    passed: number;
    failed: number;
    test_cases: EvaluatorTestCase[];
  };
  latency_stats: {
    avg_latency_ms: number;
    p95_latency_ms: number;
    min_latency_ms: number;
    max_latency_ms: number;
  };
  api_health_status: {
    status: string;
    model_loaded: boolean;
    version: string;
    uptime_seconds: number;
    model_type: string;
    features_count: number;
  };
  evaluated_at: string;
}

export const REAL_MODEL_METADATA: TrainedModelMetadata = rawMetadata as TrainedModelMetadata;
export const REAL_EVALUATION_METRICS: MetricsReport = rawMetrics as MetricsReport;

// Helper to look up segment by id or name
export function getRealSegmentById(segmentId: number): SegmentProfile | undefined {
  return REAL_MODEL_METADATA.segments.find((s) => s.segment_id === segmentId);
}

// Visual theme mapping for the 4 clusters in the EVENT HORIZON orbital system
export const CLUSTER_VISUAL_THEMES = [
  {
    id: 0,
    color: '#38BDF8', // Electric Blue (Primary)
    glowColor: 'rgba(56, 189, 248, 0.45)',
    nebulaColor: 'from-sky-950/40 via-blue-950/20 to-transparent',
    accentBorder: 'border-sky-500/30',
    textAccent: 'text-sky-400',
    title: 'High-Engagement Action Viewers',
    coordinates: { x: 28, y: 35 },
    orbitRadius: 130,
    orbitalSpeed: 0.85,
    angleDeg: 40,
  },
  {
    id: 1,
    color: '#06B6D4', // Subtle Cyan
    glowColor: 'rgba(6, 182, 212, 0.4)',
    nebulaColor: 'from-cyan-950/40 via-slate-950/20 to-transparent',
    accentBorder: 'border-cyan-500/30',
    textAccent: 'text-cyan-300',
    title: 'Casual Short-Session Viewers',
    coordinates: { x: 72, y: 30 },
    orbitRadius: 195,
    orbitalSpeed: 0.65,
    angleDeg: 145,
  },
  {
    id: 2,
    color: '#E2E8F0', // Accretion Silver / Warm White
    glowColor: 'rgba(226, 232, 240, 0.4)',
    nebulaColor: 'from-slate-800/30 via-slate-950/20 to-transparent',
    accentBorder: 'border-slate-300/30',
    textAccent: 'text-slate-200',
    title: 'Genre-Explorers',
    coordinates: { x: 65, y: 70 },
    orbitRadius: 260,
    orbitalSpeed: 0.5,
    angleDeg: 230,
  },
  {
    id: 3,
    color: '#60A5FA', // Deep Electric Blue
    glowColor: 'rgba(96, 165, 250, 0.35)',
    nebulaColor: 'from-blue-950/40 via-indigo-950/20 to-transparent',
    accentBorder: 'border-blue-400/30',
    textAccent: 'text-blue-300',
    title: 'Low-Activity Viewers',
    coordinates: { x: 25, y: 75 },
    orbitRadius: 325,
    orbitalSpeed: 0.38,
    angleDeg: 310,
  },
];
