// Шрифт заменён на локальный: сетевые шрифты в нашем рендере
// не грузятся (см. CLAUDE.md, «Технические соглашения»).
import { fontFamily as localFontFamily } from '../../../../fonts';
import {StrikeThrough} from '@remotion/rough-notation';
import React from 'react';
import {Interactive, interpolate, useCurrentFrame} from 'remotion';

const fontFamily = localFontFamily('Cormorant Garamond');

export const StrikeThroughText: React.FC = () => {
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
				<Interactive.Span>The </Interactive.Span>
				<StrikeThrough
					name="Strike-through annotation"
					progress={interpolate(frame, [10, 25], [0, 1], {
						extrapolateLeft: 'clamp',
						extrapolateRight: 'clamp',
					})}
					color="#f11515"
					strokeWidth={14}
				>
					forbidden
				</StrikeThrough>{' '}
				<Interactive.Span>fruit</Interactive.Span>
			</div>
		</Interactive.Div>
	);
};
