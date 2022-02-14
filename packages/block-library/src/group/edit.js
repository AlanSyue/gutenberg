/**
 * External dependencies
 */
import classnames from 'classnames';
import FastAverageColor from 'fast-average-color';
import { colord } from 'colord';

/**
 * WordPress dependencies
 */
import { useRef, useState, useEffect } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import {
	InnerBlocks,
	useBlockProps,
	InspectorControls,
	useInnerBlocksProps,
	useSetting,
	withColors,
	BlockControls,
	MediaReplaceFlow,
	store as blockEditorStore,
	__experimentalPanelColorGradientSettings as PanelColorGradientSettings,
	__experimentalUseGradient,
} from '@wordpress/block-editor';
import {
	SelectControl,
	Spinner,
	PanelBody,
	FocalPointPicker,
	RangeControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { compose } from '@wordpress/compose';
import { isBlobURL } from '@wordpress/blob';

/**
 * Internal dependencies
 */
/* eslint-disable no-unused-vars */
import {
	attributesFromMedia,
	IMAGE_BACKGROUND_TYPE,
	backgroundImageStyles,
	dimRatioToClass,
} from './shared';
/* eslint-enable no-unused-vars */

// TODO - refactor to shared from cover block
// For now let's keep things simple and use only images.
const ALLOWED_MEDIA_TYPES = [ 'image' ];

// TODO - refactor to shared from cover block
function useCoverIsDark( url, dimRatio = 50, overlayColor, elementRef ) {
	const [ isDark, setIsDark ] = useState( false );
	useEffect( () => {
		// If opacity is lower than 50 the dominant color is the image or video color,
		// so use that color for the dark mode computation.
		if ( url && dimRatio <= 50 && elementRef.current ) {
			retrieveFastAverageColor().getColorAsync(
				elementRef.current,
				( color ) => {
					setIsDark( color.isDark );
				}
			);
		}
	}, [ url, url && dimRatio <= 50 && elementRef.current, setIsDark ] );
	useEffect( () => {
		// If opacity is greater than 50 the dominant color is the overlay color,
		// so use that color for the dark mode computation.
		if ( dimRatio > 50 || ! url ) {
			if ( ! overlayColor ) {
				// If no overlay color exists the overlay color is black (isDark )
				setIsDark( true );
				return;
			}
			setIsDark( colord( overlayColor ).isDark() );
		}
	}, [ overlayColor, dimRatio > 50 || ! url, setIsDark ] );
	useEffect( () => {
		if ( ! url && ! overlayColor ) {
			// Reset isDark
			setIsDark( false );
		}
	}, [ ! url && ! overlayColor, setIsDark ] );
	return isDark;
}

// TODO - refactor to shared from cover block
function mediaPosition( { x, y } ) {
	return `${ Math.round( x * 100 ) }% ${ Math.round( y * 100 ) }%`;
}

// TODO - refactor to shared from cover block
function retrieveFastAverageColor() {
	if ( ! retrieveFastAverageColor.fastAverageColor ) {
		retrieveFastAverageColor.fastAverageColor = new FastAverageColor();
	}
	return retrieveFastAverageColor.fastAverageColor;
}

const htmlElementMessages = {
	header: __(
		'The <header> element should represent introductory content, typically a group of introductory or navigational aids.'
	),
	main: __(
		'The <main> element should be used for the primary content of your document only. '
	),
	section: __(
		"The <section> element should represent a standalone portion of the document that can't be better represented by another element."
	),
	article: __(
		'The <article> element should represent a self contained, syndicatable portion of the document.'
	),
	aside: __(
		"The <aside> element should represent a portion of a document whose content is only indirectly related to the document's main content."
	),
	footer: __(
		'The <footer> element should represent a footer for its nearest sectioning element (e.g.: <section>, <article>, <main> etc.).'
	),
};

// TODO - duplicated from Cover. Should be in shared?
const isTemporaryMedia = ( id, url ) => ! id && isBlobURL( url );

function GroupEdit( { attributes, setAttributes, clientId } ) {
	const {
		id,
		url,
		backgroundType,
		alt,
		focalPoint,
		overlayColor,
		setOverlayColor,
		dimRatio,
		isDark,
	} = attributes;

	const {
		gradientClass,
		gradientValue,
		setGradient,
	} = __experimentalUseGradient();

	const { hasInnerBlocks, themeSupportsLayout } = useSelect(
		( select ) => {
			const { getBlock, getSettings } = select( blockEditorStore );
			const block = getBlock( clientId );
			return {
				hasInnerBlocks: !! ( block && block.innerBlocks.length ),
				themeSupportsLayout: getSettings()?.supportsLayout,
			};
		},
		[ clientId ]
	);

	const {
		__unstableMarkNextChangeAsNotPersistent: markNextChangeAsNotPersistent,
	} = useDispatch( blockEditorStore );

	const ref = useRef();
	const isDarkElement = useRef();
	const isCoverDark = useCoverIsDark(
		url,
		dimRatio,
		overlayColor?.color,
		isDarkElement
	);

	useEffect( () => {
		// This side-effect should not create an undo level.
		markNextChangeAsNotPersistent();
		setAttributes( { isDark: isCoverDark } );
	}, [ isCoverDark ] );

	const defaultLayout = useSetting( 'layout' ) || {};
	const { tagName: TagName = 'div', templateLock, layout = {} } = attributes;
	const usedLayout = !! layout && layout.inherit ? defaultLayout : layout;
	const { type = 'default' } = usedLayout;

	// TODO - temp disabled
	const layoutSupportEnabled =
		( false && themeSupportsLayout ) || type !== 'default';

	const blockProps = useBlockProps();
	const innerBlocksProps = useInnerBlocksProps(
		layoutSupportEnabled
			? blockProps
			: { className: 'wp-block-group__inner-container' },
		{
			templateLock,
			renderAppender: hasInnerBlocks
				? undefined
				: InnerBlocks.ButtonBlockAppender,
			__experimentalLayout: layoutSupportEnabled ? usedLayout : undefined,
		}
	);

	const isImgElement = true; // ! ( hasParallax || isRepeated );
	const isImageBackground = IMAGE_BACKGROUND_TYPE === backgroundType;

	const bgStyle = { backgroundColor: overlayColor?.color };
	const mediaStyle = {
		objectPosition:
			focalPoint && isImgElement
				? mediaPosition( focalPoint )
				: undefined,
	};

	const onSelectMedia = attributesFromMedia( setAttributes, 1 );
	const isUploadingMedia = isTemporaryMedia( id, url );

	const showBgImage = url && isImageBackground && isImgElement;
	const showFocalPointPicker = isImageBackground;

	const imperativeFocalPointPreview = ( value ) => {
		const [ styleOfRef, property ] = isDarkElement.current
			? [ isDarkElement.current.style, 'objectPosition' ]
			: [ ref.current.style, 'backgroundPosition' ];
		styleOfRef[ property ] = mediaPosition( value );
	};

	// TODO - make dynamic
	const hasParallax = false;
	const isRepeated = false;

	// TODO - shared with cover block
	const classes = classnames( {
		'is-dark-theme': isDark,
		'is-light': ! isDark,
		'is-transient': isUploadingMedia,
		'has-parallax': hasParallax,
		'is-repeated': isRepeated,
	} );

	return (
		<>
			<BlockControls group="other">
				<MediaReplaceFlow
					mediaId={ id }
					mediaURL={ url }
					allowedTypes={ ALLOWED_MEDIA_TYPES }
					accept="image/*,video/*"
					onSelect={ onSelectMedia }
					name={ ! url ? __( 'Add Media' ) : __( 'Replace' ) }
				/>
			</BlockControls>
			<InspectorControls>
				{ !! url && (
					<PanelBody title={ __( 'Media settings' ) }>
						{ showFocalPointPicker && (
							<FocalPointPicker
								label={ __( 'Focal point picker' ) }
								url={ url }
								value={ focalPoint }
								onDragStart={ imperativeFocalPointPreview }
								onDrag={ imperativeFocalPointPreview }
								onChange={ ( newFocalPoint ) =>
									setAttributes( {
										focalPoint: newFocalPoint,
									} )
								}
							/>
						) }
					</PanelBody>
				) }

				<PanelColorGradientSettings
					__experimentalHasMultipleOrigins
					__experimentalIsRenderedInSidebar
					title={ __( 'Overlay' ) }
					initialOpen={ true }
					settings={ [
						{
							colorValue: overlayColor?.color,
							gradientValue,
							onColorChange: setOverlayColor,
							onGradientChange: setGradient,
							label: __( 'Color' ),
						},
					] }
				>
					<RangeControl
						label={ __( 'Opacity' ) }
						value={ dimRatio }
						onChange={ ( newDimRation ) =>
							setAttributes( {
								dimRatio: newDimRation,
							} )
						}
						min={ 0 }
						max={ 100 }
						step={ 10 }
						required
					/>
				</PanelColorGradientSettings>
			</InspectorControls>

			<InspectorControls __experimentalGroup="advanced">
				<SelectControl
					label={ __( 'HTML element' ) }
					options={ [
						{ label: __( 'Default (<div>)' ), value: 'div' },
						{ label: '<header>', value: 'header' },
						{ label: '<main>', value: 'main' },
						{ label: '<section>', value: 'section' },
						{ label: '<article>', value: 'article' },
						{ label: '<aside>', value: 'aside' },
						{ label: '<footer>', value: 'footer' },
					] }
					value={ TagName }
					onChange={ ( value ) =>
						setAttributes( { tagName: value } )
					}
					help={ htmlElementMessages[ TagName ] }
				/>
			</InspectorControls>

			<TagName
				{ ...blockProps }
				className={ classnames( classes, blockProps.className ) }
			>
				<span
					aria-hidden="true"
					className={ classnames(
						'wp-block-group__background',
						dimRatioToClass( dimRatio ),
						{
							[ overlayColor?.class ]: overlayColor?.class,
							'has-background-dim': dimRatio !== undefined,
							// For backwards compatibility. Former versions of the Cover Block applied
							// `.wp-block-group__gradient-background` in the presence of
							// media, a gradient and a dim.
							'wp-block-group__gradient-background':
								url && gradientValue && dimRatio !== 0,
							'has-background-gradient': gradientValue,
							[ gradientClass ]: gradientClass,
						}
					) }
					style={ { backgroundImage: gradientValue, ...bgStyle } }
				/>
				{ showBgImage && (
					<img
						ref={ isDarkElement }
						className="wp-block-group__image-background"
						alt={ alt }
						src={ url }
						style={ mediaStyle }
					/>
				) }
				{ isUploadingMedia && <Spinner /> }
				<div { ...innerBlocksProps } />
			</TagName>
		</>
	);
}

export default compose( [
	withColors( { overlayColor: 'background-color' } ),
] )( GroupEdit );
