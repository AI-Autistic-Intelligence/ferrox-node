export type DeployStrategy = 'docker' | 'kubernetes' | 'terraform' | 'argocd';

export interface DeployConfig {
  appName: string;
  strategy: DeployStrategy;
  version: string;
  port: number;
  environment: string;

  // Docker specific
  dockerRegistry?: string;
  baseImage?: string;

  // Kubernetes specific
  namespace?: string;
  replicas?: number;
  cpuLimit?: string;
  memoryLimit?: string;

  // ArgoCD specific
  repoUrl?: string;
  targetRevision?: string;
  destinationServer?: string;

  // Terraform specific
  cloudProvider?: 'aws' | 'gcp';
  region?: string;
}
