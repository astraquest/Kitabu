import React from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import { BottomChatBar } from '../src/components/BottomChatBar';

test('compact chat bar accepts typing before sending into the full tutor chat', () => {
  const onOpen = jest.fn();
  const onSendMessage = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <BottomChatBar
        isLoading={false}
        onOpen={onOpen}
        onSendMessage={onSendMessage}
      />,
    );
  });

  const input = renderer!.root.findByProps({
    accessibilityLabel: 'bottom-chat-input',
  });

  ReactTestRenderer.act(() => {
    input.props.onFocus?.();
  });
  expect(onOpen).not.toHaveBeenCalled();

  ReactTestRenderer.act(() => {
    input.props.onChangeText('Help me with fractions');
  });

  const sendButton = renderer!.root.findByProps({
    accessibilityLabel: 'bottom-chat-send',
  });

  ReactTestRenderer.act(() => {
    sendButton.props.onPress();
  });

  expect(onSendMessage).toHaveBeenCalledWith('Help me with fractions');
});

test('compact chat bar sits flush above the keyboard when typing', () => {
  const listeners: Record<
    string,
    (event?: { endCoordinates?: { height: number } }) => void
  > = {};
  const addListenerSpy = jest
    .spyOn(Keyboard, 'addListener')
    .mockImplementation(
      (
        eventName: string,
        callback: (event?: { endCoordinates?: { height: number } }) => void,
      ) => {
        listeners[eventName] = callback;
        return { remove: jest.fn() } as never;
      },
    );
  let renderer: ReactTestRenderer.ReactTestRenderer;

  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <BottomChatBar isLoading={false} onSendMessage={jest.fn()} />,
    );
  });

  const getWrapBottom = () => {
    const wrap = renderer!.root.findAllByType(View).find(node => {
      const style = StyleSheet.flatten(node.props.style);
      return (
        style?.position === 'absolute' &&
        style.left === 12 &&
        style.right === 12
      );
    });

    return StyleSheet.flatten(wrap!.props.style).bottom;
  };

  expect(getWrapBottom()).toBe(12);

  ReactTestRenderer.act(() => {
    listeners.keyboardDidShow?.({ endCoordinates: { height: 312 } });
  });

  expect(getWrapBottom()).toBe(312);

  ReactTestRenderer.act(() => {
    listeners.keyboardDidHide?.();
  });

  expect(getWrapBottom()).toBe(12);
  addListenerSpy.mockRestore();
});
