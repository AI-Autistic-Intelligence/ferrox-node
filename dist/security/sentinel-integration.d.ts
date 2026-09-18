/**
 * Standalone Sentinel Engine for Ferrox Node
 */
export declare class FerroxSentinelSecurityEngine {
    aiGuardrails: {
        new (): {};
        check(): boolean;
    };
    ragScorer: {
        new (): {};
        score(): number;
    };
    shannonEvaluator: {
        new (): {};
        evaluate(): number;
    };
    routeEngine: any;
    markovEngine: any;
    lsassGuard: any;
    sbomVerifier: any;
    constructor(secretKey?: string);
    generateSeccompBpfPolicy(): string;
    generateSysctlHardeningConfig(): string;
}
