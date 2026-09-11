import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import type { GuestViewResponse } from 'shared';
import { ApiError, fetchGuest } from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';
import { formatDate, formatTime } from '../utils/date';
import { useSiteImages } from '../utils/images';
import { useRsvpWindow } from '../utils/rsvpWindow';
import { RSVPForm } from '../components/RSVPForm';
import { ResponseSummary } from '../components/ResponseSummary';
import { RsvpClosedNotice } from '../components/RsvpClosedNotice';
import { ErrorScreen, LoadingScreen, NotFoundView } from '../components/Feedback';
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
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  padding: 84px 24px 44px;
`;

const Names = styled.h1`
  font-family: ${({ theme }) => theme.fonts.handwriting};
  font-size: clamp(3.2rem, 8.5vw, 5rem);
  font-weight: 400;
`;

const Ampersand = styled.span`
  font-style: italic;
  color: ${({ theme }) => theme.colors.accent};
`;

const Hello = styled.h2`
  font-size: clamp(1.6rem, 4.5vw, 2.4rem);
  font-weight: 500;
  color: ${({ theme }) => theme.colors.accent};
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 300;
  color: ${({ theme }) => theme.colors.muted};
`;

const Section = styled.section`
  padding: 36px 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

/** The RSVP block sits directly under the hero image, so it gets a tighter top gap. */
const RsvpSection = styled(Section)`
  padding-top: 8px;
`;

interface InvitePageProps {
  token: string;
}

/**
 * Personalized guest view: greets the guest by name and shows the RSVP form.
 * Writing the response identifies the guest by their token, so the couple
 * always knows who said what.
 */
export function InvitePage({ token }: InvitePageProps) {
  const { t, setLanguage } = useLanguage();
  const [data, setData] = useState<GuestViewResponse | null>(null);
  const [error, setError] = useState<'notfound' | 'error' | null>(null);
  const { hero, photos } = useSiteImages();
  const rsvpSectionRef = useRef<HTMLElement | null>(null);
  const [responded, setResponded] = useState(false);
  // Set when the server rejects a submission as closed (e.g. the deadline
  // passed while this page was open, or a clock skew). The server wins.
  const [serverClosed, setServerClosed] = useState(false);
  const rsvpWindow = useRsvpWindow(data?.settings.wedding ?? null);

  // After the RSVP is saved, the form is replaced by the thank-you card. Run
  // the scroll in an effect so it happens after that DOM change commits, and
  // defer it by two animation frames: the browser's scroll-anchoring pass
  // runs in the frame after the layout change and would otherwise cancel the
  // in-flight smooth scroll, leaving the thank-you card off-screen.
  useEffect(() => {
    if (!responded) return;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        rsvpSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [responded]);

  useEffect(() => {
    let cancelled = false;
    fetchGuest(token)
      .then((response) => {
        if (cancelled) return;
        setLanguage(response.settings.language);
        setData(response);
        // The browser tab shows the couple's names once settings arrive.
        document.title = `${response.settings.couple.bride} & ${response.settings.couple.groom}`;
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const isNotFound = err instanceof ApiError && err.status === 404;
        setError(isNotFound ? 'notfound' : 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [token, setLanguage]);

  if (error === 'notfound') return <NotFoundView />;
  if (error) return <ErrorScreen onRetry={() => window.location.reload()} />;
  if (!data) return <LoadingScreen />;

  const { settings, guest } = data;
  const closed = !rsvpWindow.open || serverClosed;
  const closedReason = rsvpWindow.reason ?? 'deadline';
  const dateLine = [
    settings.wedding.date && formatDate(settings.wedding.date, settings.language),
    settings.wedding.time && formatTime(settings.wedding.time, settings.language),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Page>
      <Hero>
        <Eyebrow>{t('invite.subtitle')}</Eyebrow>
        <Names>
          {settings.couple.bride} <Ampersand>&</Ampersand> {settings.couple.groom}
        </Names>
        <Hello>
          {guest.plusOneDisplayName
            ? t('invite.helloPlusOne', { name: guest.displayName || '…', plusOne: guest.plusOneDisplayName })
            : t('invite.hello', { name: guest.displayName || '…' })}
        </Hello>
        {dateLine && <Subtitle>{dateLine}</Subtitle>}
        <HeroImage src={hero} alt={`${settings.couple.bride} & ${settings.couple.groom}`} />
      </Hero>

      <RsvpSection ref={rsvpSectionRef}>
        <SectionTitle>{t('invite.rsvpTitle')}</SectionTitle>
        {closed ? (
          <RsvpClosedNotice
            reason={closedReason}
            deadline={settings.wedding.rsvpDeadline || undefined}
            contactEmail={settings.contactEmail || undefined}
            contactWhatsApp={settings.contactWhatsApp || undefined}
          />
        ) : guest.status === 'responded' ? (
          <ResponseSummary
            response={data.response}
            contactEmail={settings.contactEmail || undefined}
            contactWhatsApp={settings.contactWhatsApp || undefined}
          />
        ) : (
          <RSVPForm
            guest={guest}
            onSuccess={() => setResponded(true)}
            onClosed={() => setServerClosed(true)}
          />
        )}
      </RsvpSection>

      <Section>
        <DetailCards settings={settings} giftUrl={settings.giftRegistryUrl} rsvpClosed={closed} />
      </Section>

      <PhotoCarousel photos={photos} />
    </Page>
  );
}
