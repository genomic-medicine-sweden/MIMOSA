export class OutbreakDetectedEvent {
  constructor(
    public readonly analysis_profile: string,
    public readonly outbreaks: {
      clusterId: string;
      total: number;
      counties: string[];
      sampleIds: string[];
      analysis_profile: string;
      summary: string;
    }[],
  ) {}
}
