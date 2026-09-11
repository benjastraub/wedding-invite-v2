import styled from 'styled-components';
import type { GuestResponse } from 'shared';
import { useLanguage } from '../i18n/LanguageContext';
import { Card } from './ui/Card';

const SummaryCard = styled(Card)`
  max-width: 560px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Title = styled.h3`
  font-size: 1.2rem;
  text-align: center;
  margin: 0;
`;

const Attending = styled.p`
  margin: 6px 0 0;
  text-align: center;
  font-size: 1.05rem;
  color: ${({ theme }) => theme.colors.accent};
`;

const Details = styled.dl`
  margin: 14px 0 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Term = styled.dt`
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.muted};
`;

const Detail = styled.dd`
  margin: 0;
  white-space: pre-line;
  color: ${({ theme }) => theme.colors.text};
`;

const ChangeNote = styled.p`
  margin: 16px 0 0;
  font-size: 0.92rem;
  color: ${({ theme }) => theme.colors.sage};
`;

interface ResponseSummaryProps {
  /** Saved answers, or null when a guest is marked responded but no row exists. */
  response: GuestResponse | null;
  /** Optional contact email from the settings tab (shown as a mailto link). */
  contactEmail?: string;
  /** Optional WhatsApp link from the settings tab, e.g. "https://wa.me/15551234567". */
  contactWhatsApp?: string;
}

/**
 * Shown instead of the RSVP form once a guest has responded: a read-only
 * recap of their answers plus a note to contact the couple if anything
 * changed (there is deliberately no "edit my answer" button).
 */
export function ResponseSummary({ response, contactEmail, contactWhatsApp }: ResponseSummaryProps) {
  const { t } = useLanguage();

  const detail = (label: string, value?: string) =>
    value ? (
      <div>
        <Term>{label}</Term>
        <Detail>{value}</Detail>
      </div>
    ) : null;

  return (
    <SummaryCard>
      <Title>💌 {t('invite.responseTitle')}</Title>
      {response ? (
        <>
          <Attending>
            {response.attending === 'yes' ? t('invite.responseComing') : t('invite.responseNotComing')}
          </Attending>
          <Details>
            {detail(t('invite.plusOneName'), response.plusOneName)}
            {detail(
              t('invite.plusOneJoining'),
              response.bringingPlusOne
                ? t(response.bringingPlusOne === 'yes' ? 'common.yes' : 'common.no')
                : undefined,
            )}
            {detail(
              response.dietaryPlusOne ? t('invite.dietaryGuest') : t('invite.dietaryGuestSolo'),
              response.dietaryGuest,
            )}
            {detail(t('invite.dietaryPlusOne'), response.dietaryPlusOne)}
            {detail(t('invite.song'), response.songRequest)}
            {detail(t('invite.comments'), response.comments)}
          </Details>
        </>
      ) : (
        <Attending>{t('invite.alreadyResponded')}</Attending>
      )}
      <ChangeNote>
        {t('invite.responseChangeNote')}
        {contactEmail ? (
          <>
            {' '}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
          </>
        ) : null}
        {contactWhatsApp ? (
          <>
            {contactEmail ? ' · ' : ' '}
            <a href={contactWhatsApp} target="_blank" rel="noreferrer">
              {t('invite.contactWhatsApp')}
            </a>
          </>
        ) : null}
      </ChangeNote>
    </SummaryCard>
  );
}
