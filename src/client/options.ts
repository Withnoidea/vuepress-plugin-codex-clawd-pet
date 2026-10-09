import type { PetThemeSource } from '../core/types.js';

/** Apply VuePress base only to public-root assets, preserving relative manifest URLs. */
export function publicTheme(
  source: PetThemeSource,
  withBase: (path: string) => string,
): PetThemeSource {
  const url = (value: string) =>
    value.startsWith('/') && !value.startsWith('//') ? withBase(value) : value;
  if (typeof source === 'string') return url(source);
  if ('actions' in source)
    return {
      ...source,
      spritesheet: source.spritesheet ? url(source.spritesheet) : undefined,
      actions: Object.fromEntries(
        Object.entries(source.actions).map(([key, action]) => [
          key,
          { ...action, source: action.source ? url(action.source) : undefined },
        ]),
      ) as typeof source.actions,
    };
  if ('states' in source)
    return {
      ...source,
      states: Object.fromEntries(
        Object.entries(source.states).map(([key, state]) => [
          key,
          key.startsWith('_')
            ? state
            : Array.isArray(state)
              ? state.map(url)
              : { ...state, files: state.files?.map(url) },
        ]),
      ),
      reactions: source.reactions
        ? Object.fromEntries(
            Object.entries(source.reactions).map(([key, reaction]) => [
              key,
              {
                ...reaction,
                file: reaction.file ? url(reaction.file) : undefined,
                files: reaction.files?.map(url),
                fileLeft: reaction.fileLeft ? url(reaction.fileLeft) : undefined,
                fileRight: reaction.fileRight ? url(reaction.fileRight) : undefined,
              },
            ]),
          )
        : undefined,
    };
  return {
    ...source,
    spritesheetPath: source.spritesheetPath ? url(source.spritesheetPath) : undefined,
  };
}
