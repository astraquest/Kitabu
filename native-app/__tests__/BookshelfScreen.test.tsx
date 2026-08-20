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
const shelfBooks: Book[] = [
  {
    id: 'fractions',
    title: 'Fractions Made Easy',
    author: 'Kitabu Learning',
    spineColor: '#F97316',
    textColor: '#FFFFFF',
    height: 'h-36',
  },
  {
    id: 'ecosystems',
    title: 'Exploring Ecosystems',
    author: 'Kitabu Learning',
    spineColor: '#16A34A',
    textColor: '#FFFFFF',
    height: 'h-32',
  },
];

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

test('keeps books tappable and shows a dismissible coming-soon state without actions', async () => {
  const onOpenBook = jest.fn();
  const onToggleDownload = jest.fn();
  const onSetPreviewBookId = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <BookshelfScreen
        books={shelfBooks}
        user={user}
        readingProgress={{ fractions: 3 }}
        previewBookId={null}
        downloadedBooks={new Set()}
        isSpotlightMode={false}
        onBack={jest.fn()}
        onOpenBook={onOpenBook}
        onSetPreviewBookId={onSetPreviewBookId}
        onToggleSpotlight={jest.fn()}
        onToggleDownload={onToggleDownload}
      />,
    );
  });

  const root = renderer!.root;
  const firstBook = root.findByProps({ accessibilityLabel: 'Fractions Made Easy book, Coming soon' });
  const secondBook = root.findByProps({ accessibilityLabel: 'Exploring Ecosystems book, Coming soon' });
  expect(firstBook.props.accessibilityRole).toBe('button');
  expect(secondBook.props.accessibilityRole).toBe('button');

  await ReactTestRenderer.act(() => firstBook.props.onPress());

  expect(root.findByProps({ accessibilityLabel: 'Fractions Made Easy, Coming soon' })).toBeTruthy();
  expect(root.findAllByProps({ children: 'Coming soon' }).length).toBeGreaterThan(0);
  expect(root.findAllByProps({ children: 'Fractions Made Easy' }).length).toBeGreaterThan(0);
  expect(root.findAllByProps({ children: 'Read' })).toHaveLength(0);
  expect(root.findAllByProps({ children: 'Resume' })).toHaveLength(0);
  expect(root.findAllByProps({ children: 'Download' })).toHaveLength(0);
  expect(root.findAllByProps({ children: 'Remove download' })).toHaveLength(0);
  expect(onOpenBook).not.toHaveBeenCalled();
  expect(onToggleDownload).not.toHaveBeenCalled();

  const closeButton = root.findByProps({ accessibilityLabel: 'Close book details' });
  await ReactTestRenderer.act(() => closeButton.props.onPress());
  expect(root.findAllByProps({ accessibilityLabel: 'Fractions Made Easy, Coming soon' })).toHaveLength(0);
  expect(onSetPreviewBookId).toHaveBeenLastCalledWith(null);

  await ReactTestRenderer.act(() => renderer!.unmount());
});
