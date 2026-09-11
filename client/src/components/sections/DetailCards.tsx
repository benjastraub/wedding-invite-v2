import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import type { SiteSettings } from 'shared';
import { useLanguage } from '../../i18n/LanguageContext';
import { makeCalendarUrl } from '../../utils/calendar';
import { formatDate, formatTime } from '../../utils/date';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { GiftCard } from './GiftCard';

const Grid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
`;

const Title = styled.h3`
  font-size: 1.1rem;
  margin-bottom: 10px;
`;

const Line = styled.p`
  margin: 4px 0;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text};
  white-space: pre-line;
`;

const MutedLine = styled(Line)`
  color: ${({ theme }) => theme.colors.muted};
`;

const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  text-align: center;
`;

const CardButton = styled(Button)`
  margin-top: 16px;
  align-self: center;
`;

interface DetailCardsProps {
  settings: SiteSettings;
  /** Optional gift registry URL — renders the gift card in the same section. */
  giftUrl?: string;
}

/**
 * The details section: When, Where and (optionally) the gift registry,
 * with the dress code card at the bottom — one centered column on every
 * screen size. Values come straight from the sheet's settings tab.
 */
export function DetailCards({ settings, giftUrl }: DetailCardsProps) {
  const { t, language } = useLanguage();
  const date = settings.wedding.date ? formatDate(settings.wedding.date, language) : '';
  const time = settings.wedding.time ? formatTime(settings.wedding.time, language) : '';

  const calendarSummary = useMemo(
    () =>
      t('calendar.summary', {
        groom: settings.couple.groom,
        bride: settings.couple.bride,
      }),
    [t, settings.couple.groom, settings.couple.bride],
  );
  const calendarDescription = useMemo(() => {
    const lines = [settings.venue.name, settings.venue.address].filter(Boolean);
    const venue = lines.join('\n');
    const maps = settings.venue.mapsUrl
      ? `${t('common.openInMaps')}: ${settings.venue.mapsUrl}`
      : '';
    return [venue, maps].filter(Boolean).join('\n\n');
  }, [settings.venue.name, settings.venue.address, settings.venue.mapsUrl, t]);
  const [calendarUrl, setCalendarUrl] = useState<string | null>(null);
  useEffect(() => {
    const url = makeCalendarUrl(settings, calendarSummary, calendarDescription);
    setCalendarUrl(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [settings, calendarSummary, calendarDescription]);

  return (
    <Grid>
      <Card>
        <CardContent>
          <Title>{t('landing.dateTitle')}</Title>
          {date && <Line>{date}</Line>}
          {time && <Line>{time}</Line>}
          {settings.wedding.rsvpDeadline && (
            <MutedLine>
              {t('landing.rsvpBy')} {formatDate(settings.wedding.rsvpDeadline, language)}
            </MutedLine>
          )}
          {calendarUrl && (
            <CardButton as="a" href={calendarUrl} download="wedding.ics" $variant="outline">
              {t('landing.addToCalendar')}
            </CardButton>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Title>{t('landing.locationTitle')}</Title>
          {settings.venue.name && <Line>{settings.venue.name}</Line>}
          {settings.venue.address && <MutedLine>{settings.venue.address}</MutedLine>}
          {settings.venue.mapsUrl && (
            <CardButton as="a" href={settings.venue.mapsUrl} target="_blank" rel="noopener noreferrer" $variant="outline">
              {t('common.openInMaps')}
            </CardButton>
          )}
        </CardContent>
      </Card>

      {giftUrl && <GiftCard url={giftUrl} />}

      {settings.dressCode && (
        <Card>
          <CardContent>
            <Title>{t('landing.dressCodeTitle')}</Title>
            <Line>{settings.dressCode}</Line>
            <MutedLine>{t('landing.dressCodeOutfit')}</MutedLine>
          </CardContent>
        </Card>
      )}
    </Grid>
  );
}
