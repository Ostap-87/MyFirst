(function () {
  const track = document.getElementById('arcTrack');
  const cards = Array.from(track.querySelectorAll('.arc-card'));
  const n = cards.length;

  const RADIUS = 420;        // radius of the arc
  const SPREAD = 46;         // total angle spread in degrees
  const EDGE_SCALE = 0.18;   // how much smaller the outer cards get
  const SPACING = 148;       // px between cards in the flat starting row

  const step = SPREAD / (n - 1);
  const mid = (n - 1) / 2;

  function arcTransform(i, extra) {
    const angleDeg = (i - mid) * step;
    const angleRad = (angleDeg * Math.PI) / 180;

    const x = RADIUS * Math.sin(angleRad);
    const y = RADIUS * Math.cos(angleRad) - RADIUS;
    const scale = 1 - EDGE_SCALE * Math.abs(angleDeg) / (SPREAD / 2);

    let rotate = angleDeg;
    let lift = 0;
    let hoverScale = 1;

    if (extra === 'hover') {
      rotate = 0;
      lift = -24;
      hoverScale = 1.12;
    } else if (extra === 'sibling') {
      hoverScale = 0.96;
    }

    return `translate(${x}px, ${y + lift}px) rotate(${rotate}deg) scale(${scale * hoverScale})`;
  }

  function flatTransform(i) {
    const x = (i - mid) * SPACING;
    return `translate(${x}px, 0px) rotate(0deg) scale(0.9)`;
  }

  // Start flat, then animate into the arc on load.
  cards.forEach((card, i) => {
    card.style.transform = flatTransform(i);
    card.style.zIndex = i;
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      cards.forEach((card, i) => {
        card.style.transform = arcTransform(i);
      });
    });
  });

  // Hover interaction: lift + straighten the hovered card, dim its neighbours slightly.
  cards.forEach((card, i) => {
    card.addEventListener('mouseenter', () => {
      cards.forEach((c, j) => {
        c.style.transform = arcTransform(j, j === i ? 'hover' : 'sibling');
        c.style.zIndex = j === i ? 100 : 10;
        c.style.filter = j === i ? 'none' : 'brightness(0.85)';
      });
    });

    card.addEventListener('mouseleave', () => {
      cards.forEach((c, j) => {
        c.style.transform = arcTransform(j);
        c.style.zIndex = j;
        c.style.filter = 'none';
      });
    });
  });
})();
