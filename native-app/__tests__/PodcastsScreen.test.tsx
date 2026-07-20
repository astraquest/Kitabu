import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactTestRenderer from 'react-test-renderer';

import { PodcastsScreen } from '../src/screens/PodcastsScreen';
import { Podcast } from '../src/types/app';

const podcast: Podcast = {
  id: 'photosynthesis',
  title: 'How Plants Make Food',
  subject: 'Science',
  type: 'video',
  duration: '01:00',
  views: 'New',
  date: '2026-07-20',
  author: 'Kitabu Learning',
  url: 'https://app.kitabu.ai/media/podcasts/photosynthesis-for-kids.mp4',
};

const audioPodcast: Podcast = {
  ...podcast,
  id: 'water-cycle-audio',
  title: 'The Water Cycle',
  type: 'audio',
  url: 'https://app.kitabu.ai/media/podcasts/water-cycle.mp3',
};

test('shows the photosynthesis episode and opens it for playback', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <PodcastsScreen mascotKey="rabbit" podcasts={[podcast, audioPodcast]} onBack={jest.fn()} />,
    );
  });

  expect(renderer!.root.findAllByProps({ children: 'How Plants Make Food' }).length).toBeGreaterThan(0);
  expect(renderer!.root.findAllByProps({ children: 'The Water Cycle' })).toHaveLength(0);

  const playButton = renderer!.root.findByProps({ accessibilityLabel: 'Play How Plants Make Food' });
  await ReactTestRenderer.act(() => playButton.props.onPress());

  expect(renderer!.root.findAllByProps({ accessibilityLabel: 'Close player' }).length).toBeGreaterThan(0);
  const closePlayer = renderer!.root.findByProps({ accessibilityLabel: 'Close player' });
  await ReactTestRenderer.act(() => closePlayer.props.onPress());

  const audioTab = renderer!.root.findByProps({ accessibilityLabel: 'Show audio episodes' });
  await ReactTestRenderer.act(() => audioTab.props.onPress());

  expect(renderer!.root.findAllByProps({ children: 'How Plants Make Food' })).toHaveLength(0);
  expect(renderer!.root.findAllByProps({ children: 'The Water Cycle' }).length).toBeGreaterThan(0);
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('kitabu_podcasts_active_tab', 'audio');
});

test('restores the podcast tab used in the previous session', async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('audio');
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <PodcastsScreen mascotKey="rabbit" podcasts={[podcast, audioPodcast]} onBack={jest.fn()} />,
    );
    await Promise.resolve();
  });

  expect(renderer!.root.findAllByProps({ children: 'The Water Cycle' }).length).toBeGreaterThan(0);
  expect(renderer!.root.findAllByProps({ children: 'How Plants Make Food' })).toHaveLength(0);
  await ReactTestRenderer.act(() => renderer!.unmount());
});
