import styled from 'styled-components';
import { useLanguage } from '../i18n/LanguageContext';
import { Button } from './ui/Button';
import { BodyText, DisplayTitle } from './ui/Typography';

const Centered = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 24px;
  text-align: center;
`;

const Spinner = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 3px solid ${({ theme }) => theme.colors.border};
  border-top-color: ${({ theme }) => theme.colors.primary};
  animation: spin 0.9s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const ErrorBody = styled(BodyText)`
  max-width: 420px;
`;

export function LoadingScreen() {
  return (
    <Centered role="status">
      <Spinner />
    </Centered>
  );
}

export function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  const { t } = useLanguage();
  return (
    <Centered>
      <DisplayTitle>💔</DisplayTitle>
      <ErrorBody>{t('common.error')}</ErrorBody>
      <Button $variant="outline" onClick={onRetry}>
        {t('common.retry')}
      </Button>
    </Centered>
  );
}

/** Shown when a guest link does not match any guest in the sheet. */
export function NotFoundView() {
  const { t } = useLanguage();
  return (
    <Centered>
      <DisplayTitle>{t('common.notFoundTitle')}</DisplayTitle>
      <ErrorBody>{t('common.notFoundBody')}</ErrorBody>
    </Centered>
  );
}
