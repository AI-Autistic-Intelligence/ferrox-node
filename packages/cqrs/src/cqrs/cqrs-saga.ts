import { AppLoggerFactory } from '@node-yalc/logger';

const logger = AppLoggerFactory('SagaCoordinator');

export interface SagaTransaction {
  id: string;
  payload: any;
}

export interface SagaStep {
  name: string;
  execute: (tx: SagaTransaction) => Promise<any>;
  compensate: (tx: SagaTransaction, executeResult?: any) => Promise<void>;
}

export class AcidSagaCoordinator {
  private steps: SagaStep[] = [];

  /**
   * Adds a step to the Distributed Transaction (SAGA)
   */
  addStep(name: string, execute: (tx: SagaTransaction) => Promise<any>, compensate: (tx: SagaTransaction, res?: any) => Promise<void>): this {
    this.steps.push({ name, execute, compensate });
    return this;
  }

  /**
   * Executes the transaction. If any step fails, triggers the compensation (rollback) flow in reverse order.
   */
  async execute(tx: SagaTransaction): Promise<void> {
    const executedSteps: { step: SagaStep; result: any }[] = [];

    logger.log(`[SAGA] Starting ACID Transaction ${tx.id} with ${this.steps.length} steps`);

    for (const step of this.steps) {
      try {
        logger?.debug?.(`[SAGA] Executing step: ${step.name}`);
        const result = await step.execute(tx);
        executedSteps.push({ step, result });
      } catch (error: any) {
        logger.error(`[SAGA] Transaction ${tx.id} failed at step '${step.name}'. Initiating compensation...`);
        
        // Rollback sequentially in reverse
        for (let i = executedSteps.length - 1; i >= 0; i--) {
          const { step: rollbackStep, result } = executedSteps[i];
          try {
            logger.warn(`[SAGA] Compensating step: ${rollbackStep.name}`);
            await rollbackStep.compensate(tx, result);
          } catch (compError: any) {
            logger.error(`[SAGA] CRITICAL: Compensation failed for step '${rollbackStep.name}': ${compError.message}`);
            // In a real CQRS, you would send this to a Dead Letter Queue or trigger manual intervention alerts
          }
        }
        
        throw new Error(`SAGA Transaction ${tx.id} aborted due to failure in step '${step.name}': ${error.message}`);
      }
    }

    logger.log(`[SAGA] Transaction ${tx.id} completed successfully`);
  }
}

