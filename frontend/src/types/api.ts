export interface ViewerProfileRequest {
  user_id: string;
  watch_time_hours: number;
  top_genres: string[];
  avg_session_mins: number;
}

export interface RecommendResponse {
  user_id: string;
  segment_id: number;
  segment_name: string;
  recommendations: string[];
  distance_to_centroid: number;
  // Optional backend extensions
  raw_features?: Record<string, number>;
  inference_time_ms?: number;
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  version?: string;
  uptime_seconds?: number;
  model_type?: string;
  features_count?: number;
}

export interface ApiTelemetry {
  status: number;
  latencyMs: number;
  timestamp: string;
  requestPayload: ViewerProfileRequest;
  responsePayload: RecommendResponse | null;
  error?: string;
  endpointUrl: string;
}

export interface SegmentArchetype {
  id: number;
  name: string;
  tagline: string;
  description: string;
  color: string;
  borderColor: string;
  accentBg: string;
  dominantGenres: string[];
  avgWatchTime: number; // hours
  avgSessionMins: number;
  audienceShare: number; // percentage
  churnRisk: 'Low' | 'Medium' | 'High';
  personalizationStrategy: string;
  catalogRecommendationFocus: string;
  retentionTactic: string;
  sampleCatalog: string[];
}

export interface EvaluationMetrics {
  silhouette_score: number;
  inertia?: number;
  davies_bouldin_index?: number;
  calinski_harabasz_score?: number;
  k_clusters: number;
  cluster_sizes: {
    segment_id: number;
    segment_name: string;
    count: number;
    percentage: number;
  }[];
  stability_test: {
    reproducibility: 'Deterministic' | 'Stable' | 'Non-Deterministic';
    seed_used: number;
    silhouette_variance: number;
  };
  api_tests: {
    total_tests: number;
    passed: number;
    failed: number;
    test_cases: {
      case_name: string;
      description: string;
      input_sample: Partial<ViewerProfileRequest>;
      expected_status: number;
      actual_status?: number;
      passed?: boolean;
      notes: string;
    }[];
  };
  evaluated_at?: string;
}
