import styled from 'styled-components';
import type { RsvpClosedReason } from 'shared';
import { useLanguage } from '../i18n/LanguageContext';
import { formatDate } from '../utils/date';
import { Card } from './ui/Card';

const NoticeCard = styled(Card)`
  max-width: 560px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: center;
`;

const Title = styled.h3`
  font-size: 1.2rem;
  margin: 0;
  color: ${({ theme }) => theme.colors.accent};
`;

const Body = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
`;

const Muted = styled.p`
  margin: 4px 0 0;
  font-size: 0.92rem;
  color: ${({ theme }) => theme.colors.muted};
`;

const Contact = styled.p`
  margin: 10px 0 0;
  font-size: 0.92rem;
  color: ${({ theme }) => theme.colors.sage};
`;

interface RsvpClosedNoticeProps {
  /** Why the window closed — picks the copy. */
  reason: RsvpClosedReason;
  /** ISO deadline date from the settings tab, when one is configured. */
  deadline?: string;
  /** Optional contact email from the settings tab (shown as a mailto link). */
  contactEmail?: string;
  /** Optional WhatsApp link from the settings tab, e.g. "https://wa.me/15551234567". */
  contactWhatsApp?: string;
}

/**
 * Shown instead of the RSVP form once the window has closed: either the
 * deadline passed (strict deadline) or the wedding is already over. Guests
 * who still need to reach the couple get the settings' contact links.
 */
export function RsvpClosedNotice({
  reason,
  deadline,
  contactEmail,
  contactWhatsApp,
}: RsvpClosedNoticeProps) {
  const { t, language } = useLanguage();
  const afterWedding = reason === 'wedding_ended';
  const hasContact = Boolean(contactEmail || contactWhatsApp);

  return (
    <NoticeCard>
      <Title>
        {afterWedding ? `${t('postWedding.title')}` : `📅 ${t('invite.rsvpClosedTitle')}`}
      </Title>
      <Body>{afterWedding ? t('postWedding.body') : t('invite.rsvpClosedBody')}</Body>
      {!afterWedding && deadline ? (
        <Muted>
          {t('landing.rsvpBy')} {formatDate(deadline, language)}
        </Muted>
      ) : null}
      {!afterWedding && hasContact ? (
        <Contact>
          {t('invite.rsvpClosedContact')}{' '}
          {contactEmail ? <a href={`mailto:${contactEmail}`}>{contactEmail}</a> : null}
          {contactEmail && contactWhatsApp ? ' · ' : null}
          {contactWhatsApp ? (
            <a href={contactWhatsApp} target="_blank" rel="noreferrer">
              {t('invite.contactWhatsApp')}
            </a>
          ) : null}
        </Contact>
      ) : null}
    </NoticeCard>
  );
}
