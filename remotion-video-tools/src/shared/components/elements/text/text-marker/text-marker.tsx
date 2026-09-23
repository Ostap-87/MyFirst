// Шрифт заменён на локальный: сетевые шрифты в нашем рендере
// не грузятся (см. CLAUDE.md, «Технические соглашения»).
import { fontFamily as localFontFamily } from '../../../../fonts';
import {Highlight} from '@remotion/rough-notation';
import React from 'react';
import {Easing, Interactive, interpolate, useCurrentFrame} from 'remotion';

const fontFamily = localFontFamily('Cormorant Garamond');

export const TextMarker: React.FC = () => {
	const frame = useCurrentFrame();

	return (
		<Interactive.Div
			name="Container"
			style={{
				fontSize: 80,
				fontWeight: 700,
				lineHeight: 1.1,
				color: '#171717',
				fontFamily,
				width: 800,
			}}
		>
			<Interactive.Span>A truly </Interactive.Span>
			<Highlight
				name="Highlight annotation"
				progress={interpolate(frame, [0, 25], [0, 1], {
					extrapolateLeft: 'clamp',
					extrapolateRight: 'clamp',
					easing: [
						Easing.spring({
							damping: 200,
							mass: 1,
							stiffness: 100,
							allowTail: true,
							durationRestThreshold: 0.02,
							overshootClamping: false,
						}),
					],
				})}
				color="rgba(255, 236, 79, 0.62)"
				maxRandomnessOffset={10}
				roughness={2.3}
				padding={{
					left: 20,
					right: 20,
				}}
				bowing={0}
			>
				remarkable
			</Highlight>{' '}
			<Interactive.Span>end to the World cup</Interactive.Span>
		</Interactive.Div>
	);
};
