import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import styled from 'styled-components';
import { useLanguage } from '../../i18n/LanguageContext';
import { SectionTitle } from '../ui/Typography';

/** Time between automatic slides. */
const AUTOSLIDE_MS = 4500;

/** Horizontal drag distance required before a swipe changes the photo. */
const SWIPE_THRESHOLD_PX = 50;

const Wrapper = styled.section`
  padding: 36px 24px 56px;
  display: flex;
  flex-direction: column;
  gap: 22px;
`;

const Viewport = styled.div`
  position: relative;
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  /* Vertical page scroll stays native; horizontal swipes are handled by JS. */
  touch-action: pan-y;
  user-select: none;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.soft};
  background: rgba(255, 255, 255, 0.4);
`;

const Track = styled.div<{ $index: number; $offset: number; $dragging: boolean }>`
  display: flex;
  height: 100%;
  transform: translateX(calc(-${({ $index }) => $index * 100}% + ${({ $offset }) => $offset}px));
  transition: ${({ $dragging }) =>
    $dragging ? 'none' : 'transform 0.8s cubic-bezier(0.65, 0, 0.35, 1)'};
`;

const Slide = styled.img`
  width: 100%;
  height: 100%;
  flex-shrink: 0;
  object-fit: cover;
`;

const Dots = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
`;

const Dot = styled.button<{ $active: boolean }>`
  width: ${({ $active }) => ($active ? '22px' : '7px')};
  height: 7px;
  padding: 0;
  border: none;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme, $active }) => ($active ? theme.colors.sage : theme.colors.border)};
  cursor: pointer;
  transition: width 0.35s ease, background 0.35s ease;
`;

const NavButton = styled.button<{ $side: 'prev' | 'next' }>`
  position: absolute;
  top: 50%;
  ${({ $side }) => ($side === 'prev' ? 'left: 12px;' : 'right: 12px;')}
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.pill};
  background: rgba(255, 255, 255, 0.65);
  color: ${({ theme }) => theme.colors.sage};
  cursor: pointer;
  opacity: 0.55;
  backdrop-filter: blur(4px);
  transition: opacity 0.3s ease, background 0.3s ease, color 0.3s ease;

  &:hover,
  &:focus-visible {
    opacity: 1;
    background: rgba(255, 255, 255, 0.92);
    color: ${({ theme }) => theme.colors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

/** Small inline chevron — no icon library needed. */
function Chevron({ direction }: { direction: 'prev' | 'next' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={direction === 'prev' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Classy photo carousel: one large image at a time with a soft slide
 * transition, auto-advancing and a single row of dots. Photos can be
 * changed with the arrows, the dots, or a horizontal swipe (touch or
 * mouse drag). Renders nothing when there are no photos.
 */
export function PhotoCarousel({ photos }: { photos: string[] }) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const dragRef = useRef<{ pointerId: number | null; startX: number }>({
    pointerId: null,
    startX: 0,
  });

  useEffect(() => {
    if (paused || dragging || photos.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % photos.length);
    }, AUTOSLIDE_MS);
    return () => clearInterval(timer);
  }, [paused, dragging, photos.length]);

  if (photos.length === 0) return null;

  const goTo = (next: number) => setIndex(((next % photos.length) + photos.length) % photos.length);

  /** Start tracking a swipe. Taps on the nav buttons or dots are ignored. */
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (photos.length <= 1 || !event.isPrimary) return;
    if ((event.target as HTMLElement).closest('button')) return;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  /** Follow the finger (or mouse) while dragging. */
  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!dragging || drag.pointerId !== event.pointerId) return;
    setDragOffset(event.clientX - drag.startX);
  };

  /**
   * On release: a drag past the threshold moves to the previous or next
   * photo; anything shorter snaps back. Pointer cancel (vertical scroll
   * taking over) always snaps back without navigating.
   */
  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const drag = dragRef.current;
    if (!dragging || drag.pointerId !== event.pointerId) return;
    if (!cancelled) {
      const delta = event.clientX - drag.startX;
      if (delta <= -SWIPE_THRESHOLD_PX) goTo(index + 1);
      else if (delta >= SWIPE_THRESHOLD_PX) goTo(index - 1);
    }
    dragRef.current = { pointerId: null, startX: 0 };
    setDragOffset(0);
    setDragging(false);
  };

  return (
    <Wrapper>
      <SectionTitle>{t('landing.photosTitle')}</SectionTitle>
      <Viewport
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => handlePointerEnd(event, false)}
        onPointerCancel={(event) => handlePointerEnd(event, true)}
        onDragStart={(event) => event.preventDefault()}
      >
        <Track $index={index} $offset={dragOffset} $dragging={dragging}>
          {photos.map((src) => (
            <Slide
              key={src}
              src={src}
              alt={t('landing.photosTitle')}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          ))}
        </Track>
        {photos.length > 1 && (
          <>
            <NavButton
              type="button"
              $side="prev"
              aria-label={t('landing.carouselPrev')}
              onClick={() => goTo(index - 1)}
            >
              <Chevron direction="prev" />
            </NavButton>
            <NavButton
              type="button"
              $side="next"
              aria-label={t('landing.carouselNext')}
              onClick={() => goTo(index + 1)}
            >
              <Chevron direction="next" />
            </NavButton>
          </>
        )}
      </Viewport>
      {photos.length > 1 && (
        <Dots>
          {photos.map((src, dotIndex) => (
            <Dot
              key={src}
              type="button"
              aria-label={`${t('landing.photosTitle')} ${dotIndex + 1}`}
              aria-current={dotIndex === index ? 'true' : undefined}
              $active={dotIndex === index}
              onClick={() => goTo(dotIndex)}
            />
          ))}
        </Dots>
      )}
    </Wrapper>
  );
}
