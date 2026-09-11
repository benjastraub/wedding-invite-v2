import { useRef, useState, type FormEvent } from 'react';
import styled from 'styled-components';
import type { Attendance, GuestRow } from 'shared';
import { submitRsvp } from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Field, Hint, Input, Textarea } from './ui/Field';
import { RadioChoice } from './ui/RadioChoice';

const Form = styled.form`
  max-width: 560px;
  margin: 0 auto;
`;

/**
 * Wraps every form control so one `disabled` freezes the whole form while a
 * submission is in flight — including implicit submits triggered by Enter.
 */
const Fieldset = styled.fieldset`
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
  border: 0;
  margin: 0;
  padding: 0;
`;

const RadioRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const ErrorText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.accent};
  font-size: 0.9rem;
`;

const QuestionLabel = styled.p`
  margin: 0 0 8px;
  font-size: 0.9rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.muted};
`;

const SubmitError = styled(ErrorText)`
  text-align: center;
`;

const ThanksTitle = styled.h3`
  font-size: 1.2rem;
  text-align: center;
`;

const ThanksBody = styled.p`
  margin: 8px 0 0;
  text-align: center;
  color: ${({ theme }) => theme.colors.muted};
`;

interface RSVPFormProps {
  guest: GuestRow;
  /** Called after a response is saved. */
  onSuccess: (attending: Attendance) => void;
}

/**
 * The RSVP form. Fields shown depend on the guest:
 *  - everyone: attending yes/no, own dietary restrictions, song, message
 *  - +1 allowed: yes/no "bringing the +1" choice; the +1 name and dietary
 *    fields appear only when the +1 is coming
 */
export function RSVPForm({ guest, onSuccess }: RSVPFormProps) {
  const { t } = useLanguage();
  const [attending, setAttending] = useState<Attendance | null>(null);
  const [bringingPlusOne, setBringingPlusOne] = useState<'yes' | 'no' | null>(null);
  const [plusOneName, setPlusOneName] = useState('');
  const [dietaryGuest, setDietaryGuest] = useState('');
  const [dietaryPlusOne, setDietaryPlusOne] = useState('');
  const [songRequest, setSongRequest] = useState('');
  const [comments, setComments] = useState('');
  const [missingAnswer, setMissingAnswer] = useState(false);
  const [missingPlusOne, setMissingPlusOne] = useState(false);
  const [missingPlusOneName, setMissingPlusOneName] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'submitting' | 'done'>('idle');
  // Guards against double submits (double-click / double-Enter). A ref rather
  // than `phase`: `phase` is captured in the render closure and may still read
  // "idle" when a second submit event arrives before the next render.
  const submittingRef = useRef(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submittingRef.current) return;
    if (!attending) {
      setMissingAnswer(true);
      return;
    }
    setMissingAnswer(false);
    if (guest.allowsPlusOne && attending === 'yes' && !bringingPlusOne) {
      setMissingPlusOne(true);
      return;
    }
    setMissingPlusOne(false);
    if (guest.allowsPlusOne && bringingPlusOne === 'yes' && !plusOneName.trim()) {
      setMissingPlusOneName(true);
      return;
    }
    setMissingPlusOneName(false);
    setSubmitFailed(false);
    submittingRef.current = true;
    setPhase('submitting');
    try {
      await submitRsvp(guest.token, {
        attending,
        plusOneName: guest.allowsPlusOne ? plusOneName : undefined,
        bringingPlusOne:
          guest.allowsPlusOne && attending === 'yes' ? (bringingPlusOne ?? undefined) : undefined,
        dietaryGuest,
        dietaryPlusOne: guest.allowsPlusOne && bringingPlusOne === 'yes' ? dietaryPlusOne : undefined,
        songRequest,
        comments,
      });
      setPhase('done');
      onSuccess(attending);
    } catch {
      submittingRef.current = false;
      setSubmitFailed(true);
      setPhase('idle');
    }
  }

  if (phase === 'done') {
    return (
      <Card>
        <ThanksTitle>💐 {t('invite.thanks')}</ThanksTitle>
        <ThanksBody>{attending === 'yes' ? t('invite.thanksComing') : t('invite.thanksMissing')}</ThanksBody>
      </Card>
    );
  }

  return (
    <Form onSubmit={handleSubmit} noValidate>
      <Fieldset disabled={phase === 'submitting'}>
        <div>
          <RadioRow role="radiogroup" aria-label={t('invite.rsvpTitle')}>
            <RadioChoice
              name="attending"
              value="yes"
              selected={attending === 'yes'}
              onSelect={() => setAttending('yes')}
            >
              {t('invite.attendingYes')}
            </RadioChoice>
            <RadioChoice
              name="attending"
              value="no"
              selected={attending === 'no'}
              onSelect={() => setAttending('no')}
            >
              {t('invite.attendingNo')}
            </RadioChoice>
          </RadioRow>
          {missingAnswer && <ErrorText>{t('invite.required')}</ErrorText>}
        </div>

        {attending === 'yes' && (
          <>
            {guest.allowsPlusOne && (
              <div>
                <QuestionLabel>{t('invite.plusOneJoining')}</QuestionLabel>
                <RadioRow role="radiogroup" aria-label={t('invite.plusOneJoining')}>
                  <RadioChoice
                    name="bringingPlusOne"
                    value="yes"
                    selected={bringingPlusOne === 'yes'}
                    onSelect={() => setBringingPlusOne('yes')}
                  >
                    {t('common.yes')}
                  </RadioChoice>
                  <RadioChoice
                    name="bringingPlusOne"
                    value="no"
                    selected={bringingPlusOne === 'no'}
                    onSelect={() => setBringingPlusOne('no')}
                  >
                    {t('common.no')}
                  </RadioChoice>
                </RadioRow>
                {missingPlusOne && <ErrorText>{t('invite.required')}</ErrorText>}
              </div>
            )}
            {guest.allowsPlusOne && bringingPlusOne === 'yes' && (
              <Field>
                {t('invite.plusOneName')}
                <Input
                  value={plusOneName}
                  onChange={(e) => {
                    setPlusOneName(e.target.value);
                    if (missingPlusOneName) setMissingPlusOneName(false);
                  }}
                  maxLength={100}
                  autoComplete="off"
                  required
                  aria-required="true"
                  aria-invalid={missingPlusOneName}
                />
                {missingPlusOneName && <ErrorText>{t('invite.plusOneNameRequired')}</ErrorText>}
              </Field>
            )}
            <Field>
              {guest.allowsPlusOne && bringingPlusOne === 'yes'
                ? t('invite.dietaryGuest')
                : t('invite.dietaryGuestSolo')}
              <Input
                value={dietaryGuest}
                onChange={(e) => setDietaryGuest(e.target.value)}
                maxLength={300}
                autoComplete="off"
              />
            </Field>
            {guest.allowsPlusOne && bringingPlusOne === 'yes' && (
              <Field>
                {t('invite.dietaryPlusOne')}
                <Input
                  value={dietaryPlusOne}
                  onChange={(e) => setDietaryPlusOne(e.target.value)}
                  maxLength={300}
                  autoComplete="off"
                />
              </Field>
            )}
            <Field>
              {t('invite.song')}
              <Input
                value={songRequest}
                onChange={(e) => setSongRequest(e.target.value)}
                maxLength={200}
                autoComplete="off"
              />
              <Hint>{t('invite.songHint')}</Hint>
            </Field>
          </>
        )}

        <Field>
          {t('invite.comments')}
          <Textarea value={comments} onChange={(e) => setComments(e.target.value)} maxLength={1000} />
        </Field>

        {submitFailed && <SubmitError>{t('common.error')}</SubmitError>}

        <Button type="submit" disabled={phase === 'submitting'}>
          {phase === 'submitting' ? t('invite.sending') : t('invite.submit')}
        </Button>
      </Fieldset>
    </Form>
  );
}
