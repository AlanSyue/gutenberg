/**
 * External dependencies
 */
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue } from 'react-native-reanimated';

export default function Draggable( {
	children,
	maxDistance = 1000,
	minDuration = 500,
	onDragEnd,
	onDragOver,
	onDragStart,
	wrapperAnimatedStyles,
} ) {
	const isDragging = useSharedValue( false );
	const hasPanStarted = useSharedValue( false );

	const longPressGesture = Gesture.LongPress()
		.onStart( ( ev ) => {
			'worklet';
			isDragging.value = true;

			if ( onDragStart ) {
				onDragStart( ev );
			}
		} )
		.onEnd( () => {
			if ( ! hasPanStarted.value && isDragging.value ) {
				isDragging.value = false;

				if ( onDragEnd ) {
					onDragEnd();
				}
			}
		} )
		.maxDistance( maxDistance )
		.minDuration( minDuration )
		.shouldCancelWhenOutside( false );

	const panGesture = Gesture.Pan()
		.manualActivation( true )
		.onTouchesMove( ( _, state ) => {
			'worklet';
			if ( isDragging.value ) {
				hasPanStarted.value = true;
				state.activate();
			} else {
				state.fail();
			}
		} )
		.onUpdate( ( ev ) => {
			'worklet';
			if ( isDragging.value ) {
				if ( onDragOver ) {
					onDragOver( ev );
				}
			}
		} )
		.onEnd( () => {
			'worklet';

			if ( isDragging.value && onDragEnd ) {
				onDragEnd();
			}
			isDragging.value = false;
			hasPanStarted.value = false;
		} )
		.simultaneousWithExternalGesture( longPressGesture );

	const dragHandler = Gesture.Race( panGesture, longPressGesture );

	return (
		<GestureDetector gesture={ dragHandler }>
			<Animated.View style={ wrapperAnimatedStyles }>
				{ children }
			</Animated.View>
		</GestureDetector>
	);
}
