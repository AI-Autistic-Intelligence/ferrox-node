import * as fs from 'fs';
import * as path from 'path';
import { DeployFactory } from '../src/infrastructure/deploy.factory';

describe('DeployFactory', () => {
  const outputDir = path.join(__dirname, 'test-deploy');

  afterAll(() => {
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('should generate docker configuration', () => {
    DeployFactory.generateDeployment(
      { strategy: 'docker', appName: 'test-app', port: 3000, environment: 'prod', version: '1.0' },
      outputDir
    );
    expect(fs.existsSync(path.join(outputDir, 'Dockerfile'))).toBe(true);

    // Test default outputDir
    DeployFactory.generateDeployment({ strategy: 'docker', appName: 'test-app2', port: 3000, environment: 'prod', version: '1.0' });
    expect(fs.existsSync(path.join('./deploy', 'Dockerfile'))).toBe(true);
  });

  it('should generate kubernetes configuration', () => {
    DeployFactory.generateDeployment(
      { strategy: 'kubernetes', appName: 'test-app', port: 3000, environment: 'prod', version: '1.0.0', dockerRegistry: 'my.registry.com' },
      outputDir
    );
    expect(fs.existsSync(path.join(outputDir, 'k8s-deployment.yaml'))).toBe(true);

    DeployFactory.generateDeployment(
      { strategy: 'kubernetes', appName: 'test-app', port: 3000, environment: 'prod', version: '1.0' },
      outputDir
    );
  });

  it('should generate argocd configuration', () => {
    DeployFactory.generateDeployment(
      { strategy: 'argocd', appName: 'test-app', port: 3000, environment: 'prod', version: '1.0' },
      outputDir
    );
    expect(fs.existsSync(path.join(outputDir, 'argocd-app.yaml'))).toBe(true);
  });

  it('should generate terraform configuration', () => {
    DeployFactory.generateDeployment(
      { strategy: 'terraform', appName: 'test-app', port: 3000, environment: 'prod', version: '1.0', cloudProvider: 'gcp' },
      outputDir
    );
    expect(fs.existsSync(path.join(outputDir, 'main.tf'))).toBe(true);

    DeployFactory.generateDeployment(
      { strategy: 'terraform', appName: 'test-app', port: 3000, environment: 'prod', version: '1.0', cloudProvider: 'aws' },
      outputDir
    );
    
    DeployFactory.generateDeployment(
      { strategy: 'terraform', appName: 'test-app', port: 3000, environment: 'prod', version: '1.0' },
      outputDir
    );
  });

  it('should throw for unsupported strategy', () => {
    expect(() => {
      DeployFactory.generateDeployment(
        { strategy: 'unsupported' as any, appName: 'test-app', port: 3000, environment: 'prod', version: '1.0' },
        outputDir
      );
    }).toThrow(/Internal Server Error/);
  });
});
