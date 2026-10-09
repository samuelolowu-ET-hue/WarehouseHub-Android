import { useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageResizeMode,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors } from '../../theme';

type ProductImageProps = {
  uri: string | null | undefined;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  resizeMode?: ImageResizeMode;
  iconSize?: number;
};

/**
 * Remote product image with a branded placeholder for missing URLs and a
 * fallback when the image fails to load (offline, 404, blocked host).
 */
export function ProductImage({
  uri,
  accessibilityLabel,
  style,
  resizeMode = 'cover',
  iconSize = 32,
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const showFallback = !uri || failed;

  return (
    <View style={[styles.frame, style]}>
      {!showFallback ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode={resizeMode}
          accessible
          accessibilityRole="image"
          accessibilityLabel={accessibilityLabel}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ) : null}
      {showFallback || !loaded ? (
        <View
          style={[StyleSheet.absoluteFill, styles.placeholder]}
          accessible={showFallback}
          accessibilityRole={showFallback ? 'image' : undefined}
          accessibilityLabel={showFallback ? `${accessibilityLabel} (image unavailable)` : undefined}
          pointerEvents="none"
        >
          <Ionicons
            name={showFallback ? 'image-outline' : 'cube-outline'}
            size={iconSize}
            color={colors.steel}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    backgroundColor: colors.stoneSoft,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
