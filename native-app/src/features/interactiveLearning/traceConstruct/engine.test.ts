import {
  isTraceConstructComplete,
  normalizeTraceConstructSelection,
  serializeTraceConstructResponse,
  toggleTraceConstructTarget,
} from './engine';
import type { TraceConstructSceneProps } from './types';

const props: TraceConstructSceneProps = {
  mode: 'construct-pattern',
  instruction: { default: 'Choose the next two shapes.' },
  accessibility: { selectionLabel: { default: 'Pattern choices' } },
  targets: [
    { id: 'circle', label: 'Circle', accessibleDescription: 'A circle' },
    { id: 'triangle', label: 'Triangle', accessibleDescription: 'A triangle' },
    { id: 'square', label: 'Square', accessibleDescription: 'A square' },
  ],
  selectionCount: 2,
};

describe('trace construct engine', () => {
  it('keeps only valid unique choices within the required count', () => {
    expect(normalizeTraceConstructSelection(['circle', 'missing', 'circle', 'triangle', 'square'], props))
      .toEqual(['circle', 'triangle']);
  });

  it('toggles choices and serializes a complete response', () => {
    const selected = toggleTraceConstructTarget('circle', [], props);
    const complete = toggleTraceConstructTarget('triangle', selected, props);
    expect(isTraceConstructComplete(complete, props)).toBe(true);
    expect(serializeTraceConstructResponse(complete)).toBe('selection:circle|triangle');
  });
});
