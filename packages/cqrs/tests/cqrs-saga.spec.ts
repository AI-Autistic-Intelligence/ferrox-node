import { AcidSagaCoordinator } from '../src/cqrs/cqrs-saga';

describe('AcidSagaCoordinator', () => {
  it('should execute all steps successfully in order', async () => {
    const saga = new AcidSagaCoordinator();
    const trace: string[] = [];

    saga.addStep(
      'step1',
      async () => { trace.push('step1-exec'); },
      async () => { trace.push('step1-comp'); }
    );
    saga.addStep(
      'step2',
      async () => { trace.push('step2-exec'); },
      async () => { trace.push('step2-comp'); }
    );

    await saga.execute({ id: 'tx-1', payload: {} });

    expect(trace).toEqual(['step1-exec', 'step2-exec']);
  });

  it('should compensate backward in case of step failure', async () => {
    const saga = new AcidSagaCoordinator();
    const trace: string[] = [];

    saga.addStep(
      'ChargeCard',
      async () => { trace.push('charged'); return { amount: 100 }; },
      async () => { trace.push('refunded'); }
    );
    saga.addStep(
      'BookInventory',
      async () => { trace.push('booked'); },
      async () => { trace.push('unbooked'); }
    );
    saga.addStep(
      'ShipItem',
      async () => { throw new Error('Warehouse offline'); },
      async () => { trace.push('unshipped'); }
    );

    await expect(saga.execute({ id: 'tx-2', payload: {} })).rejects.toThrow('Warehouse offline');

    // Expected: It charged, booked, then failed to ship.
    // So it must UNbook first, then REFUND.
    expect(trace).toEqual(['charged', 'booked', 'unbooked', 'refunded']);
  });

  it('should continue compensation even if a compensation step fails', async () => {
    const saga = new AcidSagaCoordinator();
    const trace: string[] = [];

    saga.addStep(
      'Step1',
      async () => { trace.push('s1'); },
      async () => { trace.push('c1'); }
    );
    saga.addStep(
      'Step2',
      async () => { trace.push('s2'); },
      async () => { throw new Error('Compensation error'); }
    );
    saga.addStep(
      'Step3',
      async () => { throw new Error('Execution error'); },
      async () => { trace.push('c3'); }
    );

    await expect(saga.execute({ id: 'tx-3', payload: {} })).rejects.toThrow('Execution error');
    // Step1 and Step2 executed. Step3 failed.
    // Compensation: Step2 throws error, Step1 continues compensation!
    expect(trace).toEqual(['s1', 's2', 'c1']);
  });
});
