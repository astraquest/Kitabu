import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { approveInteractiveBundle, moveInteractiveRelease, saveInteractiveBundleDraft, validateInteractiveBundle, type InteractiveBundleDraft } from '../../services/interactiveLearningAdminService';
import { InteractiveSceneHost } from '../../features/interactiveLearning/InteractiveSceneHost';
import { adaptComponentScene, type NativeSceneRendererInput } from '../../features/interactiveLearning/sceneAdapter';

export function InteractiveLearningPublisherPanel({ styles }: { styles: Record<string, any> }) {
  const [source, setSource] = useState('');
  const [message, setMessage] = useState('Paste a complete validated bundle package to begin.');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<NativeSceneRendererInput | null>(null);

  function parse(): { bundle: InteractiveBundleDraft; bundleId: string; revision: string; channel: string } {
    const bundle = JSON.parse(source) as InteractiveBundleDraft;
    const manifest = bundle.manifest as { bundleId?: unknown; revision?: unknown; release?: { channel?: unknown } };
    if (typeof manifest.bundleId !== 'string' || typeof manifest.revision !== 'string' || typeof manifest.release?.channel !== 'string') throw new Error('Bundle identity and release channel are required.');
    return { bundle, bundleId: manifest.bundleId, revision: manifest.revision, channel: manifest.release.channel };
  }

  async function run(action: 'validate' | 'preview' | 'draft' | 'approve' | 'publish' | 'rollback') {
    setBusy(true);
    try {
      const parsed = parse();
      if (action === 'preview') {
        const adapted = adaptComponentScene(parsed.bundle.scenes[0]);
        if (!adapted.ok) throw new Error(`Preview unavailable: ${'code' in adapted ? adapted.code : 'invalid-scene'}`);
        setPreview(adapted.input);
        setMessage('Local preview loaded with the installed renderer.');
      } else if (action === 'validate') {
        const result = await validateInteractiveBundle(parsed.bundle);
        setMessage(result.valid ? 'Validation passed.' : result.issues.map(issue => `${issue.path}: ${issue.message}`).join('\n'));
      } else if (action === 'draft') {
        const result = await saveInteractiveBundleDraft(parsed.bundle);
        setMessage(result.created ? 'Immutable draft saved.' : result.issues.map(issue => issue.message).join('\n') || 'That bundle revision already exists.');
      } else if (action === 'approve') {
        await approveInteractiveBundle(parsed.bundleId, parsed.revision);
        setMessage('Bundle approved. It is not live until published.');
      } else {
        await moveInteractiveRelease(action, parsed);
        setMessage(action === 'publish' ? 'Release pointer published.' : 'Release pointer rolled back.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Operation failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Interactive Learning Releases</Text>
      <Text style={styles.panelText}>Validate, preview, approve and move an immutable release pointer. Publishing never changes an active learner attempt.</Text>
      <TextInput accessibilityLabel="Interactive learning bundle JSON" editable={!busy} multiline onChangeText={setSource} placeholder="Paste bundle package JSON" style={[styles.input, localStyles.source]} value={source} />
      <Text accessibilityLiveRegion="polite" style={styles.panelTextSmall}>{message}</Text>
      <View style={styles.actionRow}>
        {(['validate', 'preview', 'draft', 'approve', 'publish', 'rollback'] as const).map(action => (
          <Pressable accessibilityRole="button" disabled={busy || !source.trim()} key={action} onPress={() => run(action)} style={action === 'publish' ? styles.blueBtn : styles.ghostBtn}>
            <Text style={action === 'publish' ? styles.blueBtnText : styles.ghostText}>{action === 'draft' ? 'Save draft' : action[0].toUpperCase() + action.slice(1)}</Text>
          </Pressable>
        ))}
      </View>
      {preview ? <InteractiveSceneHost onResponseChange={() => undefined} scene={preview} /> : null}
    </View>
  );
}

const localStyles = StyleSheet.create({ source: { minHeight: 150, textAlignVertical: 'top' } });
