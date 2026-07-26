/**
 * Learner-safe authored scene data attached to a progressive lesson step.
 * Runtime/session context is supplied separately when the scene is loaded.
 */
export type ComponentScenePayload<TProps extends object = Record<string, unknown>> = {
  identity: { sceneId: string; schemaVersion: string };
  component: { componentId: string; componentVersion: string };
  prompt: { default: string; key?: string; values?: Record<string, string | number> };
  props: TProps;
} & Record<string, unknown>;
