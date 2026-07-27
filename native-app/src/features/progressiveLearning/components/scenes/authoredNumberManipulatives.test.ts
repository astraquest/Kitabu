import { adaptAuthoredNumberManipulatives } from './authoredNumberManipulatives';

describe('adaptAuthoredNumberManipulatives', () => {
  it('adapts a bounded authored Grade 1 scene and retains authored feedback', () => {
    expect(adaptAuthoredNumberManipulatives({
      component: { componentId: 'number-manipulatives' },
      props: {
        activityMode: 'build-tens-and-ones',
        object: 'bottle tops',
        min: 0,
        max: 30,
        initialValue: 0,
        targetCount: 23,
        feedback: 'Two groups of 10 and 3 more make 23.',
        retryHint: 'Make 20 first, then count 3 more.',
      },
    })).toEqual({
      mode: 'represent',
      min: 0,
      max: 30,
      initialValue: 0,
      unitLabel: 'bottle tops',
      feedback: 'Two groups of 10 and 3 more make 23.',
      retryHint: 'Make 20 first, then count 3 more.',
    });
  });
});
