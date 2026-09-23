// Шрифт заменён на локальный: сетевые шрифты в нашем рендере
// не грузятся (см. CLAUDE.md, «Технические соглашения»).
import { fontFamily as localFontFamily } from '../../../../fonts';

import React from 'react';
import {Easing, Interactive, interpolate, useCurrentFrame} from 'remotion';

const fontFamily = localFontFamily('Inter');


export const NameLowerThird: React.FC = () => {
	const frame = useCurrentFrame();

	return (
		<Interactive.Div
			name="Container"
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'flex-start',
				width: 534,
				height: 132,
				boxSizing: 'border-box',
				fontFamily,
			}}
		>
			<Interactive.Div
				cropRight={interpolate(frame, [0, 20, 96, 116], [1, 0, 0, 1], {
					easing: [
						Easing.bezier(0.65, 0, 0.35, 1),
						Easing.linear,
						Easing.bezier(0.65, 0, 0.35, 1),
					],
					extrapolateLeft: 'clamp',
					extrapolateRight: 'clamp',
				})}
				name="Name bar"
				style={{
					display: 'flex',
					alignItems: 'center',
					height: 66,
					boxSizing: 'border-box',
					padding: '0 24px',
					overflow: 'hidden',
					backgroundColor: '#2563eb',
					color: '#ffffff',
					fontSize: 34,
					fontWeight: 700,
					letterSpacing: 1,
					lineHeight: 1,
					whiteSpace: 'nowrap',
				}}
			>
				Alex Morgan
			</Interactive.Div>
			<Interactive.Div
				cropRight={interpolate(frame, [4, 24, 92, 112], [1, 0, 0, 1], {
					easing: [
						Easing.bezier(0.65, 0, 0.35, 1),
						Easing.linear,
						Easing.bezier(0.65, 0, 0.35, 1),
					],
					extrapolateLeft: 'clamp',
					extrapolateRight: 'clamp',
				})}
				name="Title bar"
				style={{
					display: 'flex',
					alignItems: 'center',
					height: 66,
					boxSizing: 'border-box',
					padding: '0 24px',
					overflow: 'hidden',
					backgroundColor: '#18181b',
					color: '#ffffff',
					fontSize: 34,
					fontWeight: 700,
					letterSpacing: 1,
					lineHeight: 1,
					whiteSpace: 'nowrap',
				}}
			>
				Creative Developer
			</Interactive.Div>
		</Interactive.Div>
	);
};
