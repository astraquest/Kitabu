import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { NativeSceneRendererInput } from './sceneAdapter';
import { StructuredResponseView } from './structuredResponse/StructuredResponseView';
import { RankedListView } from './rankedList/RankedListView';
import { TraceConstructView } from './traceConstruct';
import { AuthoredInteractionView } from './authoredInteraction';
import { loadResponseSnapshot, saveResponseSnapshot } from './responseSnapshotStore';

export interface InteractiveSceneHostProps {
  scene: NativeSceneRendererInput;
  onResponseChange: (value: string | null) => void;
  disabled?: boolean;
  snapshotKey?: string;
}

/** Dispatches validated scene input only to renderers installed in this app build. */
export function InteractiveSceneHost({
  scene,
  onResponseChange,
  disabled = false,
  snapshotKey,
}: InteractiveSceneHostProps) {
  const [response, setResponse] = useState('');
  const onResponseChangeRef = useRef(onResponseChange);
  onResponseChangeRef.current = onResponseChange;

  useEffect(() => {
    setResponse('');
    if (!snapshotKey) return;
    let active = true;
    loadResponseSnapshot(snapshotKey, scene.sceneId).then(snapshot => {
      if (!active || !snapshot) return;
      setResponse(snapshot.response);
      onResponseChangeRef.current(snapshot.response);
    });
    return () => { active = false; };
  }, [scene.sceneId, snapshotKey]);

  function updateResponse(value: string | null) {
    const next = value ?? '';
    setResponse(next);
    onResponseChange(value);
    if (snapshotKey) {
      saveResponseSnapshot(snapshotKey, { sceneId: scene.sceneId, response: next, savedAt: new Date().toISOString() }).catch(() => undefined);
    }
  }

  if (scene.rendererId === 'structured-response/native') {
    return (
      <StructuredResponseView
        {...scene.props}
        value={response}
        onResponseChange={updateResponse}
        disabled={disabled}
      />
    );
  }

  if (scene.rendererId === 'classify-sort-match-rank/native') {
    return (
      <RankedListView
        disabled={disabled}
        onResponseChange={updateResponse}
        props={scene.props}
        restoredOrder={response.startsWith('sequence:') ? response.slice('sequence:'.length).split('>') : undefined}
        sceneId={scene.sceneId}
      />
    );
  }

  if (scene.rendererId === 'trace-construct/native') {
    return (
      <TraceConstructView
        disabled={disabled}
        onResponseChange={updateResponse}
        props={scene.props}
        restoredSelection={response.startsWith('selection:') ? response.slice('selection:'.length).split('|').filter(Boolean) : undefined}
        sceneId={scene.sceneId}
      />
    );
  }

  if (scene.rendererId === 'authored-interaction/native') {
    return (
      <AuthoredInteractionView
        disabled={disabled}
        onResponseChange={updateResponse}
        props={scene.props}
        restoredResponse={response || undefined}
        sceneId={scene.sceneId}
      />
    );
  }

  return (
    <View accessibilityRole="alert" style={styles.unsupported}>
      <Text style={styles.unsupportedTitle}>Activity unavailable</Text>
      <Text style={styles.unsupportedBody}>
        This version of Kitabu cannot display this activity yet.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  unsupported: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FEF3C7',
  },
  unsupportedTitle: {
    color: '#78350F',
    fontSize: 16,
    fontWeight: '700',
  },
  unsupportedBody: {
    color: '#92400E',
    marginTop: 4,
  },
});
