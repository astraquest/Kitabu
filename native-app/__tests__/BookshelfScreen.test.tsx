import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { BookshelfScreen } from '../src/screens/BookshelfScreen';
import { Book, UserProfile } from '../src/types/app';

const user = {
  name: 'Amina Learner',
  grade: 'Grade 7',
  points: 0,
} as UserProfile;

const books: Book[] = [];

test('opens and submits a book request', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <BookshelfScreen
        books={books}
        user={user}
        readingProgress={{}}
        previewBookId={null}
        downloadedBooks={new Set()}
        isSpotlightMode={false}
        onBack={jest.fn()}
        onOpenBook={jest.fn()}
        onSetPreviewBookId={jest.fn()}
        onToggleSpotlight={jest.fn()}
        onToggleDownload={jest.fn()}
      />,
    );
  });

  const requestButton = renderer!.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      node.findAllByProps({ children: 'REQUEST BOOK' }).length > 0,
  )[0];
  await ReactTestRenderer.act(() => requestButton.props.onPress());
  await ReactTestRenderer.act(() => {
    renderer!.root.findByProps({ placeholder: 'Book title' }).props.onChangeText('CBC Mathematics');
  });
  const submitButton = renderer!.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      node.findAllByProps({ children: 'Send request' }).length > 0,
  )[0];
  await ReactTestRenderer.act(() => submitButton.props.onPress());

  expect(renderer!.root.findAllByProps({ children: 'Request sent to the library team.' }).length).toBeGreaterThan(0);
});
