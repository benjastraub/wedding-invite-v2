import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useLanguage } from '../i18n/LanguageContext';
import { countdownTarget } from '../utils/date';

const Grid = styled.div`
  display: flex;
  gap: clamp(8px, 2vw, 18px);
  justify-content: center;
  width: 100%;
  max-width: 460px;
  margin: 0 auto;
`;

const Cell = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: clamp(10px, 3vw, 16px) clamp(4px, 2vw, 12px);
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.shadows.soft};
  overflow: hidden;
`;

const Number = styled.span`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: clamp(1.6rem, 6vw, 2.2rem);
  font-weight: 600;
  line-height: 1;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;
`;

const Label = styled.span`
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.muted};
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;
`;

const Today = styled.p`
  margin: 0;
  text-align: center;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.6rem;
  color: ${({ theme }) => theme.colors.accent};
`;

interface CountdownTimerProps {
  /** ISO date, e.g. "2026-09-12". */
  date: string;
  /** 24h time, e.g. "17:00". */
  time: string;
}

/** Live countdown to the wedding date from the sheet's settings. */
export function CountdownTimer({ date, time }: CountdownTimerProps) {
  const { t } = useLanguage();
  const target = useMemo(() => countdownTarget(date, time), [date, time]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!target) return null;

  const diff = target.getTime() - now;
  if (diff <= 0) return <Today>{t('common.weddingIsToday')}</Today>;

  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);

  const segments = [
    { value: days, label: t('common.days') },
    { value: hours, label: t('common.hours') },
    { value: minutes, label: t('common.minutes') },
    { value: seconds, label: t('common.seconds') },
  ];

  return (
    <Grid>
      {segments.map((segment) => (
        <Cell key={segment.label}>
          <Number>{String(segment.value).padStart(2, '0')}</Number>
          <Label>{segment.label}</Label>
        </Cell>
      ))}
    </Grid>
  );
}
