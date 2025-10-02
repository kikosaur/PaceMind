import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';
import { Breakpoints } from '../styles/designSystem';

interface ResponsiveInfo {
  width: number;
  height: number;
  isSmall: boolean;
  isMedium: boolean;
  isLarge: boolean;
  isXLarge: boolean;
  orientation: 'portrait' | 'landscape';
}

export const useResponsive = (): ResponsiveInfo => {
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>(() => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });

    return () => subscription?.remove();
  }, []);

  const { width, height } = dimensions;

  return {
    width,
    height,
    isSmall: width < Breakpoints.sm,
    isMedium: width >= Breakpoints.sm && width < Breakpoints.md,
    isLarge: width >= Breakpoints.md && width < Breakpoints.lg,
    isXLarge: width >= Breakpoints.lg,
    orientation: width > height ? 'landscape' : 'portrait',
  };
};

export default useResponsive;