import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, NativeScrollEvent, NativeSyntheticEvent, Platform, ScrollView, ScrollViewProps, StyleSheet, TextInput } from 'react-native';

const focusListeners = new Set<() => void>();
export const notifyInputFocus = () => focusListeners.forEach((fn) => fn());

const MARGIN = 40;

export function KeyboardAwareScroll({ children, onScroll, contentContainerStyle, ...rest }: ScrollViewProps) {
  const ref = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const kbTop = useRef(0);
  const [pad, setPad] = useState(0);

  const ensureVisible = useCallback(() => {
    const sv = ref.current;
    const input: any = (TextInput as any).State?.currentlyFocusedInput?.();
    if (!sv || !kbTop.current) return;
    sv.measureInWindow((_x, svY, _w, svH) => {
      const overlap = Math.max(0, svY + svH - kbTop.current);
      setPad(overlap);
      if (!input?.measureInWindow) return;
      setTimeout(() => {
        input.measureInWindow((_ix: number, iy: number, _iw: number, ih: number) => {
          const visibleBottom = svY + svH - overlap - MARGIN;
          const visibleTop = svY + 8;
          let delta = 0;
          if (iy + ih > visibleBottom) delta = iy + ih - visibleBottom;
          else if (iy < visibleTop) delta = iy - visibleTop;
          if (delta) sv.scrollTo({ y: Math.max(0, scrollY.current + delta), animated: true });
        });
      }, 120);
    });
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      kbTop.current = e.endCoordinates.screenY;
      ensureVisible();
    });
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      kbTop.current = 0;
      setPad(0);
    });
    const onFocus = () => setTimeout(ensureVisible, 60);
    focusListeners.add(onFocus);
    return () => {
      show.remove();
      hide.remove();
      focusListeners.delete(onFocus);
    };
  }, [ensureVisible]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
    onScroll?.(e);
  };

  const flat = StyleSheet.flatten(contentContainerStyle) || {};
  const basePad = typeof flat.paddingBottom === 'number' ? flat.paddingBottom : 0;

  return (
    <ScrollView
      ref={ref}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      {...rest}
      onScroll={handleScroll}
      contentContainerStyle={[flat, { paddingBottom: basePad + pad }]}
    >
      {children}
    </ScrollView>
  );
}
