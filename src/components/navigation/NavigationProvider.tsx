import { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import type { ReactNode } from 'react';

import {
  createInitialState,
  ignoresKeyRepeat,
  keyToAction,
  preventsPageScroll,
  reduce,
  selectedItemId,
  selectedSection,
  shouldHandleKey,
} from '@/lib/navigation/engine';
import type {
  NavigationAction,
  NavigationModel,
  NavigationSection,
  NavigationState,
  Travel,
} from '@/lib/navigation/types';
import type { ItemId } from '@/lib/types';

import { useUrlState } from './useUrlState';

export interface NavigationController {
  readonly state: NavigationState;
  readonly sections: readonly NavigationSection[];
  readonly selectedSection: NavigationSection | null;
  readonly selectedSectionIndex: number;
  readonly selectedItemIndex: number;
  readonly selectedItemId: ItemId | null;
  readonly selectedItemCount: number;
  readonly isDetail: boolean;
  readonly helpOpen: boolean;
  /** Bumps on every keyboard-driven action, so effects can move focus for keyboard users only. */
  readonly keyboardTick: number;
  /** Direction of the last selection change; presentation may use it, nothing here depends on it. */
  readonly travel: Travel | null;

  nextSection(): void;
  previousSection(): void;
  nextItem(): void;
  previousItem(): void;
  firstSection(): void;
  lastSection(): void;
  openSelected(): void;
  closeDetail(): void;
  toggleHelp(): void;
  closeHelp(): void;
  focusSection(index: number, direction?: 1 | -1): void;
  focusItem(index: number): void;
  /** Any engine action, e.g. the one a gesture maps to through `keyToAction`. Pointer input: focus stays put. */
  dispatch(action: NavigationAction): void;
}

const NavigationContext = createContext<NavigationController | null>(null);

export interface NavigationProviderProps {
  readonly model: NavigationModel;
  readonly children: ReactNode;
}

export function NavigationProvider({ model, children }: NavigationProviderProps) {
  const [state, dispatch] = useReducer(
    (current: NavigationState, action: NavigationAction) => reduce(model, current, action),
    undefined,
    createInitialState,
  );
  const [keyboardTick, setKeyboardTick] = useState(0);
  const replaceNextHistory = useUrlState(model, state, dispatch);

  const { helpOpen } = state;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!shouldHandleKey(event, helpOpen)) {
        return;
      }

      const action = keyToAction(event.key);
      if (action === null) {
        return;
      }

      if (preventsPageScroll(event.key)) {
        event.preventDefault();
      }
      if (event.repeat && ignoresKeyRepeat(action)) {
        return;
      }

      replaceNextHistory.current = event.repeat;
      dispatch(action);

      // The dialog restores focus itself, so don't compete with it while help is involved.
      if (!helpOpen && action.type !== 'toggleHelp') {
        setKeyboardTick((tick) => tick + 1);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [helpOpen, replaceNextHistory]);

  const controller = useMemo<NavigationController>(() => {
    const section = selectedSection(model, state);

    return {
      state,
      sections: model.sections,
      selectedSection: section,
      selectedSectionIndex: state.sectionIndex,
      selectedItemIndex: state.itemIndex,
      selectedItemId: selectedItemId(model, state),
      selectedItemCount: section?.itemIds.length ?? 0,
      isDetail: state.mode === 'detail',
      helpOpen: state.helpOpen,
      keyboardTick,
      travel: state.travel,

      nextSection: () => {
        dispatch({ type: 'nextSection' });
      },
      previousSection: () => {
        dispatch({ type: 'previousSection' });
      },
      nextItem: () => {
        dispatch({ type: 'nextItem' });
      },
      previousItem: () => {
        dispatch({ type: 'previousItem' });
      },
      firstSection: () => {
        dispatch({ type: 'firstSection' });
      },
      lastSection: () => {
        dispatch({ type: 'lastSection' });
      },
      openSelected: () => {
        dispatch({ type: 'openSelected' });
      },
      closeDetail: () => {
        dispatch({ type: 'closeDetail' });
      },
      toggleHelp: () => {
        dispatch({ type: 'toggleHelp' });
      },
      closeHelp: () => {
        dispatch({ type: 'closeHelp' });
      },
      focusSection: (index: number, direction?: 1 | -1) => {
        dispatch(
          direction === undefined
            ? { type: 'focusSection', index }
            : { type: 'focusSection', index, direction },
        );
      },
      focusItem: (index: number) => {
        dispatch({ type: 'focusItem', index });
      },
      dispatch,
    };
  }, [model, state, keyboardTick]);

  return <NavigationContext value={controller}>{children}</NavigationContext>;
}

export function useNavigation(): NavigationController {
  const controller = useContext(NavigationContext);
  if (controller === null) {
    throw new Error('useNavigation() must be called inside a <NavigationProvider>.');
  }

  return controller;
}
