import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { approveInteractiveBundle, getInteractiveBundle, moveInteractiveRelease, saveInteractiveBundleDraft, validateInteractiveBundle, type InteractiveBundleDraft } from '../../services/interactiveLearningAdminService';
import { InteractiveSceneHost } from '../../features/interactiveLearning/InteractiveSceneHost';
import { adaptComponentScene, type NativeSceneRendererInput } from '../../features/interactiveLearning/sceneAdapter';

type PreviewScene = { input: NativeSceneRendererInput; componentId: string };

export function adaptPreviewScenes(scenes: unknown[]): PreviewScene[] {
  return scenes.map((scene, index) => {
    const componentId = (scene as { component?: { componentId?: unknown } })?.component?.componentId;
    if (typeof componentId !== 'string') throw new Error(`Preview scene ${index + 1} has no component ID.`);
    const adapted = adaptComponentScene(scene);
    if (!adapted.ok) {
      throw new Error(`Preview unavailable for scene ${index + 1}: ${'code' in adapted ? adapted.code : 'invalid-scene'}`);
    }
    return { input: adapted.input, componentId };
  });
}

export function InteractiveLearningPublisherPanel({ styles }: { styles: Record<string, any> }) {
  const [source, setSource] = useState('');
  const [message, setMessage] = useState('Paste a complete validated bundle package to begin.');
  const [busy, setBusy] = useState(false);
  const [previewScenes, setPreviewScenes] = useState<PreviewScene[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  function parse(): { bundle: InteractiveBundleDraft; bundleId: string; revision: string; channel: string } {
    const bundle = JSON.parse(source) as InteractiveBundleDraft;
    const manifest = bundle.manifest as { bundleId?: unknown; revision?: unknown; release?: { channel?: unknown } };
    if (typeof manifest.bundleId !== 'string' || typeof manifest.revision !== 'string' || typeof manifest.release?.channel !== 'string') throw new Error('Bundle identity and release channel are required.');
    return { bundle, bundleId: manifest.bundleId, revision: manifest.revision, channel: manifest.release.channel };
  }

  async function run(action: 'load' | 'validate' | 'preview' | 'draft' | 'approve' | 'publish' | 'rollback') {
    setBusy(true);
    try {
      if (action === 'load') {
        const bundle = await getInteractiveBundle('ken-cbc-generative-ui-catalogue', '2026-08-10.1');
        setSource(JSON.stringify(bundle.payload, null, 2));
        setPreviewScenes(adaptPreviewScenes(bundle.payload.scenes));
        setPreviewIndex(0);
        setMessage(`Generative UI catalogue ${bundle.release_id} loaded from the database.`);
        return;
      }
      const parsed = parse();
      if (action === 'preview') {
        setPreviewScenes(adaptPreviewScenes(parsed.bundle.scenes));
        setPreviewIndex(0);
        setMessage(`Local preview loaded with the installed renderer (${parsed.bundle.scenes.length} scenes).`);
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
        {(['load', 'validate', 'preview', 'draft', 'approve', 'publish', 'rollback'] as const).map(action => (
          <Pressable accessibilityLabel={action === 'load' ? 'Load preview' : action === 'draft' ? 'Save draft' : action[0].toUpperCase() + action.slice(1)} accessibilityRole="button" disabled={busy || (action !== 'load' && !source.trim())} key={action} onPress={() => run(action)} style={action === 'publish' ? styles.blueBtn : styles.ghostBtn}>
            <Text style={action === 'publish' ? styles.blueBtnText : styles.ghostText}>{action === 'draft' ? 'Save draft' : action === 'load' ? 'Load preview' : action[0].toUpperCase() + action.slice(1)}</Text>
          </Pressable>
        ))}
      </View>
      {previewScenes.length > 0 ? (
        <>
          <Text accessibilityLabel="Interactive learning preview position" style={styles.panelTextSmall}>
            Preview {previewIndex + 1} of {previewScenes.length} · {previewScenes[previewIndex].componentId}
          </Text>
          <View style={styles.actionRow}>
            <Pressable accessibilityLabel="Previous preview scene" accessibilityRole="button" disabled={busy || previewIndex === 0} onPress={() => setPreviewIndex(index => Math.max(0, index - 1))} style={styles.ghostBtn}>
              <Text style={styles.ghostText}>Previous</Text>
            </Pressable>
            <Pressable accessibilityLabel="Next preview scene" accessibilityRole="button" disabled={busy || previewIndex === previewScenes.length - 1} onPress={() => setPreviewIndex(index => Math.min(previewScenes.length - 1, index + 1))} style={styles.ghostBtn}>
              <Text style={styles.ghostText}>Next</Text>
            </Pressable>
          </View>
          <InteractiveSceneHost onResponseChange={() => undefined} scene={previewScenes[previewIndex].input} />
        </>
      ) : null}
    </View>
  );
}

const localStyles = StyleSheet.create({ source: { minHeight: 150, textAlignVertical: 'top' } });
