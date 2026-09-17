import { SegmentArchetype } from '../types/api';

export const SEGMENT_ARCHETYPES: SegmentArchetype[] = [
  {
    id: 0,
    name: 'High-Engagement Action Viewers',
    tagline: 'Deep-dive cinema enthusiasts with long marathon sessions',
    description: 'Viewers characterized by heavy monthly watch hours (>30 hrs), prolonged single-sitting session times (>75 mins), and a pronounced preference for high-adrenaline genres such as Action, Thriller, and Sci-Fi.',
    color: '#8B5CF6',
    borderColor: 'border-purple-500/40',
    accentBg: 'bg-purple-500/10',
    dominantGenres: ['Action', 'Thriller', 'Sci-Fi'],
    avgWatchTime: 38.4,
    avgSessionMins: 92.5,
    audienceShare: 32.4,
    churnRisk: 'Low',
    personalizationStrategy: 'Prioritize premier blockbuster action/thriller catalogs with 4K HDR options, deep-catalog franchise marathons, and early-access thriller series.',
    catalogRecommendationFocus: 'High-stakes action epics, psychological thrillers, sci-fi franchises',
    retentionTactic: 'Immediate post-credits episode auto-play and high-octane seasonal teasers',
    sampleCatalog: [
      'Extraction: Rogue Directive',
      'Quantum Paradox (Season 2)',
      'Shadow Protocol: Berlin',
      'The Dark Horizon',
      'Apex Predator: Hunt'
    ],
  },
  {
    id: 1,
    name: 'Casual Short-Session Viewers',
    tagline: 'Quick-bite mobile viewers seeking easily consumable entertainment',
    description: 'Viewers who engage frequently during commutes or evening breaks with concise session durations (<30 mins). Highly responsive to comedy specials, animated shorts, and episodic procedural shows.',
    color: '#06B6D4',
    borderColor: 'border-cyan-500/40',
    accentBg: 'bg-cyan-500/10',
    dominantGenres: ['Comedy', 'Animation', 'Standup'],
    avgWatchTime: 8.6,
    avgSessionMins: 24.2,
    audienceShare: 26.8,
    churnRisk: 'Medium',
    personalizationStrategy: 'Surface short-form comedy specials, bite-sized episodic series, trending viral segments, and quick-completion series requiring low cognitive friction.',
    catalogRecommendationFocus: '20-minute sitcoms, animated shorts, standup showcases, web episodes',
    retentionTactic: 'Time-of-day mobile notifications ("Watch a 15-min snack during lunch")',
    sampleCatalog: [
      'Coffee Break Standup Vol. 3',
      'Pixel Bytes: Short Stories',
      'The Roommates (22m Ep 5)',
      'Laugh Track Live',
      'Quick Takes: Pop Culture'
    ],
  },
  {
    id: 2,
    name: 'Genre-Explorers',
    tagline: 'Curious omnivores discovering diverse global and indie catalogs',
    description: 'Highly engaged users with diverse genre spreads spanning Documentary, International Drama, Mystery, and Arthouse films. They resist single-genre lock-in and appreciate curated editorial recommendations.',
    color: '#10B981',
    borderColor: 'border-emerald-500/40',
    accentBg: 'bg-emerald-500/10',
    dominantGenres: ['Documentary', 'Drama', 'Mystery', 'International'],
    avgWatchTime: 26.2,
    avgSessionMins: 58.0,
    audienceShare: 24.1,
    churnRisk: 'Low',
    personalizationStrategy: 'Mix core preferred genres with controlled, serendipitous discovery of adjacent high-rated foreign films, docuseries, and festival award-winners.',
    catalogRecommendationFocus: 'Award-winning investigative docs, indie festival selections, Nordic noir',
    retentionTactic: '"Because you watched X, explore this hidden gem" recommendation carousels',
    sampleCatalog: [
      'Wild Earth: Arctic Wilderness',
      'The Secrets of Kyoto',
      'Subterranean Mysteries',
      'Canvas & Code: Digital Renaissance',
      'Nordic Murmurs'
    ],
  },
  {
    id: 3,
    name: 'Low-Activity Viewers',
    tagline: 'Occasional weekend streamers who need low-friction discovery',
    description: 'Users with minimal monthly watch hours (<5 hrs) and irregular login patterns, often concentrated on weekend evenings. High risk of passive subscription churn if not re-engaged with universal mainstream crowd-pleasers.',
    color: '#F59E0B',
    borderColor: 'border-amber-500/40',
    accentBg: 'bg-amber-500/10',
    dominantGenres: ['Drama', 'Family', 'Trending'],
    avgWatchTime: 3.1,
    avgSessionMins: 32.0,
    audienceShare: 16.7,
    churnRisk: 'High',
    personalizationStrategy: 'Do not assume intensive or niche preferences. Surface universally popular, trending Top 10 mainstream hits and blockbuster releases with instant playback.',
    catalogRecommendationFocus: 'Top 10 in Country, Universal Family Hits, Holiday specials',
    retentionTactic: 'Weekly curated "What to watch this weekend" email digest with 1-click resume',
    sampleCatalog: [
      'Global Top 10: The Crown Jewel',
      'Family Game Night Championship',
      'Summer Odyssey',
      'The Reunion Special',
      'Sunday Cinema Showcase'
    ],
  },
];

export function getSegmentByResponse(segmentId: number, segmentName?: string): SegmentArchetype {
  // First match by segment_id
  const matchById = SEGMENT_ARCHETYPES.find((s) => s.id === segmentId);
  if (matchById) return matchById;

  // Next match by name substring if backend uses different IDs
  if (segmentName) {
    const lowerName = segmentName.toLowerCase();
    const matchByName = SEGMENT_ARCHETYPES.find((s) =>
      lowerName.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(lowerName)
    );
    if (matchByName) return matchByName;
  }

  // Fallback to default archetype if custom cluster returned
  return {
    id: segmentId,
    name: segmentName || `Cluster ${segmentId}`,
    tagline: 'Machine-clustered behavioral cohort',
    description: `Viewer cohort assigned by unsupervised clustering with cluster ID ${segmentId}.`,
    color: '#8B5CF6',
    borderColor: 'border-indigo-500/40',
    accentBg: 'bg-indigo-500/10',
    dominantGenres: ['Mixed'],
    avgWatchTime: 18.0,
    avgSessionMins: 45.0,
    audienceShare: 20.0,
    churnRisk: 'Medium',
    personalizationStrategy: 'Provide balanced content portfolio based on user watch time and genre weights.',
    catalogRecommendationFocus: 'Curated mix of platform favorites',
    retentionTactic: 'Dynamic home banner curation',
    sampleCatalog: ['Featured Series A', 'Trending Title B', 'Special Presentation C'],
  };
}
