import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { BottomChatBar } from '../src/components/BottomChatBar';

test('opens chat from a non-focusable launcher button', () => {
  const onOpen = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  act(() => {
    renderer = ReactTestRenderer.create(
      <BottomChatBar
        isLoading={false}
        onOpen={onOpen}
        onSendMessage={jest.fn()}
      />,
    );
  });

  const input = renderer.root.findByProps({
    accessibilityLabel: 'bottom-chat-input',
  });

  act(() => {
    input.props.onPress();
  });

  expect(onOpen).toHaveBeenCalledTimes(1);
  expect(input.props.onFocus).toBeUndefined();
});
