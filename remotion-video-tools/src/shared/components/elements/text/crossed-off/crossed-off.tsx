// Шрифт заменён на локальный: сетевые шрифты в нашем рендере
// не грузятся (см. CLAUDE.md, «Технические соглашения»).
import { fontFamily as localFontFamily } from '../../../../fonts';
import {CrossedOff} from '@remotion/rough-notation';
import React from 'react';
import {Interactive, interpolate, useCurrentFrame} from 'remotion';

const fontFamily = localFontFamily('Cormorant Garamond');

export const CrossedOffText: React.FC = () => {
	const frame = useCurrentFrame();

	return (
		<Interactive.Div
			name="Container"
			style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				height: '100%',
				fontSize: 80,
				fontWeight: 700,
				lineHeight: 1.1,
				color: '#171717',
				fontFamily,
			}}
		>
			<div>
				<Interactive.Span>Please </Interactive.Span>
				<CrossedOff
					name="Crossed off annotation"
					progress={interpolate(frame, [18, 39], [0, 1], {
						extrapolateLeft: 'clamp',
						extrapolateRight: 'clamp',
					})}
					color="#eb2525"
					strokeWidth={6}
					iterations={10}
					roughness={2}
				>
					remove
				</CrossedOff>{' '}
				<Interactive.Span>this</Interactive.Span>
			</div>
		</Interactive.Div>
	);
};
