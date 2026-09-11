import { useEffect, useState } from 'react';
import styled from 'styled-components';
import type { SiteSettings } from 'shared';
import { fetchSettings } from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';
import { formatDate, formatTime } from '../utils/date';
import { useSiteImages } from '../utils/images';
import { useRsvpWindow } from '../utils/rsvpWindow';
import { CountdownTimer } from '../components/CountdownTimer';
import { ErrorScreen, LoadingScreen } from '../components/Feedback';
import { DetailCards } from '../components/sections/DetailCards';
import { HeroImage } from '../components/sections/HeroImage';
import { PhotoCarousel } from '../components/sections/PhotoCarousel';
import { Eyebrow, SectionTitle } from '../components/ui/Typography';

const Page = styled.div`
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  z-index: 1;
`;

const Hero = styled.header`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  text-align: center;
  padding: 96px 24px 16px;
`;

const Names = styled.h1`
  font-family: ${({ theme }) => theme.fonts.handwriting};
  font-size: clamp(3.9rem, 10.5vw, 7rem);
  font-weight: 400;
  line-height: 1.05;
  letter-spacing: 0.02em;
`;

const Ampersand = styled.span`
  font-style: italic;
  color: ${({ theme }) => theme.colors.accent};
`;

const HeroDate = styled.p`
  margin: 0;
  font-size: 1.2rem;
  font-weight: 300;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.muted};
`;

const Section = styled.section`
  padding: 44px 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

/**
 * Public landing page: couple names, countdown, date, location, dress code
 * and gift registry — everything read from the sheet's settings tab.
 */
export function LandingPage() {
  const { t, setLanguage } = useLanguage();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [failed, setFailed] = useState(false);
  const { hero, photos } = useSiteImages();
  const rsvpWindow = useRsvpWindow(settings?.wedding ?? null);

  useEffect(() => {
    let cancelled = false;
    fetchSettings()
      .then((data) => {
        if (cancelled) return;
        setLanguage(data.language);
        setSettings(data);
        // The browser tab shows the couple's names once settings arrive.
        document.title = `${data.couple.bride} & ${data.couple.groom}`;
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [setLanguage]);

  if (failed) return <ErrorScreen onRetry={() => window.location.reload()} />;
  if (!settings) return <LoadingScreen />;

  const dateLine = [
    settings.wedding.date && formatDate(settings.wedding.date, settings.language),
    settings.wedding.time && formatTime(settings.wedding.time, settings.language),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Page>
      <Hero>
        <Eyebrow>{t('landing.saveTheDate')}</Eyebrow>
        <Names>
          {settings.couple.bride} <Ampersand>&</Ampersand> {settings.couple.groom}
        </Names>
        {dateLine && <HeroDate>{dateLine}</HeroDate>}
        <HeroImage src={hero} alt={`${settings.couple.bride} & ${settings.couple.groom}`} />
      </Hero>

      <Section>
        <CountdownTimer wedding={settings.wedding} />
      </Section>

      <Section>
        <SectionTitle>{t('landing.detailsTitle')}</SectionTitle>
        <DetailCards
          settings={settings}
          giftUrl={settings.giftRegistryUrl}
          rsvpClosed={!rsvpWindow.open}
        />
      </Section>

      <PhotoCarousel photos={photos} />
    </Page>
  );
}
